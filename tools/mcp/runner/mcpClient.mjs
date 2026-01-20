import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 400;
const DEFAULT_MAX_BACKOFF_MS = 4000;
const IS_WIN = process.platform === "win32";
const NPM_CMD = IS_WIN ? "cmd.exe" : "npm";
const NPM_ARGS = IS_WIN
  ? ["/d", "/s", "/c", "npm", "run", "mcp:operator"]
  : ["run", "mcp:operator"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelayMs(attempt, base = DEFAULT_BACKOFF_MS) {
  const value = base * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(DEFAULT_MAX_BACKOFF_MS, value);
}

function safeJsonParse(text) {
  if (typeof text !== "string" || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

function extractToolJson(result) {
  const text = extractToolText(result);
  return safeJsonParse(text);
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

function isTimeoutError(err) {
  const msg = errorToString(err).toLowerCase();
  return msg.includes("timeout");
}

function isDevtoolsConnectionError(err) {
  const msg = errorToString(err).toLowerCase();
  return (
    msg.includes("devtools") ||
    msg.includes("9222") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("connection refused")
  );
}

function isPageSelectionError(err) {
  const msg = errorToString(err).toLowerCase();
  return (
    msg.includes("no pages found") ||
    msg.includes("no matching page") ||
    msg.includes("selected page")
  );
}

function urlMatchesHints(url, { urlExact, urlContains }) {
  if (typeof url !== "string") return false;
  if (urlExact && url === urlExact) return true;
  if (urlContains && url.includes(urlContains)) return true;
  return false;
}

function findMatchingPage(pages, hints) {
  if (!Array.isArray(pages)) return null;
  for (const page of pages) {
    if (urlMatchesHints(page?.url, hints)) return page;
  }
  return null;
}

function buildTargetUrl({ urlExact, urlContains }) {
  const raw = urlExact || urlContains || "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(localhost|127\.0\.0\.1)/i.test(raw)) return `http://${raw}`;
  return raw;
}

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    return;
  }
  try {
    proc.kill("SIGTERM");
  } catch {
    // ignore
  }
}

function resolveRepoRoot() {
  return process.cwd();
}

async function runNodeScript(scriptPath, { timeoutMs = 30000, logger } = {}) {
  const absPath = path.resolve(resolveRepoRoot(), scriptPath);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [absPath], {
      stdio: "inherit",
      cwd: resolveRepoRoot(),
      env: { ...process.env }
    });

    const timer = setTimeout(() => {
      killProcessTree(child);
      resolve({ ok: false, timeout: true });
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, timeout: false, code });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (logger) {
        logger.warn(`script error: ${errorToString(err)}`);
      }
      resolve({ ok: false, timeout: false, error: err });
    });
  });
}

export function createLogger({ prefix = "mcp", profile = "info" } = {}) {
  const tag = prefix ? `[${prefix}]` : "";
  const isDebug = profile === "debug";
  return {
    debug: (...args) => {
      if (isDebug) console.log(tag, ...args);
    },
    info: (...args) => console.log(tag, ...args),
    warn: (...args) => console.warn(tag, ...args),
    error: (...args) => console.error(tag, ...args),
    isDebug
  };
}

class McpStdioClient {
  constructor({
    command = NPM_CMD,
    args = NPM_ARGS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    profile = "info",
    logger,
    cwd
  } = {}) {
    this.command = command;
    this.args = args;
    this.cwd = cwd || resolveRepoRoot();
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.logger = logger || createLogger({ prefix: "mcp", profile });
    this.profile = profile;
    this.proc = null;
    this.buffer = "";
    this.nextId = 1;
    this.pending = new Map();
    this.initialized = false;
    this.initPromise = null;
    this.toolNames = [];
  }

  start() {
    if (this.proc) return;
    this.proc = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: this.cwd,
      env: { ...process.env }
    });
    this.proc.stdout.on("data", (buf) => this.handleData(buf));
    this.proc.stderr.on("data", (buf) => {
      const text = buf.toString("utf8").trim();
      if (text) this.logger.warn(text);
    });
    this.proc.on("error", (err) => {
      this.rejectAll(err);
      this.proc = null;
      this.initialized = false;
    });
    this.proc.on("exit", (code, signal) => {
      const msg = `operator exited (${signal || code || "unknown"})`;
      this.rejectAll(new Error(msg));
      this.proc = null;
      this.initialized = false;
    });
  }

  stop(reason) {
    if (this.proc && !this.proc.killed) {
      this.rejectAll(new Error(reason || "client stopped"));
      killProcessTree(this.proc);
    }
    this.proc = null;
    this.initialized = false;
    this.toolNames = [];
    this.initPromise = null;
  }

  async restart(reason) {
    this.logger.warn(`restarting MCP operator${reason ? `: ${reason}` : ""}`);
    this.stop(reason);
    await sleep(200);
    this.start();
  }

  send(payload) {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error("operator stdin not writable");
    }
    this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  handleData(buf) {
    this.buffer += buf.toString("utf8");
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!(trimmed.startsWith("{") && trimmed.includes("\"jsonrpc\""))) continue;

      const msg = safeJsonParse(trimmed);
      if (!msg || msg.jsonrpc !== "2.0") continue;

      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (timer) clearTimeout(timer);
        if (msg.error) {
          const err = new Error(msg.error.message || "RPC error");
          err.code = msg.error.code;
          err.data = msg.error.data;
          reject(err);
        } else {
          resolve(msg.result);
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

  notify(method, params = {}) {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async initialize() {
    this.start();
    await this.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: { name: "mcp-runner", version: "1.0.0" },
      capabilities: {}
    });
    this.notify("notifications/initialized", {});
    const tools = await this.rpc("tools/list", {});
    this.toolNames = Array.isArray(tools?.tools)
      ? tools.tools.map((tool) => tool.name)
      : [];
    this.initialized = true;
  }

  async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    const runInit = async () => {
      for (let attempt = 1; attempt <= this.retries + 1; attempt += 1) {
        try {
          await this.initialize();
          return;
        } catch (err) {
          const msg = errorToString(err);
          if (attempt <= this.retries) {
            this.logger.warn(`init attempt ${attempt} failed: ${msg}`);
            await this.restart("init failure");
            await sleep(backoffDelayMs(attempt));
            continue;
          }
          throw err;
        }
      }
    };

    this.initPromise = runInit().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  async ensureTools(required) {
    if (!Array.isArray(required) || required.length === 0) return;
    await this.ensureInitialized();
    const missing = required.filter((name) => !this.toolNames.includes(name));
    if (!missing.length) return;
    const tools = await this.rpc("tools/list", {});
    this.toolNames = Array.isArray(tools?.tools)
      ? tools.tools.map((tool) => tool.name)
      : [];
    const stillMissing = required.filter(
      (name) => !this.toolNames.includes(name)
    );
    if (stillMissing.length) {
      throw new Error(`Missing MCP tools: ${stillMissing.join(", ")}`);
    }
  }

  async callToolOnce(name, args, { timeoutMs } = {}) {
    await this.ensureInitialized();
    return this.rpc(
      "tools/call",
      { name, arguments: args || {} },
      { timeoutMs: timeoutMs ?? this.timeoutMs }
    );
  }

  async callTool(
    name,
    args = {},
    { timeoutMs = this.timeoutMs, retries = this.retries } = {}
  ) {
    let lastErr;
    for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
      try {
        return await this.callToolOnce(name, args, { timeoutMs });
      } catch (err) {
        lastErr = err;
        const msg = errorToString(err);
        if (isTimeoutError(err)) {
          await this.restart(`timeout on ${name}`);
        } else if (isDevtoolsConnectionError(err)) {
          this.logger.warn(`devtools error on ${name}: ${msg}`);
          await runNodeScript("tools/mcp/mcp-doctor.mjs", {
            timeoutMs: 45000,
            logger: this.logger
          });
          await this.restart(`devtools error on ${name}`);
        } else if (
          isPageSelectionError(err) &&
          name !== "hi_list_pages" &&
          name !== "hi_select_page_by_url"
        ) {
          await this.ensureTargetPage();
        }

        if (attempt <= retries) {
          this.logger.warn(`retrying ${name} (${attempt}/${retries + 1})`);
          await sleep(backoffDelayMs(attempt));
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr;
  }

  resolveUrlHints({ urlExact, urlContains } = {}) {
    const exact =
      typeof urlExact === "string" && urlExact.trim()
        ? urlExact.trim()
        : (process.env.HI_URL_EXACT || "").trim();
    const contains =
      typeof urlContains === "string" && urlContains.trim()
        ? urlContains.trim()
        : (process.env.HI_URL_CONTAINS || "").trim();
    return { urlExact: exact, urlContains: contains };
  }

  async tryNavigateTarget(targetUrl) {
    if (!targetUrl) return false;
    try {
      await this.callToolOnce(
        "hi_eval",
        {
          function: `() => { window.location.href = ${JSON.stringify(
            targetUrl
          )}; return { ok: true }; }`
        },
        { timeoutMs: Math.min(8000, this.timeoutMs) }
      );
      return true;
    } catch (err) {
      this.logger.warn(`hi_eval navigate failed: ${errorToString(err)}`);
      return false;
    }
  }

  async ensureTargetPage({ urlExact, urlContains } = {}) {
    const hints = this.resolveUrlHints({ urlExact, urlContains });
    const targetUrl = buildTargetUrl(hints);
    const args = {};
    if (hints.urlExact) {
      args.urlExact = hints.urlExact;
    } else if (hints.urlContains) {
      args.urlContains = hints.urlContains;
    }

    for (let attempt = 1; attempt <= this.retries + 1; attempt += 1) {
      let pages = [];
      try {
        const listResult = await this.callTool(
          "hi_list_pages",
          {},
          { retries: 0 }
        );
        const parsed = extractToolJson(listResult);
        if (Array.isArray(parsed?.pages)) pages = parsed.pages;
      } catch (err) {
        this.logger.warn(`hi_list_pages failed: ${errorToString(err)}`);
      }

      if (!pages.length) {
        await runNodeScript("tools/mcp/mcp-open-target.mjs", {
          timeoutMs: 20000,
          logger: this.logger
        });
        await this.tryNavigateTarget(targetUrl);
        await sleep(backoffDelayMs(attempt));
        continue;
      }

      if ((hints.urlExact || hints.urlContains) && !findMatchingPage(pages, hints)) {
        this.logger.warn(
          `No page matches urlExact/urlContains; opening target and retrying.`
        );
        await runNodeScript("tools/mcp/mcp-open-target.mjs", {
          timeoutMs: 20000,
          logger: this.logger
        });
        await this.tryNavigateTarget(targetUrl);
        await sleep(backoffDelayMs(attempt));
        continue;
      }

      try {
        const selectResult = await this.callTool(
          "hi_select_page_by_url",
          args,
          { retries: 0 }
        );
        const selected = extractToolJson(selectResult) || {};
        if (
          (hints.urlExact || hints.urlContains) &&
          !urlMatchesHints(selected.url, hints)
        ) {
          this.logger.warn(
            `Selected page does not match urlExact/urlContains (${selected.url || "unknown"}). Retrying.`
          );
          await runNodeScript("tools/mcp/mcp-open-target.mjs", {
            timeoutMs: 20000,
            logger: this.logger
          });
          await this.tryNavigateTarget(targetUrl);
          await sleep(backoffDelayMs(attempt));
          continue;
        }
        return selected;
      } catch (err) {
        this.logger.warn(`hi_select_page_by_url failed: ${errorToString(err)}`);
        await runNodeScript("tools/mcp/mcp-open-target.mjs", {
          timeoutMs: 20000,
          logger: this.logger
        });
        await sleep(backoffDelayMs(attempt));
      }
    }

    throw new Error("Unable to select target page after retries.");
  }

  async bootstrap({ requiredTools = [] } = {}) {
    await this.ensureInitialized();
    await this.ensureTools(requiredTools);
    await this.ensureTargetPage();
  }

  close() {
    this.stop("client closed");
  }
}

export {
  McpStdioClient,
  extractToolJson,
  extractToolText,
  sleep,
  safeJsonParse,
  errorToString
};
