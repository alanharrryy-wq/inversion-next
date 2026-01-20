/**
 * TOOL: reference-diff
 * Compare current slide screenshot vs reference PNG
 * Outputs: current.png, diff.png, diff.score.json, diff.meta.json, report.html
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  McpStdioClient,
  createLogger,
  extractToolJson,
  extractToolText,
  errorToString,
  safeJsonParse
} from "../runner/mcpClient.mjs";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_THRESHOLD_PCT = 3.0;
const DEFAULT_BLOCK_SIZE = 16;
const DEFAULT_TOP_REGIONS = 5;
const DEFAULT_MIN_REGION_PIXELS = 24;
const DEFAULT_DELTA_THRESHOLD = 64;
const DEFAULT_GROUP_HOTSPOT_RATIO = 0.35;
const DEFAULT_GROUP_MIN_PIXELS = 32;
const DEFAULT_MASK_TOP_ROWS = 3;
const DEFAULT_MASK_FULL_RATIO = 0.9;
const DEFAULT_MASK_MIN_SPAN_BLOCKS = 4;
const DEFAULT_HEATMAP_MIN_ALPHA = 0.12;
const DEFAULT_HEATMAP_MAX_ALPHA = 0.7;
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
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

function scaleImageBilinear(image, targetWidth, targetHeight) {
  const out = new Uint8Array(targetWidth * targetHeight * 4);
  const xRatio =
    targetWidth > 1 ? (image.width - 1) / (targetWidth - 1) : 0;
  const yRatio =
    targetHeight > 1 ? (image.height - 1) / (targetHeight - 1) : 0;

  for (let y = 0; y < targetHeight; y += 1) {
    const srcY = y * yRatio;
    const y0 = Math.floor(srcY);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yLerp = srcY - y0;
    for (let x = 0; x < targetWidth; x += 1) {
      const srcX = x * xRatio;
      const x0 = Math.floor(srcX);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xLerp = srcX - x0;

      const idx00 = (y0 * image.width + x0) * 4;
      const idx10 = (y0 * image.width + x1) * 4;
      const idx01 = (y1 * image.width + x0) * 4;
      const idx11 = (y1 * image.width + x1) * 4;

      for (let c = 0; c < 4; c += 1) {
        const top =
          image.data[idx00 + c] +
          (image.data[idx10 + c] - image.data[idx00 + c]) * xLerp;
        const bottom =
          image.data[idx01 + c] +
          (image.data[idx11 + c] - image.data[idx01 + c]) * xLerp;
        const value = top + (bottom - top) * yLerp;
        out[(y * targetWidth + x) * 4 + c] = Math.round(value);
      }
    }
  }

  return { width: targetWidth, height: targetHeight, data: out };
}

function scaleRegions(regions, scaleX, scaleY) {
  if (!Array.isArray(regions)) return [];
  const out = [];
  for (const region of regions) {
    if (!region || typeof region !== "object") continue;
    const x = safeNumber(region.x ?? region.left);
    const y = safeNumber(region.y ?? region.top);
    const width = safeNumber(region.width ?? region.w);
    const height = safeNumber(region.height ?? region.h);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      continue;
    }
    out.push({
      x: x * scaleX,
      y: y * scaleY,
      width: width * scaleX,
      height: height * scaleY
    });
  }
  return out;
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== "object") return null;
  const x = safeNumber(rect.x ?? rect.left);
  const y = safeNumber(rect.y ?? rect.top);
  const width = safeNumber(rect.width ?? rect.w);
  const height = safeNumber(rect.height ?? rect.h);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function clampRect(rect, maxWidth, maxHeight) {
  const normalized = normalizeRect(rect);
  if (!normalized) return null;
  const x = Math.max(0, Math.floor(normalized.x));
  const y = Math.max(0, Math.floor(normalized.y));
  const width = Math.floor(normalized.width);
  const height = Math.floor(normalized.height);
  if (width <= 0 || height <= 0) return null;
  const clampedWidth = Math.min(width, Math.max(0, maxWidth - x));
  const clampedHeight = Math.min(height, Math.max(0, maxHeight - y));
  if (clampedWidth <= 0 || clampedHeight <= 0) return null;
  return { x, y, width: clampedWidth, height: clampedHeight };
}

function blockAreaAt(col, row, width, height, blockSize) {
  const x = col * blockSize;
  const y = row * blockSize;
  const w = Math.max(0, Math.min(blockSize, width - x));
  const h = Math.max(0, Math.min(blockSize, height - y));
  return w * h;
}

function cropImage(image, rect) {
  const clamped = clampRect(rect, image.width, image.height);
  if (!clamped) return null;
  const { x, y, width, height } = clamped;
  const out = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const srcStart = ((y + row) * image.width + x) * 4;
    const srcEnd = srcStart + width * 4;
    const dstStart = row * width * 4;
    out.set(image.data.subarray(srcStart, srcEnd), dstStart);
  }
  return { width, height, data: out };
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${value.toFixed(2)}%`;
}

function formatSummary({ diffPct, thresholdPct, passed, outDir }) {
  const pctLabel = formatPct(diffPct);
  const thresholdLabel = formatPct(thresholdPct);
  const status = passed ? "PASS" : "FAIL";
  return `reference-diff: diffPct=${pctLabel} threshold=${thresholdLabel} ${status} outDir=${outDir}`;
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
  const fallback = text.match(/\\{[\\s\\S]*\\}/);
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

function buildLayoutEvalScript(selector) {
  return `() => {
    const selector = ${JSON.stringify(selector || "")};
    const viewport = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio || 1
    };
    const rectToObj = (rect) => {
      if (!rect) return null;
      const hasLeft = typeof rect.left === "number";
      return {
        x: hasLeft ? rect.left : rect.x,
        y: hasLeft ? rect.top : rect.y,
        width: rect.width,
        height: rect.height
      };
    };
    const target = selector ? document.querySelector(selector) : null;
    const targetRect = rectToObj(target ? target.getBoundingClientRect() : null);

    const candidates = [];
    const nodes = Array.from(document.body.querySelectorAll("*"));
    for (const el of nodes) {
      if (el === document.body || el === document.documentElement) continue;
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width < 40 || rect.height < 40) continue;
      if (rect.bottom < 0 || rect.right < 0) continue;
      if (rect.top > window.innerHeight || rect.left > window.innerWidth) continue;
      const area = rect.width * rect.height;
      candidates.push({
        tag: el.tagName,
        id: el.id || null,
        className:
          el.className && typeof el.className === "string"
            ? el.className.slice(0, 80)
            : null,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        area
      });
    }
    candidates.sort((a, b) => b.area - a.area);
    const topCandidates = candidates.slice(0, 80);

    return JSON.stringify({
      selector: selector || null,
      viewport,
      targetRect,
      candidates: topCandidates,
      largestRect: rectToObj(candidates[0] || null)
    });
  }`;
}

function pickCropRect(layout, ratioTarget) {
  const viewport = layout?.viewport || null;
  const viewportArea =
    Number.isFinite(viewport?.innerWidth) && Number.isFinite(viewport?.innerHeight)
      ? viewport.innerWidth * viewport.innerHeight
      : null;
  const minArea = viewportArea ? viewportArea * 0.1 : 0;
  const ratioTol = 0.2;

  const selectorRect = normalizeRect(layout?.targetRect);
  if (selectorRect) {
    return {
      rect: selectorRect,
      source: "selector",
      selector: layout?.selector || null
    };
  }

  const candidates = Array.isArray(layout?.candidates) ? layout.candidates : [];
  const usable = [];
  const ratioMatches = [];
  for (const candidate of candidates) {
    const rect = normalizeRect(candidate);
    if (!rect) continue;
    const area = rect.width * rect.height;
    if (area < minArea) continue;
    const ratio = rect.width / rect.height;
    const ratioDiff = ratioTarget ? Math.abs(ratio - ratioTarget) : null;
    const entry = {
      rect,
      area,
      ratio,
      ratioDiff,
      tag: candidate?.tag || null,
      id: candidate?.id || null,
      className: candidate?.className || null
    };
    usable.push(entry);
    if (ratioTarget !== null && ratioDiff !== null && ratioDiff <= ratioTol) {
      ratioMatches.push(entry);
    }
  }

  if (ratioMatches.length) {
    ratioMatches.sort((a, b) => b.area - a.area);
    const best = ratioMatches[0];
    return {
      rect: best.rect,
      source: "ratio",
      selector: null,
      candidate: best
    };
  }

  if (usable.length) {
    usable.sort((a, b) => b.area - a.area);
    const best = usable[0];
    return {
      rect: best.rect,
      source: "largest",
      selector: null,
      candidate: best
    };
  }

  return null;
}

async function getCaptureLayout(client, { selector }) {
  const script = buildLayoutEvalScript(selector);
  const result = await client.callTool("hi_eval", { function: script });
  const payload = extractToolJson(result);
  const parsed =
    parseEvalJsonDeep(payload) ??
    payload?.json ??
    payload?.result ??
    payload ??
    null;
  if (parsed && typeof parsed === "object") {
    if (!parsed.__raw) {
      parsed.__raw = {
        payloadKeys: payload ? Object.keys(payload) : [],
        textLength:
          typeof payload?.text === "string" ? payload.text.length : null,
        hasJsonBlock:
          typeof payload?.text === "string"
            ? /```json/i.test(payload.text)
            : false,
        textPreview:
          typeof payload?.text === "string"
            ? payload.text.slice(0, 500)
            : null
      };
    }
    return parsed;
  }

  return {
    __raw: {
      payloadKeys: payload ? Object.keys(payload) : [],
      textLength: typeof payload?.text === "string" ? payload.text.length : null,
      hasJsonBlock:
        typeof payload?.text === "string" ? /```json/i.test(payload.text) : false,
      textPreview:
        typeof payload?.text === "string" ? payload.text.slice(0, 500) : null
    }
  };
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

function normalizeRegions(regions, width, height) {
  if (!Array.isArray(regions)) return [];
  const out = [];

  for (const region of regions) {
    if (!region || typeof region !== "object") continue;
    const xRaw = region.x ?? region.left ?? 0;
    const yRaw = region.y ?? region.top ?? 0;
    let wRaw = region.width ?? region.w;
    let hRaw = region.height ?? region.h;

    if (wRaw == null && region.right != null) {
      wRaw = region.right - xRaw;
    }
    if (hRaw == null && region.bottom != null) {
      hRaw = region.bottom - yRaw;
    }

    const x = safeNumber(xRaw);
    const y = safeNumber(yRaw);
    const w = safeNumber(wRaw);
    const h = safeNumber(hRaw);

    if (x == null || y == null || w == null || h == null) continue;
    if (w <= 0 || h <= 0) continue;

    const left = Math.max(0, Math.floor(x));
    const top = Math.max(0, Math.floor(y));
    const right = Math.min(width, Math.floor(x + w));
    const bottom = Math.min(height, Math.floor(y + h));

    if (right <= left || bottom <= top) continue;
    out.push({ x: left, y: top, width: right - left, height: bottom - top });
  }

  return out;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodeScanlines({ data, width, height, bytesPerPixel }) {
  const rowBytes = width * bytesPerPixel;
  const expected = (rowBytes + 1) * height;
  if (data.length < expected) {
    throw new Error("PNG data too short for expected scanlines.");
  }

  const output = new Uint8Array(width * height * bytesPerPixel);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = data[offset++];
    const rowStart = y * rowBytes;

    for (let x = 0; x < rowBytes; x += 1) {
      const raw = data[offset++];
      const left = x >= bytesPerPixel ? output[rowStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[rowStart - rowBytes + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? output[rowStart - rowBytes + x - bytesPerPixel]
          : 0;

      let val;
      switch (filter) {
        case 0:
          val = raw;
          break;
        case 1:
          val = raw + left;
          break;
        case 2:
          val = raw + up;
          break;
        case 3:
          val = raw + Math.floor((left + up) / 2);
          break;
        case 4:
          val = raw + paethPredictor(left, up, upLeft);
          break;
        default:
          throw new Error(`Unsupported PNG filter: ${filter}`);
      }
      output[rowStart + x] = val & 0xff;
    }
  }

  return output;
}

function readPng(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  if (buffer.length < PNG_SIGNATURE.length) {
    throw new Error("Invalid PNG buffer.");
  }
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Invalid PNG signature.");
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > buffer.length) break;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      interlace = data.readUInt8(12);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height) {
    throw new Error("PNG missing IHDR.");
  }
  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth}`);
  }
  if (interlace !== 0) {
    throw new Error("Interlaced PNGs not supported.");
  }

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!bytesPerPixel) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = zlib.inflateSync(compressed);
  const decoded = decodeScanlines({
    data: inflated,
    width,
    height,
    bytesPerPixel
  });

  if (bytesPerPixel === 4) {
    return { width, height, data: decoded };
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < decoded.length; i += 3, j += 4) {
    rgba[j] = decoded[i];
    rgba[j + 1] = decoded[i + 1];
    rgba[j + 2] = decoded[i + 2];
    rgba[j + 3] = 255;
  }

  return { width, height, data: rgba };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function writePng({ width, height, data }) {
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0;
    const start = y * rowBytes;
    const end = start + rowBytes;
    raw.set(data.subarray(start, end), offset);
    offset += rowBytes;
  }

  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  return Buffer.concat([
    PNG_SIGNATURE,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
}

function diffImages(
  ref,
  cur,
  regions,
  { blockSize = DEFAULT_BLOCK_SIZE, deltaThreshold = 0 } = {}
) {
  const width = Math.min(ref.width, cur.width);
  const height = Math.min(ref.height, cur.height);
  const ignore = normalizeRegions(regions, width, height);
  const out = new Uint8Array(width * height * 4);
  const diffMask = new Uint8Array(width * height);
  let diffPixels = 0;
  let totalPixels = 0;

  const blockCols = Math.ceil(width / blockSize);
  const blockRows = Math.ceil(height / blockSize);
  const blockCounts = new Uint32Array(blockCols * blockRows);

  const isIgnored = (x, y) =>
    ignore.some(
      (r) =>
        x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height
    );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const refIdx = (y * ref.width + x) * 4;
      const curIdx = (y * cur.width + x) * 4;
      const outIdx = (y * width + x) * 4;
      const maskIdx = y * width + x;

      const r1 = ref.data[refIdx];
      const g1 = ref.data[refIdx + 1];
      const b1 = ref.data[refIdx + 2];
      const a1 = ref.data[refIdx + 3];

      const r2 = cur.data[curIdx];
      const g2 = cur.data[curIdx + 1];
      const b2 = cur.data[curIdx + 2];
      const a2 = cur.data[curIdx + 3];

      if (isIgnored(x, y)) {
        out[outIdx] = r2;
        out[outIdx + 1] = g2;
        out[outIdx + 2] = b2;
        out[outIdx + 3] = 255;
        continue;
      }

      totalPixels += 1;
      const delta =
        Math.abs(r1 - r2) +
        Math.abs(g1 - g2) +
        Math.abs(b1 - b2) +
        Math.abs(a1 - a2);

      if (delta > deltaThreshold) {
        diffPixels += 1;
        diffMask[maskIdx] = 1;
        const bx = Math.floor(x / blockSize);
        const by = Math.floor(y / blockSize);
        blockCounts[by * blockCols + bx] += 1;
        out[outIdx] = 255;
        out[outIdx + 1] = Math.round(g2 * 0.2);
        out[outIdx + 2] = Math.round(b2 * 0.2);
        out[outIdx + 3] = 255;
      } else {
        out[outIdx] = r2;
        out[outIdx + 1] = g2;
        out[outIdx + 2] = b2;
        out[outIdx + 3] = 255;
      }
    }
  }

  return {
    diffData: out,
    diffMask,
    diffPixels,
    totalPixels,
    width,
    height,
    ignoredRegionsCount: ignore.length,
    blockCounts,
    blockCols,
    blockRows,
    blockSize
  };
}

function buildRegions({
  blockCounts,
  blockCols,
  blockRows,
  blockSize,
  width,
  height,
  minBlockPixels = 1,
  minRegionPixels = DEFAULT_MIN_REGION_PIXELS
}) {
  const visited = new Uint8Array(blockCounts.length);
  const regions = [];
  const index = (row, col) => row * blockCols + col;

  for (let row = 0; row < blockRows; row += 1) {
    for (let col = 0; col < blockCols; col += 1) {
      const idx = index(row, col);
      if (visited[idx] || blockCounts[idx] < minBlockPixels) continue;

      let minRow = row;
      let maxRow = row;
      let minCol = col;
      let maxCol = col;
      let diffPixels = 0;
      let blockCount = 0;

      const queue = [[row, col]];
      visited[idx] = 1;

      while (queue.length) {
        const [r, c] = queue.pop();
        const qidx = index(r, c);
        diffPixels += blockCounts[qidx];
        blockCount += 1;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;

        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1]
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= blockRows || nc < 0 || nc >= blockCols) continue;
          const nidx = index(nr, nc);
          if (visited[nidx] || blockCounts[nidx] < minBlockPixels) continue;
          visited[nidx] = 1;
          queue.push([nr, nc]);
        }
      }

      if (diffPixels < minRegionPixels) continue;

      const x = minCol * blockSize;
      const y = minRow * blockSize;
      const right = Math.min(width, (maxCol + 1) * blockSize);
      const bottom = Math.min(height, (maxRow + 1) * blockSize);
      const regionWidth = Math.max(1, right - x);
      const regionHeight = Math.max(1, bottom - y);

      regions.push({
        x,
        y,
        width: regionWidth,
        height: regionHeight,
        diffPixels,
        blockCount,
        area: regionWidth * regionHeight
      });
    }
  }

  regions.sort((a, b) => {
    if (b.diffPixels !== a.diffPixels) return b.diffPixels - a.diffPixels;
    return b.area - a.area;
  });

  return regions;
}

function buildGroupedRegions({
  blockCounts,
  blockCols,
  blockRows,
  blockSize,
  width,
  height,
  hotspotRatio = DEFAULT_GROUP_HOTSPOT_RATIO,
  minHotspotPixels = DEFAULT_GROUP_MIN_PIXELS
}) {
  const visited = new Uint8Array(blockCounts.length);
  const groups = [];
  const index = (row, col) => row * blockCols + col;

  const isHotspot = (row, col) => {
    const idx = index(row, col);
    const count = blockCounts[idx];
    if (!count) return false;
    const area = blockAreaAt(col, row, width, height, blockSize);
    if (!area) return false;
    const ratio = count / area;
    return ratio >= hotspotRatio || count >= minHotspotPixels;
  };

  for (let row = 0; row < blockRows; row += 1) {
    for (let col = 0; col < blockCols; col += 1) {
      const idx = index(row, col);
      if (visited[idx] || !isHotspot(row, col)) continue;

      let minRow = row;
      let maxRow = row;
      let minCol = col;
      let maxCol = col;
      let diffPixels = 0;
      let blockCount = 0;

      const queue = [[row, col]];
      visited[idx] = 1;

      while (queue.length) {
        const [r, c] = queue.pop();
        const qidx = index(r, c);
        diffPixels += blockCounts[qidx];
        blockCount += 1;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;

        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1]
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= blockRows || nc < 0 || nc >= blockCols) continue;
          const nidx = index(nr, nc);
          if (visited[nidx] || !isHotspot(nr, nc)) continue;
          visited[nidx] = 1;
          queue.push([nr, nc]);
        }
      }

      const x = minCol * blockSize;
      const y = minRow * blockSize;
      const right = Math.min(width, (maxCol + 1) * blockSize);
      const bottom = Math.min(height, (maxRow + 1) * blockSize);
      const regionWidth = Math.max(1, right - x);
      const regionHeight = Math.max(1, bottom - y);

      groups.push({
        x,
        y,
        width: regionWidth,
        height: regionHeight,
        diffPixels,
        blockCount,
        area: regionWidth * regionHeight
      });
    }
  }

  groups.sort((a, b) => {
    if (b.diffPixels !== a.diffPixels) return b.diffPixels - a.diffPixels;
    return b.area - a.area;
  });

  return groups;
}

function buildBlockHotspots({
  blockCounts,
  blockCols,
  blockRows,
  blockSize,
  width,
  height
}) {
  const hotspots = [];
  const index = (row, col) => row * blockCols + col;

  for (let row = 0; row < blockRows; row += 1) {
    for (let col = 0; col < blockCols; col += 1) {
      const idx = index(row, col);
      const count = blockCounts[idx];
      if (!count) continue;
      const x = col * blockSize;
      const y = row * blockSize;
      const regionWidth = Math.min(blockSize, width - x);
      const regionHeight = Math.min(blockSize, height - y);
      hotspots.push({
        x,
        y,
        width: regionWidth,
        height: regionHeight,
        diffPixels: count,
        blockCount: 1,
        area: regionWidth * regionHeight
      });
    }
  }

  hotspots.sort((a, b) => {
    if (b.diffPixels !== a.diffPixels) return b.diffPixels - a.diffPixels;
    return b.area - a.area;
  });

  return hotspots;
}

function buildHeatmapImage({
  baseImage,
  blockCounts,
  blockCols,
  blockRows,
  blockSize,
  minAlpha = DEFAULT_HEATMAP_MIN_ALPHA,
  maxAlpha = DEFAULT_HEATMAP_MAX_ALPHA
}) {
  const out = new Uint8Array(baseImage.data.length);
  out.set(baseImage.data);

  let maxCount = 0;
  for (let i = 0; i < blockCounts.length; i += 1) {
    if (blockCounts[i] > maxCount) maxCount = blockCounts[i];
  }
  if (!maxCount) {
    return { width: baseImage.width, height: baseImage.height, data: out };
  }

  const width = baseImage.width;
  const height = baseImage.height;

  for (let row = 0; row < blockRows; row += 1) {
    for (let col = 0; col < blockCols; col += 1) {
      const idx = row * blockCols + col;
      const count = blockCounts[idx];
      if (!count) continue;
      const area = blockAreaAt(col, row, width, height, blockSize);
      if (!area) continue;
      const intensity = Math.min(1, count / area);
      const alpha = Math.min(maxAlpha, minAlpha + intensity * (maxAlpha - minAlpha));
      const heatR = 255;
      const heatG = Math.max(0, Math.round(200 * (1 - intensity)));
      const heatB = 0;

      const x0 = col * blockSize;
      const y0 = row * blockSize;
      const x1 = Math.min(width, x0 + blockSize);
      const y1 = Math.min(height, y0 + blockSize);

      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const baseIdx = (y * width + x) * 4;
          out[baseIdx] = Math.round(
            out[baseIdx] * (1 - alpha) + heatR * alpha
          );
          out[baseIdx + 1] = Math.round(
            out[baseIdx + 1] * (1 - alpha) + heatG * alpha
          );
          out[baseIdx + 2] = Math.round(
            out[baseIdx + 2] * (1 - alpha) + heatB * alpha
          );
          out[baseIdx + 3] = 255;
        }
      }
    }
  }

  return { width, height, data: out };
}

function estimateMaskImpact({
  rect,
  diffMask,
  width,
  height,
  totalPixels,
  diffPixels,
  diffPct
}) {
  const clamped = clampRect(rect, width, height);
  if (!clamped) return null;
  let maskedPixels = 0;
  let maskedDiffPixels = 0;
  for (let y = clamped.y; y < clamped.y + clamped.height; y += 1) {
    for (let x = clamped.x; x < clamped.x + clamped.width; x += 1) {
      const idx = y * width + x;
      maskedPixels += 1;
      if (diffMask[idx]) maskedDiffPixels += 1;
    }
  }
  const remainingPixels = totalPixels - maskedPixels;
  const remainingDiff = diffPixels - maskedDiffPixels;
  const diffPctAfter =
    remainingPixels > 0 ? (remainingDiff / remainingPixels) * 100 : 0;
  return {
    maskedPixels,
    maskedDiffPixels,
    diffPctAfter,
    diffPctReduction: diffPct - diffPctAfter
  };
}

function suggestTopEdgeMasks({
  blockCounts,
  blockCols,
  blockRows,
  blockSize,
  width,
  height,
  diffMask,
  diffPixels,
  totalPixels,
  diffPct,
  topRows = DEFAULT_MASK_TOP_ROWS,
  minFullRatio = DEFAULT_MASK_FULL_RATIO,
  minSpanBlocks = DEFAULT_MASK_MIN_SPAN_BLOCKS
}) {
  const rows = Math.min(blockRows, Math.max(1, topRows));
  const colHot = new Array(blockCols).fill(false);

  for (let col = 0; col < blockCols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const idx = row * blockCols + col;
      const count = blockCounts[idx];
      if (!count) continue;
      const area = blockAreaAt(col, row, width, height, blockSize);
      if (!area) continue;
      if (count / area >= minFullRatio) {
        colHot[col] = true;
        break;
      }
    }
  }

  const suggestions = [];
  let start = null;
  for (let col = 0; col <= blockCols; col += 1) {
    const hit = col < blockCols ? colHot[col] : false;
    if (hit && start === null) start = col;
    if ((!hit || col === blockCols) && start !== null) {
      const end = col - 1;
      const span = end - start + 1;
      if (span >= minSpanBlocks) {
        const rect = {
          x: start * blockSize,
          y: 0,
          width: Math.min(width, span * blockSize),
          height: Math.min(height, rows * blockSize)
        };
        const impact = estimateMaskImpact({
          rect,
          diffMask,
          width,
          height,
          totalPixels,
          diffPixels,
          diffPct
        });
        suggestions.push({
          id: suggestions.length + 1,
          rect,
          rationale: "High-diff tiles along top edge (likely shimmer/noise)",
          impact
        });
      }
      start = null;
    }
  }

  return {
    strategy: "top-edge-full-tiles",
    topRows: rows,
    minFullRatio,
    minSpanBlocks,
    suggestions
  };
}

function drawRect(data, width, height, region, color, thickness = 2) {
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(width - 1, Math.floor(region.x + region.width - 1));
  const y1 = Math.min(height - 1, Math.floor(region.y + region.height - 1));
  const [r, g, b] = color;

  for (let t = 0; t < thickness; t += 1) {
    const top = Math.min(height - 1, y0 + t);
    const bottom = Math.max(0, y1 - t);
    for (let x = x0; x <= x1; x += 1) {
      const topIdx = (top * width + x) * 4;
      const botIdx = (bottom * width + x) * 4;
      data[topIdx] = r;
      data[topIdx + 1] = g;
      data[topIdx + 2] = b;
      data[topIdx + 3] = 255;
      data[botIdx] = r;
      data[botIdx + 1] = g;
      data[botIdx + 2] = b;
      data[botIdx + 3] = 255;
    }
    const left = Math.min(width - 1, x0 + t);
    const right = Math.max(0, x1 - t);
    for (let y = y0; y <= y1; y += 1) {
      const leftIdx = (y * width + left) * 4;
      const rightIdx = (y * width + right) * 4;
      data[leftIdx] = r;
      data[leftIdx + 1] = g;
      data[leftIdx + 2] = b;
      data[leftIdx + 3] = 255;
      data[rightIdx] = r;
      data[rightIdx + 1] = g;
      data[rightIdx + 2] = b;
      data[rightIdx + 3] = 255;
    }
  }
}

function drawRegionBoxes(data, width, height, regions) {
  const colors = [
    [255, 0, 255],
    [255, 165, 0],
    [0, 200, 255],
    [0, 255, 140],
    [255, 255, 0]
  ];
  regions.forEach((region, idx) => {
    drawRect(data, width, height, region, colors[idx % colors.length], 2);
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildReportHtml({
  slideId,
  referenceExists,
  referenceMeta,
  currentMeta,
  referenceMatchPath,
  score,
  regions,
  groupedRegions,
  groupsSummary,
  heatmapPath,
  maskSuggestions,
  ignoredRegionsCount
}) {
  const diffPctLabel = formatPct(score.diffPct);
  const thresholdLabel = formatPct(score.thresholdPct);
  const passLabel = score.passed ? "PASS" : "FAIL";
  const statusClass = score.passed ? "pass" : "fail";

  const regionRows = regions.length
    ? regions
        .map(
          (region, idx) => `<tr>
            <td>#${idx + 1}</td>
            <td>${region.x}, ${region.y}</td>
            <td>${region.width} x ${region.height}</td>
            <td>${region.area}</td>
            <td>${region.diffPixels}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5">No significant regions detected.</td></tr>`;

  const groupRows = groupedRegions?.length
    ? groupedRegions
        .map(
          (region, idx) => `<tr>
            <td>#${idx + 1}</td>
            <td>${region.x}, ${region.y}</td>
            <td>${region.width} x ${region.height}</td>
            <td>${region.area}</td>
            <td>${region.diffPixels}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5">No grouped regions detected.</td></tr>`;

  const maskRows = maskSuggestions?.suggestions?.length
    ? maskSuggestions.suggestions
        .map((mask) => {
          const rect = mask.rect || {};
          const impact = mask.impact || {};
          const diffAfter = Number.isFinite(impact.diffPctAfter)
            ? `${impact.diffPctAfter.toFixed(2)}%`
            : "n/a";
          const reduction = Number.isFinite(impact.diffPctReduction)
            ? `${impact.diffPctReduction.toFixed(2)}%`
            : "n/a";
          return `<tr>
            <td>#${mask.id}</td>
            <td>${rect.x}, ${rect.y}</td>
            <td>${rect.width} x ${rect.height}</td>
            <td>${diffAfter}</td>
            <td>${reduction}</td>
            <td>${escapeHtml(mask.rationale || "")}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6">No mask suggestions.</td></tr>`;

  const refDim = referenceMeta
    ? `${referenceMeta.width} x ${referenceMeta.height}`
    : "n/a";
  const curDim = currentMeta ? `${currentMeta.width} x ${currentMeta.height}` : "n/a";
  const refImgPath = referenceMatchPath || "reference.png";
  const refHeading = referenceMatchPath
    ? `Reference (scaled) - ${refDim}`
    : `Reference - ${refDim}`;
  const heatmapImgPath = heatmapPath || "heatmap.png";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Reference Diff</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
      .grid { display: flex; gap: 16px; flex-wrap: wrap; }
      .panel { border: 1px solid #ccc; padding: 8px; flex: 1; min-width: 280px; }
      img { max-width: 100%; height: auto; display: block; border: 1px solid #ddd; }
      pre { background: #f7f7f7; padding: 12px; overflow: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
      th { background: #f0f0f0; }
      .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
      .pass { background: #e6f7e6; color: #1b5e20; border: 1px solid #1b5e20; }
      .fail { background: #fdecea; color: #b71c1c; border: 1px solid #b71c1c; }
      .legend { margin-top: 8px; }
      .legend li { margin: 4px 0; }
    </style>
  </head>
  <body>
    <h1>Reference Diff</h1>
    <p>Slide: ${escapeHtml(slideId || "unknown")}</p>
    <p>Status: <span class="status ${statusClass}">${passLabel}</span></p>
    <p>Diff: <strong>${diffPctLabel}</strong> (threshold ${thresholdLabel})</p>
    <p>Reference size: ${refDim} | Current size: ${curDim}</p>
    <p>Ignored regions: ${ignoredRegionsCount}</p>

    ${
      !referenceExists
        ? "<p><strong>Reference missing.</strong> Diff aborted.</p>"
        : ""
    }

    <div class="grid">
      <div class="panel">
        <h2>${refHeading}</h2>
        ${
          referenceExists
            ? `<img src="${refImgPath}" alt="Reference" />`
            : "<p>Reference image missing.</p>"
        }
      </div>
      <div class="panel">
        <h2>Current</h2>
        ${referenceExists ? '<img src="current.png" alt="Current" />' : "<p>n/a</p>"}
      </div>
      <div class="panel">
        <h2>Diff</h2>
        ${referenceExists ? '<img src="diff.png" alt="Diff" />' : "<p>n/a</p>"}
      </div>
      <div class="panel">
        <h2>Heatmap</h2>
        ${referenceExists ? `<img src="${heatmapImgPath}" alt="Heatmap" />` : "<p>n/a</p>"}
      </div>
    </div>

    <h2>Top Diff Regions</h2>
    <table>
      <thead>
        <tr>
          <th>Region</th>
          <th>Origin (x, y)</th>
          <th>Size (w x h)</th>
          <th>Area (px)</th>
          <th>Delta (px)</th>
        </tr>
      </thead>
      <tbody>
        ${regionRows}
      </tbody>
    </table>

    <h2>Grouped Hotspots</h2>
    <p>${escapeHtml(groupsSummary || "n/a")}</p>
    <table>
      <thead>
        <tr>
          <th>Group</th>
          <th>Origin (x, y)</th>
          <th>Size (w x h)</th>
          <th>Area (px)</th>
          <th>Delta (px)</th>
        </tr>
      </thead>
      <tbody>
        ${groupRows}
      </tbody>
    </table>

    <h2>Suggested Masks</h2>
    <table>
      <thead>
        <tr>
          <th>Mask</th>
          <th>Origin (x, y)</th>
          <th>Size (w x h)</th>
          <th>Diff After</th>
          <th>Reduction</th>
          <th>Rationale</th>
        </tr>
      </thead>
      <tbody>
        ${maskRows}
      </tbody>
    </table>

    <h2>Legend</h2>
    <ul class="legend">
      <li>Red pixels in diff image indicate changed pixels.</li>
      <li>Colored boxes mark top diff regions (ranked by diff pixels).</li>
      <li>Heatmap overlays block-level diff intensity on current capture.</li>
      <li>Delta = number of changed pixels inside the region.</li>
      <li>Ignored regions are excluded from diffPct and region detection.</li>
    </ul>

    <h2>Raw Score</h2>
    <pre>${escapeHtml(JSON.stringify(score, null, 2))}</pre>
  </body>
</html>`;
}

async function main() {
  const outDir = mustEnv("HI_OUT_DIR");
  const refPng = mustEnv("HI_REF_PNG");
  const mcpDir = mustEnv("HI_MCP_DIR");
  const slideId = (process.env.HI_SLIDE_ID || "").trim();
  const timeoutMs = Number(process.env.HI_TIMEOUT_MS) || 20000;
  const retries = Number(process.env.HI_RETRIES) || 2;
  const profile = (process.env.HI_PROFILE || "info").trim();

  ensureDir(outDir);
  const logger = createLogger({ prefix: "reference-diff", profile });

  const configPath = path.join(mcpDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide config: ${configPath}`);
  }
  const config = readJson(configPath);
  const thresholdPct =
    safeNumber(config?.diff?.thresholdPct) ?? DEFAULT_THRESHOLD_PCT;
  const ignoreRegions = config?.diff?.ignoreRegions || [];
  const deltaThreshold =
    safeNumber(config?.diff?.deltaThreshold) ?? DEFAULT_DELTA_THRESHOLD;
  const groupHotspotRatio =
    safeNumber(config?.diff?.groupHotspotRatio) ?? DEFAULT_GROUP_HOTSPOT_RATIO;
  const groupMinPixels =
    safeNumber(config?.diff?.groupMinPixels) ?? DEFAULT_GROUP_MIN_PIXELS;
  const maskTopRows =
    safeNumber(config?.diff?.maskTopRows) ?? DEFAULT_MASK_TOP_ROWS;
  const maskFullRatio =
    safeNumber(config?.diff?.maskFullRatio) ?? DEFAULT_MASK_FULL_RATIO;
  const maskMinSpanBlocks =
    safeNumber(config?.diff?.maskMinSpanBlocks) ?? DEFAULT_MASK_MIN_SPAN_BLOCKS;
  const heatmapMinAlpha =
    safeNumber(config?.diff?.heatmapMinAlpha) ?? DEFAULT_HEATMAP_MIN_ALPHA;
  const heatmapMaxAlpha =
    safeNumber(config?.diff?.heatmapMaxAlpha) ?? DEFAULT_HEATMAP_MAX_ALPHA;

  if (!fs.existsSync(refPng)) {
    const score = {
      diffPct: null,
      passed: false,
      thresholdPct,
      ignoredRegionsCount: 0,
      regionsCount: 0,
      timeMs: 0,
      error: "reference_missing"
    };
    const meta = {
      toolId: "reference-diff",
      slideId: slideId || null,
      reference: { path: refPng, exists: false },
      current: null,
      diff: score,
      regions: []
    };
    writeJson(path.join(outDir, "diff.score.json"), score);
    writeJson(path.join(outDir, "diff.meta.json"), meta);
    writeText(
      path.join(outDir, "report.html"),
      buildReportHtml({
        slideId,
        referenceExists: false,
        referenceMeta: null,
        currentMeta: null,
        referenceMatchPath: null,
        score,
        regions: [],
        groupedRegions: [],
        groupsSummary: "",
        heatmapPath: null,
        maskSuggestions: null,
        ignoredRegionsCount: 0
      })
    );
    const artifacts = listFilesRelative(outDir);
    if (!artifacts.includes("index.json")) artifacts.push("index.json");
    artifacts.sort();
    writeJson(path.join(outDir, "index.json"), {
      toolId: "reference-diff",
      slideId: slideId || null,
      timestamp: new Date().toISOString(),
      artifacts,
      metrics: {
        diffPct: score.diffPct,
        passed: score.passed
      }
    });
    logger.warn(formatSummary({ ...score, outDir }));
    logger.warn(`Reference PNG missing: ${refPng}`);
    throw new Error("Reference PNG missing.");
  }

  const refImg = readPng(fs.readFileSync(refPng));
  const referenceMeta = {
    path: refPng,
    width: refImg.width,
    height: refImg.height
  };

  const client = new McpStdioClient({ timeoutMs, retries, profile, logger });
  let currentMeta = null;
  let regionsTop = [];
  let groupedRegionsTop = [];
  let groupsSummary = "";
  let maskSuggestions = null;
  let heatmapPath = null;
  let groupPayload = null;
  let maskPayload = null;
  let score = null;
  let capture = null;
  let normalization = null;
  let layout = null;
  let cropMeta = null;
  let layoutMeta = null;
  let referenceMatchPath = null;

  try {
    await client.bootstrap({
      requiredTools: [
        "hi_list_pages",
        "hi_select_page_by_url",
        "hi_screenshot",
        "hi_eval",
        "hi_resize_page"
      ]
    });

    const viewportTarget = { width: refImg.width, height: refImg.height };

    let shotPayload = null;
    const fullPath = path.join(outDir, "current.full.png");
    const currentPath = path.join(outDir, "current.png");
    try {
      capture = await applyCaptureOverrides(client, viewportTarget);
      try {
        layout = await getCaptureLayout(client, {
          selector: config?.selectors?.root || ""
        });
        if (layout && !layout.viewport) {
          writeJson(path.join(outDir, "layout.debug.json"), layout);
        }
      } catch (err) {
        logger.warn(`layout capture failed: ${errorToString(err)}`);
      }
      logger.info("Capturing current screenshot...");
      const shotResult = await client.callTool(
        "hi_screenshot",
        { fullPage: false, filePath: fullPath },
        { timeoutMs: Math.max(30000, timeoutMs) }
      );
      shotPayload = extractToolJson(shotResult);
      const rawText = extractToolText(shotResult);
      const base64 =
        shotPayload?.base64 || extractScreenshotBase64(shotResult);
      const savedPath = extractSavedPath(shotPayload, rawText);
      let buffer = null;
      if (!base64 && fs.existsSync(fullPath)) {
        buffer = fs.readFileSync(fullPath);
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
          contentTypes: Array.isArray(content)
            ? content.map((item) => item?.type)
            : [],
          textPreview: rawText?.slice(0, 2000) || null,
          fullPath,
          fullPathExists: fs.existsSync(fullPath),
          savedPath,
          savedPathExists: savedPath ? fs.existsSync(savedPath) : false
        });
      }
      if (!buffer && base64) {
        buffer = Buffer.from(base64, "base64");
      }
      if (!buffer) {
        throw new Error("hi_screenshot returned no image data.");
      }
      fs.writeFileSync(fullPath, buffer);
    } finally {
      try {
        await removeCaptureOverrides(client);
      } catch (err) {
        logger.warn(`cleanup failed: ${errorToString(err)}`);
      }
    }
    fs.copyFileSync(refPng, path.join(outDir, "reference.png"));

    const curImgFull = readPng(fs.readFileSync(fullPath));
    let curImg = curImgFull;
    const ratioTarget = refImg.width / refImg.height;

    if (layout && layout.viewport) {
      layoutMeta = {
        selector: layout.selector || null,
        viewport: layout.viewport || null,
        targetRect: layout.targetRect || null,
        candidatesCount: Array.isArray(layout.candidates)
          ? layout.candidates.length
          : 0,
        raw: layout.__raw || null
      };
      const selection = pickCropRect(layout, ratioTarget);
      const viewport = layout.viewport;
      const rectCss = selection?.rect
        ? clampRect(selection.rect, viewport.innerWidth, viewport.innerHeight)
        : null;
      const scaleX =
        Number.isFinite(viewport.innerWidth) && viewport.innerWidth > 0
          ? curImgFull.width / viewport.innerWidth
          : null;
      const scaleY =
        Number.isFinite(viewport.innerHeight) && viewport.innerHeight > 0
          ? curImgFull.height / viewport.innerHeight
          : null;

      if (rectCss && Number.isFinite(scaleX) && Number.isFinite(scaleY)) {
        const rectPx = {
          x: rectCss.x * scaleX,
          y: rectCss.y * scaleY,
          width: rectCss.width * scaleX,
          height: rectCss.height * scaleY
        };
        const cropped = cropImage(curImgFull, rectPx);
        if (cropped) {
          curImg = cropped;
          cropMeta = {
            source: selection?.source || "unknown",
            selector: selection?.selector || null,
            rectCss,
            rectPx: clampRect(rectPx, curImgFull.width, curImgFull.height),
            viewport,
            scale: { x: scaleX, y: scaleY },
            candidate: selection?.candidate
              ? {
                  tag: selection.candidate.tag,
                  id: selection.candidate.id,
                  className: selection.candidate.className,
                  area: selection.candidate.area,
                  ratio: selection.candidate.ratio,
                  ratioDiff: selection.candidate.ratioDiff
                }
              : null
          };
        }
      }
    } else {
      if (layout) {
        layoutMeta = {
          selector: layout.selector || null,
          viewport: layout.viewport || null,
          targetRect: layout.targetRect || null,
          candidatesCount: Array.isArray(layout.candidates)
            ? layout.candidates.length
            : 0,
          raw: layout.__raw || null
        };
      }
      logger.warn("layout unavailable; skipping crop.");
    }

    if (cropMeta) {
      fs.writeFileSync(currentPath, writePng(curImg));
    } else {
      fs.copyFileSync(fullPath, currentPath);
    }

    currentMeta = {
      width: curImg.width,
      height: curImg.height,
      full: { width: curImgFull.width, height: curImgFull.height }
    };

    let diffRef = refImg;
    let diffCurrent = curImg;
    let ignoreForDiff = ignoreRegions;

    if (curImg.width !== refImg.width || curImg.height !== refImg.height) {
      diffRef = scaleImageBilinear(refImg, curImg.width, curImg.height);
      referenceMatchPath = "reference.match.png";
      fs.writeFileSync(
        path.join(outDir, referenceMatchPath),
        writePng(diffRef)
      );
      normalization = {
        strategy: "scale-reference-to-current",
        source: { width: refImg.width, height: refImg.height },
        target: { width: curImg.width, height: curImg.height },
        crop: cropMeta ? { ...cropMeta } : null
      };
      ignoreForDiff = scaleRegions(
        ignoreRegions,
        diffRef.width / refImg.width,
        diffRef.height / refImg.height
      );
    } else {
      normalization = {
        strategy: "none",
        source: { width: refImg.width, height: refImg.height },
        target: { width: curImg.width, height: curImg.height },
        crop: cropMeta ? { ...cropMeta } : null
      };
    }

    const diffStart = Date.now();
    const diff = diffImages(diffRef, diffCurrent, ignoreForDiff, {
      deltaThreshold
    });
    const regions = buildRegions({
      blockCounts: diff.blockCounts,
      blockCols: diff.blockCols,
      blockRows: diff.blockRows,
      blockSize: diff.blockSize,
      width: diff.width,
      height: diff.height
    });

    const fullArea = diff.width * diff.height;
    let regionsMode = "clusters";
    let regionsForReport = regions;
    if (regions.length <= 1 && regions[0]?.area) {
      const coverage = regions[0].area / fullArea;
      if (coverage >= 0.9) {
        regionsMode = "hotspots";
        regionsForReport = buildBlockHotspots({
          blockCounts: diff.blockCounts,
          blockCols: diff.blockCols,
          blockRows: diff.blockRows,
          blockSize: diff.blockSize,
          width: diff.width,
          height: diff.height
        });
      }
    }

    const regionsCount = regionsForReport.length;
    const regionsClusterCount = regions.length;
    regionsTop = regionsForReport.slice(0, DEFAULT_TOP_REGIONS).map((region, idx) => ({
      id: idx + 1,
      ...region
    }));

    const groupedRegions = buildGroupedRegions({
      blockCounts: diff.blockCounts,
      blockCols: diff.blockCols,
      blockRows: diff.blockRows,
      blockSize: diff.blockSize,
      width: diff.width,
      height: diff.height,
      hotspotRatio: groupHotspotRatio,
      minHotspotPixels: groupMinPixels
    });
    groupedRegionsTop = groupedRegions.slice(0, DEFAULT_TOP_REGIONS).map((region, idx) => ({
      id: idx + 1,
      ...region
    }));
    groupsSummary = `groups=${groupedRegions.length}, hotspotRatio=${groupHotspotRatio}, minPixels=${groupMinPixels}`;
    groupPayload = {
      blockSize: diff.blockSize,
      hotspotRatio: groupHotspotRatio,
      minHotspotPixels: groupMinPixels,
      groupsCount: groupedRegions.length,
      groups: groupedRegions
    };
    writeJson(path.join(outDir, "diff.groups.json"), groupPayload);

    drawRegionBoxes(diff.diffData, diff.width, diff.height, regionsTop);

    const diffPng = writePng({
      width: diff.width,
      height: diff.height,
      data: diff.diffData
    });
    fs.writeFileSync(path.join(outDir, "diff.png"), diffPng);

    heatmapPath = "heatmap.png";
    const heatmap = buildHeatmapImage({
      baseImage: diffCurrent,
      blockCounts: diff.blockCounts,
      blockCols: diff.blockCols,
      blockRows: diff.blockRows,
      blockSize: diff.blockSize,
      minAlpha: heatmapMinAlpha,
      maxAlpha: heatmapMaxAlpha
    });
    fs.writeFileSync(path.join(outDir, heatmapPath), writePng(heatmap));

    const diffPct = diff.totalPixels
      ? (diff.diffPixels / diff.totalPixels) * 100
      : 0;
    const passed = diffPct <= thresholdPct;
    const timeMs = Date.now() - diffStart;

    score = {
      diffPct,
      passed,
      thresholdPct,
      ignoredRegionsCount: diff.ignoredRegionsCount,
      regionsCount,
      timeMs,
      deltaThreshold
    };

    maskPayload = suggestTopEdgeMasks({
      blockCounts: diff.blockCounts,
      blockCols: diff.blockCols,
      blockRows: diff.blockRows,
      blockSize: diff.blockSize,
      width: diff.width,
      height: diff.height,
      diffMask: diff.diffMask,
      diffPixels: diff.diffPixels,
      totalPixels: diff.totalPixels,
      diffPct,
      topRows: Math.round(maskTopRows),
      minFullRatio: maskFullRatio,
      minSpanBlocks: Math.round(maskMinSpanBlocks)
    });
    maskSuggestions = {
      ...maskPayload,
      totalPixels: diff.totalPixels,
      diffPixels: diff.diffPixels,
      diffPct
    };
    writeJson(path.join(outDir, "mask.suggest.json"), maskSuggestions);

    writeJson(path.join(outDir, "diff.score.json"), score);
    const captureMeta = capture
      ? {
          viewport: {
            requested: capture.requested || null,
            resized: capture.resized || null,
            actual: capture.applied?.viewport || null,
            visualViewport: capture.applied?.visualViewport || null
          },
          devicePixelRatio: {
            reported: capture.applied?.viewport?.dprReported ?? null,
            overrideApplied: Boolean(capture.applied?.overrideApplied),
            overrideValue: capture.applied?.overrideApplied ? 1 : null,
            zoomApplied: capture.applied?.viewport?.zoomApplied ?? null
          },
          motionFreeze: {
            applied: Boolean(capture.applied?.styleId),
            styleId: capture.applied?.styleId || null
          },
          layout: layoutMeta,
          crop: cropMeta || null,
          screenshot: {
            fullPage: false
          }
        }
      : null;

    writeJson(path.join(outDir, "diff.meta.json"), {
      toolId: "reference-diff",
      slideId: slideId || null,
      reference: referenceMeta,
      current: currentMeta,
      normalization,
      capture: captureMeta,
      diff: {
        diffPct,
        passed,
        thresholdPct,
        ignoredRegionsCount: diff.ignoredRegionsCount,
        regionsCount,
        timeMs,
        deltaThreshold,
        width: diff.width,
        height: diff.height
      },
      groups: {
        hotspotRatio: groupHotspotRatio,
        minHotspotPixels: groupMinPixels,
        groupsCount: groupPayload?.groupsCount ?? 0,
        groupsTop: groupedRegionsTop
      },
      heatmap: {
        path: heatmapPath,
        minAlpha: heatmapMinAlpha,
        maxAlpha: heatmapMaxAlpha
      },
      maskSuggestions: maskSuggestions
        ? {
            strategy: maskSuggestions.strategy,
            topRows: maskSuggestions.topRows,
            minFullRatio: maskSuggestions.minFullRatio,
            minSpanBlocks: maskSuggestions.minSpanBlocks,
            suggestionsCount: maskSuggestions.suggestions?.length || 0,
            suggestions: maskSuggestions.suggestions
          }
        : null,
      regionBlockSize: diff.blockSize,
      regionsCount,
      regionsMode,
      regionsClusterCount,
      regions: regionsTop
    });

    writeText(
      path.join(outDir, "report.html"),
      buildReportHtml({
        slideId,
        referenceExists: true,
        referenceMeta,
        currentMeta,
        referenceMatchPath,
        score,
        regions: regionsTop,
        groupedRegions: groupedRegionsTop,
        groupsSummary,
        heatmapPath,
        maskSuggestions,
        ignoredRegionsCount: diff.ignoredRegionsCount
      })
    );

    const artifacts = listFilesRelative(outDir);
    if (!artifacts.includes("index.json")) artifacts.push("index.json");
    artifacts.sort();
    writeJson(path.join(outDir, "index.json"), {
      toolId: "reference-diff",
      slideId: slideId || null,
      timestamp: new Date().toISOString(),
      artifacts,
      metrics: {
        diffPct: score.diffPct,
        passed: score.passed,
        thresholdPct: score.thresholdPct,
        timeMs: score.timeMs,
        regionsCount: score.regionsCount,
        groupsCount: groupPayload?.groupsCount ?? 0,
        maskSuggestionsCount: maskSuggestions?.suggestions?.length || 0
      },
      capture: captureMeta,
      normalization
    });

    logger.info(formatSummary({ ...score, outDir }));
    logger.info("reference-diff completed");
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error("[reference-diff] failed:", errorToString(err));
  process.exit(1);
});
