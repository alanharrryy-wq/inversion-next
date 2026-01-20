import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const PROTOCOL_VERSION = "2024-11-05";
const IS_WIN = process.platform === "win32";
const NPX_CMD = IS_WIN ? "cmd.exe" : "npx";
const NPX_ARGS_PREFIX = IS_WIN ? ["/d", "/s", "/c", "npx"] : [];

const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const DEFAULT_URL_CONTAINS = "localhost:5177/#/deck?s=2";
const DEFAULT_FLICKER_OUT = path.resolve("tools/mcp/_flicker_out");
const DEFAULT_SHOTS = 12;
const DEFAULT_DELAY_MS = 180;

const DEFAULT_TIMEOUT_MS = 15000;
const SCREENSHOT_TIMEOUT_MS = 30000;

const BROWSER_URL = envString("HI_BROWSER_URL", DEFAULT_BROWSER_URL);
const URL_CONTAINS_DEFAULT = envString("HI_URL_CONTAINS", DEFAULT_URL_CONTAINS);
const URL_EXACT_DEFAULT = envString("HI_URL_EXACT", "");
const FLICKER_OUT_DEFAULT = path.resolve(
  envString("HI_FLICKER_OUT", DEFAULT_FLICKER_OUT)
);
const SHOTS_DEFAULT = normalizePositiveInt(
  process.env.HI_SHOTS,
  DEFAULT_SHOTS
);
const DELAY_DEFAULT = normalizeNonNegativeInt(
  process.env.HI_DELAY_MS,
  DEFAULT_DELAY_MS
);

const PANEL_GEO_SCRIPT = `() => {
  const panel = document.querySelector(".hi-inspector__panel");
  if (!panel) return { ok:false, reason:"NO_PANEL" };

  const r = panel.getBoundingClientRect();
  const cs = getComputedStyle(panel);

  const cx = Math.floor(r.left + r.width / 2);
  const cy = Math.floor(r.top + r.height / 2);

  const topEl = (r.width > 0 && r.height > 0)
    ? document.elementFromPoint(cx, cy)
    : null;

  return {
    ok:true,
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    computed: {
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      position: cs.position,
      top: cs.top,
      left: cs.left,
      right: cs.right,
      bottom: cs.bottom,
      width: cs.width,
      height: cs.height,
      transform: cs.transform,
      pointerEvents: cs.pointerEvents,
      zIndex: cs.zIndex
    },
    elementFromPoint: topEl ? {
      tag: topEl.tagName,
      id: topEl.id || "",
      class: (topEl.className || "").toString().slice(0, 160)
    } : null
  };
}`;

function envString(name, fallback) {
  const value = process.env[name];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function normalizePositiveInt(value, fallback) {
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) return Math.floor(num);
  return fallback;
}

function normalizeNonNegativeInt(value, fallback) {
  const num = Number(value);
  if (Number.isFinite(num) && num >= 0) return Math.floor(num);
  return fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTextContent(result) {
  const content = result?.content;
  if (!Array.isArray(content)) return "";
  for (const item of content) {
    if (item?.type === "text" && typeof item.text === "string") {
      return item.text;
    }
  }
  return "";
}

function extractPagesFromText(text) {
  const lines = (text || "").split("\n");
  const pages = [];
  const re = /^(\d+):\s+(\S+)(\s+\[selected\])?$/i;
  for (const line of lines) {
    const match = line.trim().match(re);
    if (!match) continue;
    pages.push({
      pageId: Number(match[1]),
      url: match[2],
      selected: Boolean(match[3])
    });
  }
  return pages;
}

function extractBase64FromToolResult(result) {
  const content = result?.content || [];

  for (const item of content) {
    if (
      item?.type === "image" &&
      typeof item?.data === "string" &&
      item.data.length > 200
    ) {
      return {
        base64: item.data,
        mimeType: item.mimeType || "image/png"
      };
    }
  }

  for (const item of content) {
    if (item?.type === "text" && typeof item?.text === "string") {
      const text = item.text;
      const dataUrl = text.match(
        /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/i
      );
      if (dataUrl) {
        return { base64: dataUrl[2], mimeType: dataUrl[1] };
      }
      const b64 = text.match(/[A-Za-z0-9+/=]{500,}/);
      if (b64) return { base64: b64[0], mimeType: "image/png" };
    }
  }

  return { base64: null, mimeType: null };
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function trimText(text, maxLen = 500) {
  if (typeof text !== "string") return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

function errorToString(err) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isDevtoolsConnectionError(err) {
  const msg = errorToString(err).toLowerCase();
  return (
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    (msg.includes("connect") && msg.includes("9222")) ||
    msg.includes("connection refused")
  );
}

function wrapDevtoolsError(err) {
  if (isDevtoolsConnectionError(err)) {
    return new Error(
      `Chrome DevTools not reachable at ${BROWSER_URL}. ` +
        "Launch Chrome with --remote-debugging-port=9222 (or set HI_BROWSER_URL). " +
        `Original error: ${errorToString(err)}`
    );
  }
  return err instanceof Error ? err : new Error(errorToString(err));
}

class ChromeDevtoolsMcpClient {
  constructor({ browserUrl }) {
    this.browserUrl = browserUrl;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.cachedTools = [];
    this.readyPromise = null;
  }

  start() {
    if (this.proc) return;
    this.proc = spawn(
      NPX_CMD,
      [
        ...NPX_ARGS_PREFIX,
        "-y",
        "chrome-devtools-mcp@latest",
        `--browser-url=${this.browserUrl}`
      ],
      { stdio: ["pipe", "pipe", "inherit"] }
    );

    this.proc.stdout.on("data", (buf) => this.handleData(buf));
    this.proc.on("error", (err) => {
      this.rejectAll(err);
      this.proc = null;
      this.readyPromise = null;
    });
    this.proc.on("exit", (code, signal) => {
      const msg = `chrome-devtools-mcp exited (${signal || code || "unknown"})`;
      this.rejectAll(new Error(msg));
      this.proc = null;
      this.readyPromise = null;
    });
  }

  send(msg) {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error("chrome-devtools-mcp stdin not writable");
    }
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  handleData(buf) {
    this.buffer += buf.toString("utf8");
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!(trimmed.startsWith("{") && trimmed.includes("\"jsonrpc\""))) continue;

      let obj;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (!obj || obj.jsonrpc !== "2.0") continue;

      if (obj.id && this.pending.has(obj.id)) {
        const { resolve, reject, timer } = this.pending.get(obj.id);
        this.pending.delete(obj.id);
        if (timer) clearTimeout(timer);
        if (obj.error) {
          const err = new Error(obj.error.message || "RPC error");
          err.code = obj.error.code;
          err.data = obj.error.data;
          err.rpcError = obj.error;
          reject(err);
        } else {
          resolve(obj.result);
        }
      }
    }
  }

  rejectAll(err) {
    for (const pending of this.pending.values()) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
  }

  rpc(method, params = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async ensureReady() {
    if (!this.readyPromise) {
      this.readyPromise = this.initialize().catch((err) => {
        this.readyPromise = null;
        throw err;
      });
    }
    return this.readyPromise;
  }

  async initialize() {
    this.start();
    await this.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: { name: "hitech-operator", version: "1.0.0" },
      capabilities: {}
    });
    this.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    const tools = await this.rpc("tools/list", {});
    this.cachedTools = Array.isArray(tools?.tools) ? tools.tools : [];
  }

  async refreshTools() {
    const tools = await this.rpc("tools/list", {});
    this.cachedTools = Array.isArray(tools?.tools) ? tools.tools : [];
    return this.cachedTools;
  }

  async ensureTool(name) {
    if (this.cachedTools.some((tool) => tool.name === name)) return;
    await this.refreshTools();
    if (!this.cachedTools.some((tool) => tool.name === name)) {
      throw new Error(`Tool not found in chrome-devtools-mcp: ${name}`);
    }
  }

  async callTool(name, args = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    await this.ensureTool(name);
    return this.rpc(
      "tools/call",
      { name, arguments: args || {} },
      { timeoutMs }
    );
  }

  close() {
    if (this.proc && !this.proc.killed) {
      this.rejectAll(new Error("chrome-devtools-mcp closed"));
      this.proc.kill();
    }
  }
}

const chromeClient = new ChromeDevtoolsMcpClient({ browserUrl: BROWSER_URL });

async function callChromeTool(name, args, options) {
  await chromeClient.ensureReady();
  return chromeClient.callTool(name, args, options);
}

async function callChromeToolWithValidationRetry(
  name,
  args,
  { timeoutMs = DEFAULT_TIMEOUT_MS, validate } = {}
) {
  let firstResult;

  try {
    const result = await callChromeTool(name, args, { timeoutMs });
    if (!validate || validate(result)) {
      return { result, ok: true, attempts: 1 };
    }
    firstResult = result;
  } catch {
    // retry once on error
  }

  try {
    const result = await callChromeTool(name, args, { timeoutMs });
    if (!validate || validate(result)) {
      return { result, ok: true, attempts: 2 };
    }
    return { result, ok: false, attempts: 2 };
  } catch (err) {
    if (firstResult) {
      return { result: firstResult, ok: false, attempts: 2, error: err };
    }
    throw err;
  }
}

async function listPagesBestEffort() {
  const { result, ok, attempts } = await callChromeToolWithValidationRetry(
    "list_pages",
    {},
    {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      validate: (res) =>
        extractPagesFromText(extractTextContent(res)).length > 0
    }
  );

  const text = extractTextContent(result);
  const pages = extractPagesFromText(text);
  return { pages, ok, attempts, rawText: text };
}

function resolveUrlExact(input) {
  if (typeof input === "string" && input.trim()) return input.trim();
  return URL_EXACT_DEFAULT || "";
}

function resolveUrlContains(input) {
  if (typeof input === "string" && input.trim()) return input.trim();
  return URL_CONTAINS_DEFAULT || "";
}

function resolveTargetHints(args = {}) {
  return {
    urlExact: resolveUrlExact(args.urlExact),
    urlContains: resolveUrlContains(args.urlContains)
  };
}

function isDevtoolsJsonPage(url) {
  return typeof url === "string" && url.includes(":9222/json");
}

function findTargetMatch(pages, { urlExact, urlContains }) {
  let match = null;
  if (urlExact) match = pages.find((page) => page.url === urlExact);
  if (!match && urlContains) {
    match = pages.find((page) => (page.url || "").includes(urlContains));
  }
  return match || null;
}

function warnOnlyDevtools(pages, { urlExact, urlContains }) {
  if (!pages.length) return;
  const onlyDevtools = pages.every((page) => isDevtoolsJsonPage(page.url));
  if (!onlyDevtools) return;
  const target = urlExact || urlContains || "(no target)";
  console.error(
    "Warning: only DevTools JSON pages are available. Open the target app page " +
      `(${target}) in Chrome, or set HI_URL_EXACT/HI_URL_CONTAINS.`
  );
}

function pickPage(pages, hints) {
  const { urlExact, urlContains } = resolveTargetHints(hints);
  let match = findTargetMatch(pages, { urlExact, urlContains });
  if (!match) match = pages.find((page) => page.selected);
  if (!match) match = pages[0];
  return match || null;
}

async function selectPageByUrl(args = {}) {
  const { pages, rawText } = await listPagesBestEffort();
  if (!pages.length) {
    throw new Error(
      `No pages found via list_pages. ${trimText(rawText)}`.trim()
    );
  }

  const hints = resolveTargetHints(args);
  const match = pickPage(pages, hints);
  if (!match) {
    throw new Error("No matching page found via list_pages.");
  }

  if (isDevtoolsJsonPage(match.url)) {
    warnOnlyDevtools(pages, hints);
  }

  await callChromeTool("select_page", { pageId: match.pageId });
  return { ...match, selected: true };
}

async function ensureSelectedPage() {
  const { pages, rawText } = await listPagesBestEffort();
  if (!pages.length) {
    throw new Error(
      `No pages found via list_pages. ${trimText(rawText)}`.trim()
    );
  }
  const selected = pages.find((page) => page.selected);
  const hints = resolveTargetHints({});
  const targetMatch = findTargetMatch(pages, hints);

  if (selected && isDevtoolsJsonPage(selected.url)) {
    if (targetMatch) {
      await callChromeTool("select_page", { pageId: targetMatch.pageId });
      return { ...targetMatch, selected: true };
    }
    warnOnlyDevtools(pages, hints);
    return selected;
  }

  if (selected) return selected;
  return selectPageByUrl(hints);
}

async function runEvalScript(functionSource) {
  await ensureSelectedPage();
  const result = await callChromeTool("evaluate_script", {
    function: functionSource
  });
  const text = extractTextContent(result);
  return { result, text, json: tryParseJson(text) };
}

function formatToolResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

async function handleHiListPages() {
  const { pages, ok, attempts, rawText } = await listPagesBestEffort();
  const payload = { pages, attempts };
  if (!ok) {
    payload.warning = "No pages parsed from list_pages output.";
    payload.rawText = trimText(rawText);
  }
  return formatToolResult(payload);
}

async function handleHiSelectPageByUrl(args) {
  const page = await selectPageByUrl(args || {});
  return formatToolResult(page);
}

async function handleHiEval(args) {
  if (!args || typeof args.function !== "string") {
    throw new Error("hi_eval requires { function: string }.");
  }
  const evalResult = await runEvalScript(args.function);
  const payload = { result: evalResult.result, text: evalResult.text };
  if (evalResult.json !== null) payload.json = evalResult.json;
  return formatToolResult(payload);
}

async function handleHiScreenshot(args) {
  await ensureSelectedPage();
  const fullPage = args?.fullPage ?? true;
  const { result, ok, attempts } = await callChromeToolWithValidationRetry(
    "take_screenshot",
    { fullPage },
    {
      timeoutMs: SCREENSHOT_TIMEOUT_MS,
      validate: (res) => Boolean(extractBase64FromToolResult(res).base64)
    }
  );

  const { base64, mimeType } = extractBase64FromToolResult(result);
  const payload = { base64, mimeType, fullPage, ok, attempts };
  if (!base64) {
    payload.error = "No base64 image data found in take_screenshot result.";
    payload.rawText = trimText(extractTextContent(result));
  }
  return formatToolResult(payload);
}

async function handleHiResizePage(args) {
  const width = Number(args?.width);
  const height = Number(args?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("hi_resize_page requires { width:number, height:number }.");
  }
  await ensureSelectedPage();
  await callChromeTool("resize_page", {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height))
  });
  return formatToolResult({
    ok: true,
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height))
  });
}

async function handleHiPanelGeo() {
  const evalResult = await runEvalScript(PANEL_GEO_SCRIPT);
  const payload =
    evalResult.json ??
    {
      text: evalResult.text,
      raw: evalResult.result
    };
  return formatToolResult(payload);
}

async function handleHiFlickerCapture(args) {
  const shots = normalizePositiveInt(args?.shots, SHOTS_DEFAULT);
  const delayMs = normalizeNonNegativeInt(args?.delayMs, DELAY_DEFAULT);
  const outDir = path.resolve(
    typeof args?.outDir === "string" && args.outDir.trim()
      ? args.outDir.trim()
      : FLICKER_OUT_DEFAULT
  );
  const urlContains =
    typeof args?.urlContains === "string" && args.urlContains.trim()
      ? args.urlContains.trim()
      : URL_CONTAINS_DEFAULT;

  ensureDir(outDir);
  await selectPageByUrl({ urlContains });

  const files = [];

  for (let i = 0; i < shots; i += 1) {
    const { result } = await callChromeToolWithValidationRetry(
      "take_screenshot",
      { fullPage: true },
      {
        timeoutMs: SCREENSHOT_TIMEOUT_MS,
        validate: (res) => Boolean(extractBase64FromToolResult(res).base64)
      }
    );

    const { base64 } = extractBase64FromToolResult(result);
    const fname = `shot_${String(i).padStart(2, "0")}.png`;
    const fpath = path.join(outDir, fname);

    if (!base64) {
      const rawName = `shot_${String(i).padStart(2, "0")}_raw.json`;
      const rawPath = path.join(outDir, rawName);
      fs.writeFileSync(rawPath, JSON.stringify(result, null, 2), "utf8");
      files.push({
        index: i,
        file: null,
        error: "No base64 found. Wrote raw json.",
        raw: rawName
      });
    } else {
      fs.writeFileSync(fpath, Buffer.from(base64, "base64"));
      files.push({ index: i, file: fname });
    }

    if (delayMs > 0 && i < shots - 1) {
      await sleep(delayMs);
    }
  }

  return formatToolResult({ outDir, count: shots, files });
}

const toolDefinitions = [
  {
    name: "hi_list_pages",
    description: "List browser pages and return parsed page metadata.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "hi_select_page_by_url",
    description:
      "Select a page by URL match (exact first, then contains, then selected).",
    inputSchema: {
      type: "object",
      properties: {
        urlContains: {
          type: "string",
          description: "Substring to match in the page URL."
        },
        urlExact: {
          type: "string",
          description: "Exact URL to match."
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "hi_eval",
    description: "Evaluate a function in the selected page context.",
    inputSchema: {
      type: "object",
      properties: {
        function: {
          type: "string",
          description: "JavaScript function source to evaluate."
        }
      },
      required: ["function"],
      additionalProperties: false
    }
  },
  {
    name: "hi_screenshot",
    description: "Capture a screenshot and return base64 data.",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: {
          type: "boolean",
          description: "Capture full page instead of the viewport."
        }
      },
      additionalProperties: false
    }
  },
  {
    name: "hi_resize_page",
    description: "Resize the browser viewport to a specific width/height.",
    inputSchema: {
      type: "object",
      properties: {
        width: { type: "number", description: "Viewport width in CSS pixels." },
        height: { type: "number", description: "Viewport height in CSS pixels." }
      },
      required: ["width", "height"],
      additionalProperties: false
    }
  },
  {
    name: "hi_panel_geo",
    description: "Return geometry and computed styles for .hi-inspector__panel.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "hi_flicker_capture",
    description: "Capture repeated screenshots and write PNGs to disk.",
    inputSchema: {
      type: "object",
      properties: {
        shots: { type: "number", description: "Number of screenshots." },
        delayMs: { type: "number", description: "Delay between shots in ms." },
        outDir: { type: "string", description: "Output directory." },
        urlContains: {
          type: "string",
          description: "URL substring to select the target page."
        }
      },
      additionalProperties: false
    }
  }
];

function setupShutdown() {
  let shuttingDown = false;
  const shutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (reason) {
      console.error(`Shutting down: ${reason}`);
    }
    chromeClient.close();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("exit", () => shutdown("exit"));
  process.on("uncaughtException", (err) => {
    console.error(err?.stack || err);
    shutdown("uncaughtException");
    process.exit(1);
  });
  process.on("unhandledRejection", (err) => {
    console.error(err);
    shutdown("unhandledRejection");
    process.exit(1);
  });
}

async function main() {
  await chromeClient.ensureReady();
  setupShutdown();

  const server = new Server(
    { name: "hitech-operator", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "hi_list_pages":
          return await handleHiListPages();
        case "hi_select_page_by_url":
          return await handleHiSelectPageByUrl(args);
        case "hi_eval":
          return await handleHiEval(args);
        case "hi_screenshot":
          return await handleHiScreenshot(args);
        case "hi_resize_page":
          return await handleHiResizePage(args);
        case "hi_panel_geo":
          return await handleHiPanelGeo();
        case "hi_flicker_capture":
          return await handleHiFlickerCapture(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      throw wrapDevtoolsError(err);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err?.stack || err);
  chromeClient.close();
  process.exit(1);
});
