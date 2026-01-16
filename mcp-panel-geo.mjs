import { spawn } from "node:child_process";

const server = spawn(
  "npx.cmd",
  ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"],
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

function extractPageListFromListPagesText(text) {
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

async function main() {
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    clientInfo: { name: "mcp-panel-geo", version: "1.0.0" },
    capabilities: {}
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const toolsList = await rpc("tools/list", {});
  const tools = toolsList?.tools ?? [];
  const has = (name) => tools.some(t => t.name === name);
  const tool = (name) => {
    const t = tools.find(x => x.name === name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    return t.name;
  };

  if (!has("list_pages") || !has("select_page") || !has("evaluate_script")) {
    throw new Error("Faltan tools básicas (list_pages/select_page/evaluate_script).");
  }

  const pagesRes = await rpc("tools/call", { name: tool("list_pages"), arguments: {} });
  const pagesText = pagesRes?.content?.find(c => c.type === "text")?.text ?? "";
  const pages = extractPageListFromListPagesText(pagesText);

  const match =
    pages.find(p => (p.url || "").includes("localhost:5177/#/deck?s=2")) ||
    pages.find(p => p.selected) ||
    pages[0];

  if (!match) throw new Error("No encontré ninguna page.");

  await rpc("tools/call", { name: tool("select_page"), arguments: { pageId: match.pageId } });

  const geoRes = await rpc("tools/call", {
    name: tool("evaluate_script"),
    arguments: {
      function: `() => {
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
      }`
    }
  });

  console.log("PANEL_GEO:", JSON.stringify(geoRes, null, 2));

  if (has("take_screenshot")) {
    const shot = await rpc("tools/call", { name: tool("take_screenshot"), arguments: { fullPage: true } });
    console.log("SCREENSHOT:", JSON.stringify(shot, null, 2));
  }

  server.kill();
}

main().catch((e) => {
  console.error("ERROR:", e);
  server.kill();
});
