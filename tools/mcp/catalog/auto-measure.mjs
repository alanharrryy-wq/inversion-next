/**
 * TOOL: auto-measure
 * Measure DOM layout metrics
 * Outputs: measurements.json, measurements.pretty.txt
 */

import fs from "node:fs";
import path from "node:path";
import {
  McpStdioClient,
  createLogger,
  extractToolJson,
  errorToString
} from "../runner/mcpClient.mjs";

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

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
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
  const measure = config?.measure || {};
  const rootSelector = selectors.root || null;

  return `() => {
    const selectors = ${JSON.stringify(selectors)};
    const labels = ${JSON.stringify(labels)};
    const measure = ${JSON.stringify(measure)};
    const rootSelector = ${JSON.stringify(rootSelector)};

    const root = rootSelector ? document.querySelector(rootSelector) : document.body;
    const scope = root || document.body;
    const elementKeys = Array.isArray(measure.elements)
      ? measure.elements
      : Object.keys(selectors || {}).filter((key) => key !== "root");
    const styleKeys = Array.isArray(measure.computedStyles) ? measure.computedStyles : [];

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

    const output = [];
    const missing = [];
    let foundCount = 0;

    elementKeys.forEach((key) => {
      const selector = selectors[key];
      if (!selector) {
        missing.push({ id: key, selector: null });
        output.push({ id: key, selector: null, label: labels[key] || key, found: false });
        return;
      }
      const el = scope.querySelector(selector);
      if (!el) {
        missing.push({ id: key, selector });
        output.push({ id: key, selector, label: labels[key] || key, found: false });
        return;
      }
      foundCount += 1;
      const cs = getComputedStyle(el);
      const computed = {};
      styleKeys.forEach((prop) => {
        computed[prop] = cs.getPropertyValue(prop) || cs[prop] || "";
      });
      output.push({
        id: key,
        selector,
        label: labels[key] || key,
        found: true,
        rect: rectPayload(el),
        computed
      });
    });

    const fallback = [];
    const selectorMismatch = elementKeys.length > 0 && foundCount === 0;
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
        const cs = getComputedStyle(item.el);
        const computed = {};
        styleKeys.forEach((prop) => {
          computed[prop] = cs.getPropertyValue(prop) || cs[prop] || "";
        });
        fallback.push({
          id: "unknown_" + String(i + 1).padStart(2, "0"),
          label: "unknown_" + String(i + 1).padStart(2, "0"),
          selector: null,
          found: true,
          rect: rectPayload(item.el),
          computed
        });
      }
    }

    return JSON.stringify({
      elements: output,
      missing,
      fallback,
      styleKeys,
      foundCount,
      selectorMismatch,
      fallbackUsed: selectorMismatch && fallback.length > 0
    });
  }`;
}

function buildPrettyText(payload) {
  const lines = [];
  lines.push("AUTO-MEASURE");
  lines.push("");
  lines.push(`Measured at: ${payload.measuredAt}`);
  lines.push(`Slide: ${payload.slideId || "unknown"}`);
  lines.push(`Selector mismatch: ${payload.selectorMismatch ? "yes" : "no"}`);
  lines.push(`Fallback used: ${payload.fallbackUsed ? "yes" : "no"}`);
  lines.push(`Found count: ${payload.foundCount ?? 0}`);
  lines.push("");

  payload.elements.forEach((el) => {
    lines.push(`- ${el.label} (${el.id})`);
    lines.push(`  selector: ${el.selector || "n/a"}`);
    lines.push(`  found: ${el.found ? "yes" : "no"}`);
    if (el.rect) {
      lines.push(
        `  rect: x=${el.rect.x} y=${el.rect.y} w=${el.rect.width} h=${el.rect.height}`
      );
    }
    const computedKeys = el.computed ? Object.keys(el.computed) : [];
    if (computedKeys.length) {
      lines.push("  computed:");
      computedKeys.forEach((key) => {
        lines.push(`    ${key}: ${el.computed[key]}`);
      });
    }
    lines.push("");
  });

  if (payload.fallback.length) {
    lines.push("Fallback elements:");
    payload.fallback.forEach((el) => {
      lines.push(
        `- ${el.label}: x=${el.rect.x} y=${el.rect.y} w=${el.rect.width} h=${el.rect.height}`
      );
    });
  }

  return lines.join("\n");
}

async function main() {
  const outDir = mustEnv("HI_OUT_DIR");
  const mcpDir = mustEnv("HI_MCP_DIR");
  const slideId = (process.env.HI_SLIDE_ID || "").trim();
  const timeoutMs = Number(process.env.HI_TIMEOUT_MS) || 20000;
  const retries = Number(process.env.HI_RETRIES) || 2;
  const profile = (process.env.HI_PROFILE || "info").trim();

  ensureDir(outDir);
  const logger = createLogger({ prefix: "auto-measure", profile });
  const client = new McpStdioClient({ timeoutMs, retries, profile, logger });

  const configPath = path.join(mcpDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide config: ${configPath}`);
  }
  const config = readJson(configPath);

  await client.bootstrap({
    requiredTools: ["hi_list_pages", "hi_select_page_by_url", "hi_eval"]
  });

  const evalScript = buildEvalScript(config);
  const evalResult = await client.callTool("hi_eval", { function: evalScript });
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
  const fallback = Array.isArray(payload?.fallback) ? payload.fallback : [];
  const missing = Array.isArray(payload?.missing) ? payload.missing : [];
  const styleKeys = Array.isArray(payload?.styleKeys) ? payload.styleKeys : [];
  const selectorMismatch = Boolean(payload?.selectorMismatch);
  const fallbackUsed = Boolean(payload?.fallbackUsed);
  const foundCount = Number.isFinite(payload?.foundCount) ? payload.foundCount : 0;

  const output = {
    tool: "auto-measure",
    slideId: slideId || null,
    measuredAt: new Date().toISOString(),
    elements,
    fallback,
    missing,
    styleKeys,
    foundCount,
    selectorMismatch,
    fallbackUsed
  };

  writeJson(path.join(outDir, "measurements.json"), output);
  writeText(path.join(outDir, "measurements.pretty.txt"), buildPrettyText(output));

  logger.info(
    `measured elements: ${elements.length} found=${foundCount} fallback=${fallback.length}`
  );
  client.close();
}

main().catch((err) => {
  console.error("[auto-measure] failed:", errorToString(err));
  process.exit(1);
});
