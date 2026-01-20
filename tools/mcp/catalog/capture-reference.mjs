/**
 * TOOL: capture-reference
 * Capture normalized baseline reference PNG
 * Outputs: reference.captured.png, status.json
 */

import fs from "node:fs";
import path from "node:path";
import {
  McpStdioClient,
  createLogger,
  extractToolJson,
  extractToolText,
  errorToString,
  safeJsonParse
} from "../runner/mcpClient.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const FREEZE_STYLE_ID = "__hi_mcp_freeze_styles";
const FREEZE_CSS = `
*, *::before, *::after {
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  animation-iteration-count: 1 !important;
  animation-play-state: paused !important;
  transition-delay: 0s !important;
  transition-duration: 0s !important;
  caret-color: transparent !important;
}
html, body {
  scroll-behavior: auto !important;
}
`;

function mustEnv(name) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function listFilesRelative(dir, rootDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRelative(full, rootDir));
    } else {
      files.push(path.relative(rootDir, full).replace(/\\/g, "/"));
    }
  }
  return files.sort();
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function readPngDimensions(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < PNG_SIGNATURE.length) return null;
  if (!buf.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return null;

  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    if (type === "IHDR" && dataStart + 8 <= buf.length) {
      const width = buf.readUInt32BE(dataStart);
      const height = buf.readUInt32BE(dataStart + 4);
      return { width, height };
    }
    offset += length + 12;
  }
  return null;
}

function parseEvalJson(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.json && typeof payload.json === "object") return payload.json;
  if (typeof payload.json === "string") {
    const nested = safeJsonParse(payload.json);
    if (nested && typeof nested === "object") return nested;
  }
  if (typeof payload.text === "string") {
    const direct = safeJsonParse(payload.text.trim());
    if (direct && typeof direct === "object") return direct;
    if (typeof direct === "string") {
      const nested = safeJsonParse(direct);
      if (nested && typeof nested === "object") return nested;
    }
    const extracted = extractJsonFromEvalText(payload.text);
    if (extracted && typeof extracted === "object") return extracted;
  }
  return null;
}

function extractJsonFromEvalText(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  const blockStart = text.indexOf("```json");
  if (blockStart >= 0) {
    const after = text.slice(blockStart + 7);
    const blockEnd = after.indexOf("```");
    if (blockEnd >= 0) {
      const block = after.slice(0, blockEnd).trim();
      const parsed = safeJsonParse(block);
      if (parsed && typeof parsed === "object") return parsed;
      if (typeof parsed === "string") {
        const nested = safeJsonParse(parsed);
        if (nested && typeof nested === "object") return nested;
      }
      if (block.startsWith("\"") && block.endsWith("\"")) {
        const unquoted = block
          .slice(1, -1)
          .replace(/\\\\n/g, "\n")
          .replace(/\\\\r/g, "\r")
          .replace(/\\\\t/g, "\t")
          .replace(/\\"/g, "\"")
          .replace(/\\\\\\\\/g, "\\");
        const nested = safeJsonParse(unquoted);
        if (nested && typeof nested === "object") return nested;
      }
    }
  }
  const fallback = text.match(/\{[\s\S]*\}/);
  if (fallback) {
    const parsed = safeJsonParse(fallback[0]);
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") {
      const nested = safeJsonParse(parsed);
      if (nested && typeof nested === "object") return nested;
    }
  }
  return null;
}

function parseEvalJsonDeep(payload) {
  const direct = parseEvalJson(payload);
  if (direct) return direct;
  if (payload && payload.result) {
    const nestedText = extractToolText(payload.result);
    if (nestedText) {
      const nested = parseEvalJson({ text: nestedText });
      if (nested) return nested;
    }
  }
  const nestedPayload =
    payload && payload.result ? extractToolJson(payload.result) : null;
  const nested = parseEvalJson(nestedPayload);
  return nested || null;
}

function extractScreenshotBase64(result) {
  if (!result) return null;
  if (typeof result.base64 === "string") return result.base64;
  const content = result?.content;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    if (item?.type === "image" && typeof item.data === "string") {
      return item.data;
    }
    if (item?.type === "text" && typeof item.text === "string") {
      const parsed = safeJsonParse(item.text.trim());
      if (parsed?.base64) return parsed.base64;
      if (typeof parsed === "string") {
        const nested = safeJsonParse(parsed);
        if (nested?.base64) return nested.base64;
      }
    }
  }
  return null;
}

function extractSavedPath(payload, rawText) {
  const text = payload?.rawText || payload?.text || rawText || null;
  if (!text || typeof text !== "string") return null;
  const match = text.match(/Saved screenshot to (.+?\.png)/i);
  if (!match) return null;
  const candidate = match[1].trim();
  return candidate || null;
}

async function applyCaptureOverrides(client, { width, height }) {
  const preflightScript = `() => {
    return JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    });
  }`;
  const preflightResult = await client.callTool("hi_eval", {
    function: preflightScript
  });
  const preflightPayload = extractToolJson(preflightResult);
  const preflightData =
    parseEvalJsonDeep(preflightPayload) ??
    preflightPayload?.json ??
    preflightPayload?.result ??
    preflightPayload ??
    null;
  const preflightDpr = safeNumber(preflightData?.dpr) ?? 1;
  const targetCssWidth = Math.max(1, Math.round(width / preflightDpr));
  const targetCssHeight = Math.max(1, Math.round(height / preflightDpr));

  const resizeResult = await client.callTool("hi_resize_page", {
    width: targetCssWidth,
    height: targetCssHeight
  });
  const resizePayload = extractToolJson(resizeResult);

  const applyScript = `() => {
    const styleId = ${JSON.stringify(FREEZE_STYLE_ID)};
    const css = ${JSON.stringify(FREEZE_CSS)};
    const root = document.documentElement;
    const actualDpr = window.devicePixelRatio || 1;
    const prevZoom = root.style.zoom || "";
    const prevDprDesc = Object.getOwnPropertyDescriptor(
      window,
      "devicePixelRatio"
    );

    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = css;

    const zoomApplied = "1";
    root.style.zoom = zoomApplied;

    let overrideApplied = false;
    try {
      const overrideGetter = () => 1;
      overrideGetter.__hiMcpOverride = true;
      Object.defineProperty(window, "devicePixelRatio", {
        get: overrideGetter,
        configurable: true
      });
      overrideApplied = true;
    } catch {
      overrideApplied = false;
    }

    const viewport = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dprReported: actualDpr,
      zoomApplied: root.style.zoom || zoomApplied
    };

    const vv = window.visualViewport
      ? {
          width: window.visualViewport.width,
          height: window.visualViewport.height,
          scale: window.visualViewport.scale
        }
      : null;

    window.__HI_MCP_CAPTURE_STATE = {
      prevZoom,
      actualDpr,
      overrideApplied,
      styleId,
      prevDprDesc,
      viewport,
      visualViewport: vv,
      zoomApplied
    };

    return JSON.stringify({
      ok: true,
      viewport,
      visualViewport: vv,
      overrideApplied,
      styleId
    });
  }`;

  const applyResult = await client.callTool("hi_eval", { function: applyScript });
  const applyPayload = extractToolJson(applyResult);
  const applyData =
    parseEvalJsonDeep(applyPayload) ??
    applyPayload?.json ??
    applyPayload?.result ??
    applyPayload ??
    null;

  return {
    requested: {
      width,
      height,
      cssWidth: targetCssWidth,
      cssHeight: targetCssHeight,
      dpr: preflightDpr,
      beforeResize: preflightData || null
    },
    resized: resizePayload || null,
    applied: applyData
  };
}

async function removeCaptureOverrides(client) {
  const cleanupScript = `() => {
    const state = window.__HI_MCP_CAPTURE_STATE || {};
    const styleId = state.styleId || ${JSON.stringify(FREEZE_STYLE_ID)};
    const style = document.getElementById(styleId);
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    const root = document.documentElement;
    if (state.prevZoom !== undefined) {
      if (state.prevZoom) {
        root.style.zoom = state.prevZoom;
      } else {
        root.style.removeProperty("zoom");
      }
    }
    if (state.overrideApplied) {
      try {
        if (state.prevDprDesc) {
          Object.defineProperty(window, "devicePixelRatio", state.prevDprDesc);
        } else {
          delete window.devicePixelRatio;
        }
      } catch {
        // ignore
      }
    }
    try {
      delete window.__HI_MCP_CAPTURE_STATE;
    } catch {
      // ignore
    }
    return { ok: true };
  }`;
  await client.callTool("hi_eval", { function: cleanupScript });
}

async function resolveTargetSize(client, refDims) {
  if (refDims?.width && refDims?.height) {
    return {
      width: refDims.width,
      height: refDims.height,
      source: "reference",
      preflight: null
    };
  }

  const preflightScript = `() => {
    return JSON.stringify({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    });
  }`;
  const preflightResult = await client.callTool("hi_eval", {
    function: preflightScript
  });
  const payload = extractToolJson(preflightResult);
  const data =
    parseEvalJsonDeep(payload) ??
    payload?.json ??
    payload?.result ??
    payload ??
    null;
  const innerWidth = safeNumber(data?.innerWidth) ?? 0;
  const innerHeight = safeNumber(data?.innerHeight) ?? 0;
  const dpr = safeNumber(data?.dpr) ?? 1;
  return {
    width: Math.max(1, Math.round(innerWidth * dpr)),
    height: Math.max(1, Math.round(innerHeight * dpr)),
    source: "viewport",
    preflight: data || null
  };
}

async function captureOnce({
  client,
  timeoutMs,
  targetWidth,
  targetHeight,
  outDir
}) {
  let capture = null;
  let base64 = null;
  let buffer = null;
  const capturePath = outDir
    ? path.join(outDir, "reference.captured.png")
    : null;
  try {
    capture = await applyCaptureOverrides(client, {
      width: targetWidth,
      height: targetHeight
    });
    const shotResult = await client.callTool(
      "hi_screenshot",
      { fullPage: false, filePath: capturePath || undefined },
      { timeoutMs: Math.max(30000, timeoutMs) }
    );
    const shotPayload = extractToolJson(shotResult);
    base64 = shotPayload?.base64 || extractScreenshotBase64(shotResult) || null;
    const rawText = extractToolText(shotResult);
    const savedPath = extractSavedPath(shotPayload, rawText);
    if (!base64 && capturePath && fs.existsSync(capturePath)) {
      buffer = fs.readFileSync(capturePath);
    }
    if (!base64 && !buffer && savedPath && fs.existsSync(savedPath)) {
      const stat = fs.statSync(savedPath);
      if (stat.isFile()) {
        buffer = fs.readFileSync(savedPath);
      }
    }
    if (!base64 && !buffer && outDir) {
      const content = shotResult?.content;
      writeJson(path.join(outDir, "screenshot.debug.json"), {
        hasContent: Array.isArray(content),
        contentTypes: Array.isArray(content) ? content.map((item) => item?.type) : [],
        textPreview: rawText?.slice(0, 2000) || null,
        capturePath,
        capturePathExists: capturePath ? fs.existsSync(capturePath) : false,
        savedPath,
        savedPathExists: savedPath ? fs.existsSync(savedPath) : false
      });
    }
  } finally {
    await removeCaptureOverrides(client);
  }
  if (!buffer && base64) {
    buffer = Buffer.from(base64, "base64");
  }
  return { capture, buffer, capturePath };
}

async function main() {
  const outDir = mustEnv("HI_OUT_DIR");
  const refPng = mustEnv("HI_REF_PNG");
  const slideId = (process.env.HI_SLIDE_ID || "").trim();
  const timeoutMs = Number(process.env.HI_TIMEOUT_MS) || 20000;
  const retries = Number(process.env.HI_RETRIES) || 2;
  const profile = (process.env.HI_PROFILE || "info").trim();
  const urlExact = (process.env.HI_URL_EXACT || "").trim();
  const urlContains = (process.env.HI_URL_CONTAINS || "").trim();
  const confirm = (process.env.HI_CONFIRM || "").trim().toLowerCase();
  const allowOverwrite = confirm === "true" || confirm === "1" || confirm === "yes";

  ensureDir(outDir);
  const logger = createLogger({ prefix: "capture-reference", profile });

  const refDir = process.env.HI_REF_DIR
    ? process.env.HI_REF_DIR.trim()
    : path.dirname(refPng);
  ensureDir(refDir);

  const startedAt = new Date();
  const status = {
    toolId: "capture-reference",
    slideId: slideId || null,
    outDir,
    ok: false,
    startedAt: startedAt.toISOString(),
    finishedAt: "",
    durationMs: 0,
    artifacts: [],
    warnings: [],
    errors: []
  };

  if (!allowOverwrite) {
    status.errors.push("Confirmation required: pass --yes/--confirm/--force");
    status.finishedAt = new Date().toISOString();
    status.durationMs = Date.now() - startedAt.getTime();
    const artifacts = listFilesRelative(outDir);
    if (!artifacts.includes("status.json")) artifacts.push("status.json");
    artifacts.sort();
    status.artifacts = artifacts;
    writeJson(path.join(outDir, "status.json"), status);
    logger.error("confirmation flag missing; aborting capture");
    process.exit(1);
  }

  const refExists = fs.existsSync(refPng);
  const refDims = refExists
    ? readPngDimensions(fs.readFileSync(refPng))
    : null;

  let lastErr = null;
  let captureMeta = null;
  let usedUrl = null;
  let target = null;
  let capturedDims = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const client = new McpStdioClient({ timeoutMs, retries, profile, logger });
    try {
      await client.bootstrap({
        requiredTools: [
          "hi_list_pages",
          "hi_select_page_by_url",
          "hi_eval",
          "hi_resize_page",
          "hi_screenshot"
        ]
      });

      const urlScript = `() => JSON.stringify({ url: window.location.href })`;
      const urlResult = await client.callTool("hi_eval", { function: urlScript });
      const urlPayload = extractToolJson(urlResult);
      const urlData =
        parseEvalJsonDeep(urlPayload) ??
        urlPayload?.json ??
        urlPayload?.result ??
        urlPayload ??
        null;
      usedUrl = urlData?.url || null;

      target = await resolveTargetSize(client, refDims);
      logger.info(
        `capture target: ${target.width}x${target.height} (source=${target.source})`
      );

      const capture = await captureOnce({
        client,
        timeoutMs,
        targetWidth: target.width,
        targetHeight: target.height,
        outDir
      });
      captureMeta = capture.capture;

      if (!capture.buffer) {
        throw new Error("hi_screenshot returned no image data.");
      }

      const buffer = capture.buffer;
      capturedDims = readPngDimensions(buffer);

      if (refExists) {
        const backupName = `reference.png.bak_${formatTimestamp(new Date())}`;
        const backupPath = path.join(refDir, backupName);
        fs.copyFileSync(refPng, backupPath);
        status.warnings.push(`backup created: ${backupName}`);
      }

      fs.writeFileSync(refPng, buffer);
      fs.writeFileSync(path.join(outDir, "reference.captured.png"), buffer);

      status.ok = true;
      break;
    } catch (err) {
      lastErr = err;
      logger.warn(`capture attempt ${attempt} failed: ${errorToString(err)}`);
      if (attempt < 2) {
        logger.warn("retrying capture with new MCP session");
      }
    } finally {
      client.close();
    }
  }

  if (!status.ok) {
    status.errors.push(lastErr ? errorToString(lastErr) : "capture failed");
  }

  status.finishedAt = new Date().toISOString();
  status.durationMs = Date.now() - startedAt.getTime();
  status.url = {
    exact: urlExact || null,
    contains: urlContains || null,
    actual: usedUrl
  };
  status.reference = {
    path: refPng,
    exists: true,
    width: capturedDims?.width || null,
    height: capturedDims?.height || null
  };
  status.viewport = {
    target,
    capture: captureMeta
  };

  const artifacts = listFilesRelative(outDir);
  if (!artifacts.includes("status.json")) artifacts.push("status.json");
  artifacts.sort();
  status.artifacts = artifacts;

  writeJson(path.join(outDir, "status.json"), status);

  if (!status.ok) {
    process.exit(1);
  }
  logger.info(`reference captured -> ${refPng}`);
}

main().catch((err) => {
  console.error("[capture-reference] failed:", errorToString(err));
  process.exit(1);
});
