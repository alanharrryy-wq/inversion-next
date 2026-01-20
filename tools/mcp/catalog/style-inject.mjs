/**
 * TOOL: style-inject
 * Inject temporary debug CSS overlays
 * Outputs: debug.overlay.png, injected.css.txt
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

const STYLE_ID = "__hi_mcp_style_inject";
const LABEL_ATTR = "data-hi-mcp-label";

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

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

function buildCss(config) {
  const inject = config?.styleInject || {};
  const parts = [];

  if (inject.grid?.enabled) {
    const step = Number(inject.grid.stepPx) || 8;
    const opacity = Number(inject.grid.opacity);
    const gridOpacity = Number.isFinite(opacity) ? opacity : 0.2;
    parts.push(`
      html::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483646;
        background-image:
          linear-gradient(to right, rgba(255, 255, 255, ${gridOpacity}) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, ${gridOpacity}) 1px, transparent 1px);
        background-size: ${step}px ${step}px;
      }
    `);
  }

  if (inject.outlines?.enabled) {
    const color = inject.outlines.color || "rgba(0,255,255,0.55)";
    const width = Number(inject.outlines.widthPx) || 1;
    parts.push(`
      body * {
        outline: ${width}px solid ${color};
        outline-offset: -${width}px;
      }
    `);
  }

  if (inject.paddingHeat?.enabled) {
    parts.push(`
      body * {
        box-shadow: inset 0 0 0 1px rgba(255, 128, 0, 0.25);
      }
    `);
  }

  if (inject.labelOverlay?.enabled) {
    parts.push(`
      [${LABEL_ATTR}] {
        position: relative;
      }
      [${LABEL_ATTR}]::after {
        content: attr(${LABEL_ATTR});
        position: absolute;
        left: 0;
        top: 0;
        transform: translateY(-100%);
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        padding: 2px 4px;
        font: 12px/1.2 "Courier New", monospace;
        letter-spacing: 0.2px;
        white-space: nowrap;
        pointer-events: none;
        z-index: 2147483647;
      }
    `);
  }

  return parts.join("\n").trim() + "\n";
}

function buildLabelMaps(config) {
  const selectors = config?.selectors || {};
  const labels = config?.labels || {};
  return { selectors, labels };
}

async function main() {
  const outDir = mustEnv("HI_OUT_DIR");
  const mcpDir = mustEnv("HI_MCP_DIR");
  const timeoutMs = Number(process.env.HI_TIMEOUT_MS) || 20000;
  const retries = Number(process.env.HI_RETRIES) || 2;
  const profile = (process.env.HI_PROFILE || "info").trim();

  ensureDir(outDir);
  const logger = createLogger({ prefix: "style-inject", profile });
  const client = new McpStdioClient({ timeoutMs, retries, profile, logger });

  const configPath = path.join(mcpDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide config: ${configPath}`);
  }
  const config = readJson(configPath);
  const injectedCss = buildCss(config);
  const { selectors, labels } = buildLabelMaps(config);

  writeText(path.join(outDir, "injected.css.txt"), injectedCss);

  await client.bootstrap({
    requiredTools: ["hi_list_pages", "hi_select_page_by_url", "hi_eval", "hi_screenshot"]
  });

  const applyScript = `() => {
    const css = ${JSON.stringify(injectedCss)};
    const styleId = ${JSON.stringify(STYLE_ID)};
    const labelAttr = ${JSON.stringify(LABEL_ATTR)};
    const selectors = ${JSON.stringify(selectors)};
    const labels = ${JSON.stringify(labels)};

    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = css;

    document.querySelectorAll("[" + labelAttr + "]").forEach((el) => {
      el.removeAttribute(labelAttr);
    });

    const applied = [];
    Object.keys(labels || {}).forEach((key) => {
      const sel = selectors[key];
      if (!sel) return;
      const el = document.querySelector(sel);
      if (!el) return;
      el.setAttribute(labelAttr, labels[key]);
      applied.push(key);
    });

    return { ok: true, applied };
  }`;

  const cleanupScript = `() => {
    const styleId = ${JSON.stringify(STYLE_ID)};
    const labelAttr = ${JSON.stringify(LABEL_ATTR)};
    const style = document.getElementById(styleId);
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    document.querySelectorAll("[" + labelAttr + "]").forEach((el) => {
      el.removeAttribute(labelAttr);
    });
    return { ok: true };
  }`;

  try {
    logger.info("Injecting styles...");
    const applyResult = await client.callTool("hi_eval", {
      function: applyScript
    });
    const applyPayload = extractToolJson(applyResult);
    logger.info(`Applied labels: ${(applyPayload?.applied || []).length}`);

    await sleep(150);
    const shotResult = await client.callTool(
      "hi_screenshot",
      { fullPage: true },
      { timeoutMs: Math.max(30000, timeoutMs) }
    );
    const shotPayload = extractToolJson(shotResult);
    const base64 = shotPayload?.base64;
    if (!base64) {
      throw new Error("hi_screenshot returned no base64 data.");
    }
    fs.writeFileSync(
      path.join(outDir, "debug.overlay.png"),
      Buffer.from(base64, "base64")
    );
  } finally {
    logger.info("Removing injected styles...");
    try {
      await client.callTool("hi_eval", { function: cleanupScript });
    } catch (err) {
      logger.warn(`cleanup failed: ${errorToString(err)}`);
    }
    client.close();
  }
}

main().catch((err) => {
  console.error("[style-inject] failed:", errorToString(err));
  process.exit(1);
});
