/**
 * TOOL: state-cycler
 * Cycle through stress-test states
 * Outputs: state_*.png, states.runlog.json
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

function sanitizeId(value, used) {
  const base = String(value || "state").replace(/[^a-zA-Z0-9_-]/g, "_");
  let candidate = base || "state";
  let suffix = 1;
  while (used.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  used.add(candidate);
  return candidate;
}

function buildApplyScript(slideId, state) {
  const digits = String(slideId || "").match(/\d+/g);
  const slideNum = digits ? String(Number(digits.join(""))) : "";
  const hookName = slideNum ? `__HI_SET_SLIDE${slideNum}_STATE` : "";

  return `() => {
    const state = ${JSON.stringify(state)};
    const slideId = ${JSON.stringify(slideId)};
    const hookName = ${JSON.stringify(hookName)};

    const hook = hookName && typeof window[hookName] === "function"
      ? window[hookName]
      : null;

    if (hook) {
      hook(state.payload || {});
      return { ok: true, method: "hook", hookName };
    }

    if (typeof window.__HI_SET_SLIDE_STATE === "function") {
      window.__HI_SET_SLIDE_STATE(slideId, state.payload || {});
      return { ok: true, method: "generic", hookName: "__HI_SET_SLIDE_STATE" };
    }

    window.__HI_MCP_STATE = {
      id: state.id,
      payload: state.payload || {},
      slideId,
      appliedAt: Date.now()
    };
    window.dispatchEvent(
      new CustomEvent("hi:mcp:state", { detail: { slideId, state: state } })
    );
    return { ok: true, method: "event", hookName: "hi:mcp:state" };
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
  const logger = createLogger({ prefix: "state-cycler", profile });
  const client = new McpStdioClient({ timeoutMs, retries, profile, logger });

  const configPath = path.join(mcpDir, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide config: ${configPath}`);
  }
  const config = readJson(configPath);
  const states = Array.isArray(config?.states) ? config.states : [];

  await client.bootstrap({
    requiredTools: ["hi_list_pages", "hi_select_page_by_url", "hi_eval", "hi_screenshot"]
  });

  const runlog = {
    tool: "state-cycler",
    slideId: slideId || null,
    executedAt: new Date().toISOString(),
    states: [],
    errors: []
  };

  if (!states.length) {
    runlog.errors.push("No states configured.");
    writeJson(path.join(outDir, "states.runlog.json"), runlog);
    client.close();
    return;
  }

  const usedNames = new Set();
  for (const state of states) {
    const stateId = state?.id || "state";
    const safeId = sanitizeId(stateId, usedNames);
    const entry = {
      id: stateId,
      file: `state_${safeId}.png`,
      ok: false,
      appliedBy: null,
      durationMs: 0,
      error: null
    };
    const start = Date.now();

    try {
      const applyScript = buildApplyScript(slideId, state);
      const applyResult = await client.callTool("hi_eval", {
        function: applyScript
      });
      const applyPayload = extractToolJson(applyResult);
      entry.appliedBy = applyPayload?.method || "unknown";

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
        path.join(outDir, entry.file),
        Buffer.from(base64, "base64")
      );
      entry.ok = true;
    } catch (err) {
      entry.error = errorToString(err);
      logger.warn(`state ${stateId} failed: ${entry.error}`);
    } finally {
      entry.durationMs = Date.now() - start;
      runlog.states.push(entry);
    }
  }

  writeJson(path.join(outDir, "states.runlog.json"), runlog);
  logger.info(`states captured: ${runlog.states.length}`);
  client.close();
}

main().catch((err) => {
  console.error("[state-cycler] failed:", errorToString(err));
  process.exit(1);
});
