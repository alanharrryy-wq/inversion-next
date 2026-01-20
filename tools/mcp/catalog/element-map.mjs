/**
 * TOOL: element-map
 * Generate labeled visual map of slide elements
 * Outputs: annotated.png, elements.map.json
 */

import fs from "node:fs";
import path from "node:path";
import {
  McpStdioClient,
  createLogger,
  extractToolJson,
  errorToString,
  sleep
} from "../runner/mcpClient.mjs";

const OVERLAY_ID = "__hi_mcp_element_map";
const FALLBACK_MAX = 8;

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

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function safeJsonParse(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseNestedJson(value) {
  if (typeof value !== "string") return null;
  let parsed = safeJsonParse(value);
  if (parsed && typeof parsed === "object") return parsed;
  if (typeof parsed === "string") {
    const nested = safeJsonParse(parsed);
    if (nested && typeof nested === "object") return nested;
  }
  return null;
}

function parseContentPayload(obj) {
  const content = obj?.content;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    if (item?.type === "json" && item.json && typeof item.json === "object") {
      return item.json;
    }
    if (item?.type === "text" && typeof item.text === "string") {
      const text = item.text.trim();
      let parsed = safeJsonParse(text);
      if (parsed && typeof parsed === "object") return parsed;
      if (typeof parsed === "string") {
        const nested = safeJsonParse(parsed);
        if (nested && typeof nested === "object") return nested;
      }
      const match = text.match(/```json\s*([\s\S]*?)```/i);
      if (match) {
        parsed = safeJsonParse(match[1].trim());
        if (parsed && typeof parsed === "object") return parsed;
        if (typeof parsed === "string") {
          const nested = safeJsonParse(parsed);
          if (nested && typeof nested === "object") return nested;
        }
      }
      const fallback = text.match(/\{[\s\S]*\}/);
      if (fallback) {
        parsed = safeJsonParse(fallback[0]);
        if (parsed && typeof parsed === "object") return parsed;
        if (typeof parsed === "string") {
          const nested = safeJsonParse(parsed);
          if (nested && typeof nested === "object") return nested;
        }
      }
    }
  }
  return null;
}

function extractToolText(result) {
  const content = result?.content;
  if (!Array.isArray(content)) return "";
  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      return item.text;
    }
  }
  return "";
}

function parseToolPayload(result) {
  const payload = extractToolJson(result);
  if (payload && typeof payload === "object") {
    const nested =
      parseNestedJson(payload.result) ||
      parseNestedJson(payload.text) ||
      parseNestedJson(payload.json);
    const fromContent =
      parseContentPayload(payload.result) ||
      parseContentPayload(payload);
    if (nested) return nested;
    if (fromContent) return fromContent;
    return payload;
  }
  const content = result?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item?.type === "json" && item.json && typeof item.json === "object") {
        return item.json;
      }
    }
  }
  const text = extractToolText(result);
  if (!text) return null;
  const trimmed = text.trim();
  let parsed = safeJsonParse(trimmed);
  if (parsed && typeof parsed === "object") return parsed;
  if (typeof parsed === "string") {
    const nested = safeJsonParse(parsed);
    if (nested && typeof nested === "object") return nested;
  }
  const match = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (match) {
    parsed = safeJsonParse(match[1].trim());
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") {
      const nested = safeJsonParse(parsed);
      if (nested && typeof nested === "object") return nested;
    }
  }
  const fallback = trimmed.match(/\{[\s\S]*\}/);
  if (fallback) {
    parsed = safeJsonParse(fallback[0]);
    if (parsed && typeof parsed === "object") return parsed;
    if (typeof parsed === "string") {
      const nested = safeJsonParse(parsed);
      if (nested && typeof nested === "object") return nested;
    }
  }
  return null;
}

function buildEvalScript(config) {
  const selectors = config?.selectors || {};
  const labels = config?.labels || {};
  const rootSelector = selectors.root || null;

  return `() => {
    const selectors = ${JSON.stringify(selectors)};
    const labels = ${JSON.stringify(labels)};
    const rootSelector = ${JSON.stringify(rootSelector)};
    const overlayId = ${JSON.stringify(OVERLAY_ID)};

    const root = rootSelector ? document.querySelector(rootSelector) : document.body;
    const scope = root || document.body;

    const entries = [];
    const missing = [];
    const keys = Object.keys(labels || {});
    let foundCount = 0;

    const round = (n) => Math.round(n * 100) / 100;
    const rectPayload = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: round(r.x),
        y: round(r.y),
        width: round(r.width),
        height: round(r.height),
        top: round(r.top),
        left: round(r.left),
        right: round(r.right),
        bottom: round(r.bottom)
      };
    };

    keys.forEach((key) => {
      const selector = selectors[key];
      if (!selector) {
        missing.push({ id: key, selector: null });
        return;
      }
      const el = scope.querySelector(selector);
      if (!el) {
        missing.push({ id: key, selector });
        return;
      }
      foundCount += 1;
      entries.push({
        id: key,
        label: labels[key] || key,
        selector,
        rect: rectPayload(el)
      });
    });

    const selectorMismatch = keys.length > 0 && foundCount === 0;
    const fallback = [];
    if (selectorMismatch) {
      const candidates = Array.from(scope.querySelectorAll("*"))
        .map((el) => {
          if (el === document.body || el === document.documentElement || el === scope) {
            return null;
          }
          const r = el.getBoundingClientRect();
          const area = r.width * r.height;
          const cs = getComputedStyle(el);
          return {
            el,
            area,
            rect: r,
            display: cs.display,
            visibility: cs.visibility,
            opacity: Number(cs.opacity)
          };
        })
        .filter((item) => item && item.area > 500 && item.display !== "none" && item.visibility !== "hidden" && item.opacity > 0);

      candidates.sort((a, b) => b.area - a.area);
      const maxFallback = Math.min(${FALLBACK_MAX}, candidates.length);
      for (let i = 0; i < maxFallback; i += 1) {
        const item = candidates[i];
        const label = "unknown_" + String(i + 1).padStart(2, "0");
        fallback.push({
          id: label,
          label,
          selector: null,
          rect: rectPayload(item.el)
        });
      }
    }

    if (selectorMismatch && fallback.length) {
      entries.length = 0;
      entries.push(...fallback);
    }

    const existing = document.getElementById(overlayId);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483647";
    overlay.style.fontFamily = "Courier New, monospace";

    entries.forEach((entry, index) => {
      const box = document.createElement("div");
      const hue = (index * 47) % 360;
      box.style.position = "absolute";
      box.style.left = entry.rect.left + window.scrollX + "px";
      box.style.top = entry.rect.top + window.scrollY + "px";
      box.style.width = entry.rect.width + "px";
      box.style.height = entry.rect.height + "px";
      box.style.border = "2px solid hsl(" + hue + ", 80%, 55%)";
      box.style.boxSizing = "border-box";
      box.style.background = "rgba(0,0,0,0.02)";

      const label = document.createElement("div");
      label.textContent = entry.label;
      label.style.position = "absolute";
      label.style.left = "0";
      label.style.top = "0";
      label.style.transform = "translateY(-100%)";
      label.style.background = "hsl(" + hue + ", 80%, 35%)";
      label.style.color = "#fff";
      label.style.padding = "2px 6px";
      label.style.fontSize = "12px";
      label.style.whiteSpace = "nowrap";
      label.style.pointerEvents = "none";

      box.appendChild(label);
      overlay.appendChild(box);
    });

    document.body.appendChild(overlay);

    return JSON.stringify({
      ok: true,
      elements: entries,
      missing,
      overlayId,
      fallback,
      selectorMismatch,
      fallbackUsed: selectorMismatch && fallback.length > 0,
      foundCount
    });
  }`;
}

async function main() {
  const outDir = mustEnv("HI_OUT_DIR");
  const mcpDir = mustEnv("HI_MCP_DIR");
  const slideId = (process.env.HI_SLIDE_ID || "").trim();
  const timeoutMs = Number(process.env.HI_TIMEOUT_MS) || 20000;
  const retries = Number(process.env.HI_RETRIES) || 2;
  const profile = (process.env.HI_PROFILE || "info").trim();

  ensureDir(outDir);
  const logger = createLogger({ prefix: "element-map", profile });
  const client = new McpStdioClient({ timeoutMs, retries, profile, logger });

  const configPath = path.join(mcpDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide config: ${configPath}`);
  }
  const config = readJson(configPath);

  await client.bootstrap({
    requiredTools: ["hi_list_pages", "hi_select_page_by_url", "hi_eval", "hi_screenshot"]
  });

  const evalScript = buildEvalScript(config);
  const cleanupScript = `() => {
    const overlay = document.getElementById(${JSON.stringify(OVERLAY_ID)});
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    return { ok: true };
  }`;

  try {
    logger.info("Building overlay map...");
    const evalResult = await client.callTool("hi_eval", {
      function: evalScript
    });
    const payload = parseToolPayload(evalResult);
    const payloadLooksEmpty =
      !payload ||
      (!Array.isArray(payload?.elements) &&
        !Array.isArray(payload?.missing) &&
        !Array.isArray(payload?.fallback));
    if (payloadLooksEmpty) {
      const rawText = extractToolText(evalResult);
      const content = evalResult?.content;
      writeJson(path.join(outDir, "eval.debug.json"), {
        hasContent: Array.isArray(content),
        contentTypes: Array.isArray(content) ? content.map((item) => item?.type) : [],
        textPreview: rawText ? rawText.slice(0, 2000) : null,
        payloadType: payload ? typeof payload : null,
        payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : []
      });
    }
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];
    const missing = Array.isArray(payload?.missing) ? payload.missing : [];
    const fallback = Array.isArray(payload?.fallback) ? payload.fallback : [];
    const selectorMismatch = Boolean(payload?.selectorMismatch);
    const fallbackUsed = Boolean(payload?.fallbackUsed);
    const foundCount = Number.isFinite(payload?.foundCount) ? payload.foundCount : 0;

    await sleep(150);
    const shotResult = await client.callTool(
      "hi_screenshot",
      { fullPage: true },
      { timeoutMs: Math.max(30000, timeoutMs) }
    );
    const shotPayload = parseToolPayload(shotResult);
    const base64 = shotPayload?.base64;
    if (!base64) {
      throw new Error("hi_screenshot returned no base64 data.");
    }
    fs.writeFileSync(
      path.join(outDir, "annotated.png"),
      Buffer.from(base64, "base64")
    );

    const map = {
      tool: "element-map",
      slideId: slideId || null,
      generatedAt: new Date().toISOString(),
      elements,
      missing,
      fallback,
      selectorMismatch,
      fallbackUsed,
      foundCount
    };

    writeJson(path.join(outDir, "elements.map.json"), map);
    logger.info(
      `elements mapped: ${elements.length} found=${foundCount} fallback=${fallback.length}`
    );
  } finally {
    try {
      await client.callTool("hi_eval", { function: cleanupScript });
    } catch (err) {
      logger.warn(`cleanup failed: ${errorToString(err)}`);
    }
    client.close();
  }
}

main().catch((err) => {
  console.error("[element-map] failed:", errorToString(err));
  process.exit(1);
});
