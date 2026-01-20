import { spawn } from "node:child_process";
import process from "node:process";

const PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_TIMEOUT_MS = 15000;
const JSON_MODE = process.argv.includes("--json");
const IS_WIN = process.platform === "win32";
const NPM_CMD = IS_WIN ? "cmd.exe" : "npm";
const NPM_ARGS = IS_WIN
  ? ["/d", "/s", "/c", "npm", "run", "mcp:operator"]
  : ["run", "mcp:operator"];

function logInfo(...args) {
  if (!JSON_MODE) {
    console.log(...args);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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

class McpStdioClient {
  constructor(command, args, options) {
    this.command = command;
    this.args = args;
    this.options = options;
    this.proc = null;
    this.buffer = "";
    this.nextId = 1;
    this.pending = new Map();
  }

  start() {
    if (this.proc) return;
    this.proc = spawn(this.command, this.args, this.options);
    this.proc.stdout.on("data", (buf) => this.handleData(buf));
    this.proc.on("error", (err) => this.rejectAll(err));
    this.proc.on("exit", (code, signal) => {
      const msg = `Child exited (${signal || code || "unknown"})`;
      this.rejectAll(new Error(msg));
    });
  }

  send(payload) {
    if (!this.proc || !this.proc.stdin.writable) {
      throw new Error("Child stdin not writable");
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
        clearTimeout(timer);
        if (msg.error) {
          reject(new Error(msg.error.message || "RPC error"));
        } else {
          resolve(msg.result);
        }
      }
    }
  }

  rejectAll(err) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
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

  close() {
    if (this.proc && !this.proc.killed) {
      this.rejectAll(new Error("Client closed"));
      killProcessTree(this.proc);
    }
  }
}

async function main() {
  const client = new McpStdioClient(
    NPM_CMD,
    NPM_ARGS,
    {
      stdio: ["pipe", "pipe", "inherit"]
    }
  );

  let shuttingDown = false;
  const shutdown = async (reason, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (reason) {
      console.error(`Shutting down: ${reason}`);
    }
    client.close();
    await sleep(200);
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown("SIGINT", 1));
  process.on("SIGTERM", () => shutdown("SIGTERM", 1));

  try {
    client.start();

    await client.rpc("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      clientInfo: { name: "test-mcp-client", version: "1.0.0" },
      capabilities: {}
    });
    client.notify("notifications/initialized", {});

    const toolsList = await client.rpc("tools/list", {});
    const toolNames = (toolsList?.tools || []).map((t) => t.name);
    logInfo("TOOLS:", toolNames);

    const urlExact = (process.env.HI_URL_EXACT || "").trim();
    const urlContains = (process.env.HI_URL_CONTAINS || "").trim();

    if (urlExact || urlContains) {
      try {
        await client.rpc("tools/call", {
          name: "hi_select_page_by_url",
          arguments: {
            urlExact: urlExact || undefined,
            urlContains: urlContains || undefined
          }
        });
      } catch (error) {
        logInfo("Select page warning:", error?.message || error);
      }
    }

    const listPages = await client.rpc("tools/call", {
      name: "hi_list_pages",
      arguments: {}
    });
    if (JSON_MODE) {
      process.stdout.write(
        `${JSON.stringify({ tools: toolNames, hiListPages: listPages })}\n`
      );
    } else {
      console.log("HI_LIST_PAGES:", JSON.stringify(listPages, null, 2));
    }

    await sleep(200);
    await shutdown("done", 0);
  } catch (err) {
    await shutdown(err?.message || err, 1);
  }
}

main();
