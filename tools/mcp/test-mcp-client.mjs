import { spawn } from "node:child_process";
import process from "node:process";

const PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_TIMEOUT_MS = 15000;
const JSON_MODE = process.argv.includes("--json");

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
      this.proc.kill();
    }
  }
}

async function main() {
  const client = new McpStdioClient(
    "npm",
    ["run", "mcp:operator"],
    {
      stdio: ["pipe", "pipe", "inherit"],
      shell: true
    }
  );

  const shutdown = (reason) => {
    if (reason) {
      console.error(`Shutting down: ${reason}`);
    }
    client.close();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("exit", () => shutdown("exit"));

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
    shutdown("done");
  } catch (err) {
    shutdown(err?.message || err);
    process.exitCode = 1;
  }
}

main();
