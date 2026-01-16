import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = process.env.HI_FLICKER_OUT || path.resolve("tools/mcp/_flicker_out");
const URL_CONTAINS = process.env.HI_URL_CONTAINS || "localhost:5177/#/deck?s=2";
const BROWSER_URL = process.env.HI_BROWSER_URL || "http://127.0.0.1:9222";
const SHOTS = Number(process.env.HI_SHOTS || "12");
const DELAY_MS = Number(process.env.HI_DELAY_MS || "180");

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
ensureDir(OUT_DIR);

const server = spawn(
  "npx.cmd",
  ["-y", "chrome-devtools-mcp@latest", `--browser-url=${BROWSER_URL}`],
  { stdio: ["pipe", "pipe", "inherit"], shell: true }
);

let nextId = 1;
const pending = new Map();

function send(msg) {
  server.stdin.write(JSON.stringify(msg) + "\n");
}

function rpc(method, params = {}) {
  const id = nextId++;
  send({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

server.stdout.on("data", (buf) => {
  const lines = buf.toString("utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    if (!(line.startsWith("{") && line.includes("\"jsonrpc\""))) continue;
    const obj = safeJsonParse(line);
    if (!obj) continue;

    if (obj.id && pending.has(obj.id)) {
      const { resolve, reject } = pending.get(obj.id);
      pending.delete(obj.id);
      if (obj.error) reject(obj.error);
      else resolve(obj.result);
    }
  }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractPages(text) {
  const lines = (text || "").split("\n");
  const pages = [];
  const re = /^(\d+):\s+(https?:\/\/\S+)(\s+\[selected\])?$/i;
  for (const ln of lines) {
    const m = ln.trim().match(re);
    if (!m) continue;
    pages.push({ pageId: Number(m[1]), url: m[2], selected: Boolean(m[3]) });
  }
  return pages;
}

function extractBase64FromToolResult(res) {
  // Typical patterns:
  // - content: [{type:"image", data:"...base64..."}]
  // - content: [{type:"text", text:"...data:image/png;base64,AAA..."}]
  const content = res?.content || [];

  for (const c of content) {
    if (c?.type === "image" && typeof c?.data === "string" && c.data.length > 200) {
      return c.data;
    }
  }

  for (const c of content) {
    if (c?.type === "text" && typeof c?.text === "string") {
      const t = c.text;
      const marker = "data:image/png;base64,";
      const idx = t.indexOf(marker);
      if (idx >= 0) {
        return t.slice(idx + marker.length).trim();
      }
      // sometimes plain base64 fenced
      const b64 = t.match(/[A-Za-z0-9+/=]{500,}/);
      if (b64) return b64[0];
    }
  }
  return null;
}

async function main() {
  const startedAt = new Date().toISOString();
  const metaPath = path.join(OUT_DIR, "meta.json");

  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    clientInfo: { name: "hi-flicker-capture", version: "1.0.0" },
    capabilities: {}
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const toolsList = await rpc("tools/list", {});
  const tools = toolsList?.tools ?? [];
  const tool = (name) => {
    const t = tools.find(x => x.name === name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    return t.name;
  };

  const pagesRes = await rpc("tools/call", { name: tool("list_pages"), arguments: {} });
  const pagesText = pagesRes?.content?.find(c => c.type === "text")?.text ?? "";
  const pages = extractPages(pagesText);
  const match =
    pages.find(p => (p.url || "").includes(URL_CONTAINS)) ||
    pages.find(p => p.selected) ||
    pages[0];

  if (!match) throw new Error("No pages found via list_pages.");

  await rpc("tools/call", { name: tool("select_page"), arguments: { pageId: match.pageId } });

  const meta = {
    startedAt,
    outDir: OUT_DIR,
    urlContains: URL_CONTAINS,
    browserUrl: BROWSER_URL,
    pageSelected: match,
    shots: SHOTS,
    delayMs: DELAY_MS,
    files: []
  };

  for (let i = 0; i < SHOTS; i++) {
    const shotRes = await rpc("tools/call", {
      name: tool("take_screenshot"),
      arguments: { fullPage: true }
    });

    const b64 = extractBase64FromToolResult(shotRes);
    const fname = `shot_${String(i).padStart(2, "0")}.png`;
    const fpath = path.join(OUT_DIR, fname);

    if (!b64) {
      // dump raw response for debugging
      const rawPath = path.join(OUT_DIR, `shot_${String(i).padStart(2, "0")}_raw.json`);
      fs.writeFileSync(rawPath, JSON.stringify(shotRes, null, 2), "utf8");
      meta.files.push({ i, fname: null, error: "No base64 found. Wrote raw json.", raw: path.basename(rawPath) });
    } else {
      fs.writeFileSync(fpath, Buffer.from(b64, "base64"));
      meta.files.push({ i, fname });
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
  console.log("CAPTURE_DONE:", metaPath);

  server.kill();
}

main().catch((e) => {
  console.error("CAPTURE_ERROR:", e?.stack || e);
  server.kill();
});
