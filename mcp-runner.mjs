import { spawn } from "node:child_process";

const TARGET_URL_CONTAINS = "localhost:5177/#/deck?s=2";
const IS_WIN = process.platform === "win32";
const NPX_CMD = IS_WIN ? "cmd.exe" : "npx";
const NPX_ARGS_PREFIX = IS_WIN ? ["/d", "/s", "/c", "npx"] : [];

const server = spawn(
  NPX_CMD,
  [
    ...NPX_ARGS_PREFIX,
    "-y",
    "chrome-devtools-mcp@latest",
    "--browser-url=http://127.0.0.1:9222"
  ],
  { stdio: ["pipe", "pipe", "inherit"] }
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
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

server.stdout.on("data", (buf) => {
  const lines = buf.toString("utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    // Solo aceptar líneas JSON-RPC (filtra logs del server)
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractPageListFromListPagesText(text) {
  // Ejemplo de texto:
  // "## Pages\n1: http://... [selected]\n2: http://..."
  // Regresa [{pageId: 1, url: "...", selected:true}, ...]
  const lines = (text || "").split("\n");
  const pages = [];
  const re = /^(\d+):\s+(https?:\/\/\S+)(\s+\[selected\])?$/i;

  for (const ln of lines) {
    const m = ln.trim().match(re);
    if (!m) continue;
    pages.push({
      pageId: Number(m[1]),
      url: m[2],
      selected: Boolean(m[3])
    });
  }
  return pages;
}

async function main() {
  // 1) initialize (MCP handshake)
  await rpc("initialize", {
    protocolVersion: "2024-11-05",
    clientInfo: { name: "mcp-runner", version: "1.0.0" },
    capabilities: {}
  });

  // 2) initialized notification (no id)
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  // 3) tools/list
  const toolsList = await rpc("tools/list", {});
  const tools = toolsList?.tools ?? [];
  console.log("TOOLS:", tools.map((t) => t.name));

  function tool(name) {
    const t = tools.find((x) => x.name === name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    return t.name;
  }

  // 4) list_pages
  const pagesRes = await rpc("tools/call", {
    name: tool("list_pages"),
    arguments: {}
  });

  console.log("PAGES (raw):", JSON.stringify(pagesRes, null, 2));

  const pagesText = pagesRes?.content?.find((c) => c.type === "text")?.text ?? "";
  const pages = extractPageListFromListPagesText(pagesText);

  if (!pages.length) {
    throw new Error("No pude parsear pages de list_pages. Pega aquí el output de PAGES para ajustarlo.");
  }

  // Elegir página
  const match =
    pages.find((p) => (p.url || "").includes(TARGET_URL_CONTAINS)) ||
    pages.find((p) => p.selected) ||
    pages[0];

  console.log("TARGET PAGE:", match);

  // 5) select_page (este server requiere pageId:number)
  const sel = await rpc("tools/call", {
    name: tool("select_page"),
    arguments: { pageId: match.pageId }
  });
  console.log("SELECT:", JSON.stringify(sel, null, 2));

  // 6) evaluate_script #1: resumen del inspector
  const evalInspector = await rpc("tools/call", {
    name: tool("evaluate_script"),
    arguments: {
      function: `() => {
        // Asegura estar en la URL correcta (solo para debug)
        const href = location.href;

        const el =
          document.querySelector('.hi-inspector') ||
          document.querySelector('[class*="hi-inspector"], [id*="hi-inspector"]') ||
          document.querySelector('[class*="inspector"], [id*="inspector"]');

        if (!el) {
          return { ok:false, href, reason:"NO_FOUND", note:"No encontré hi-inspector/inspector" };
        }

        const cs = getComputedStyle(el);
        return {
          ok:true,
          href,
          tag: el.tagName,
          id: el.id || "",
          class: (el.className || "").toString().slice(0, 220),
          computed: {
            display: cs.display,
            opacity: cs.opacity,
            visibility: cs.visibility,
            position: cs.position,
            zIndex: cs.zIndex,
            filter: cs.filter,
            backdropFilter: cs.backdropFilter,
            pointerEvents: cs.pointerEvents,
            transform: cs.transform
          }
        };
      }`
    }
  });
  console.log("EVAL_INSPECTOR:", JSON.stringify(evalInspector, null, 2));

  // 7) evaluate_script #2: escaneo de hijos para pointer-events
  const evalPointerEvents = await rpc("tools/call", {
    name: tool("evaluate_script"),
    arguments: {
      function: `() => {
        const root = document.querySelector(".hi-inspector");
        if (!root) {
          return { ok:false, reason:"NO_ROOT", note:"No existe .hi-inspector" };
        }

        const rootCS = getComputedStyle(root);

        const kids = Array.from(root.querySelectorAll("*"))
          .slice(0, 200)
          .map(el => {
            const cs = getComputedStyle(el);
            return {
              tag: el.tagName,
              id: el.id || "",
              class: (el.className || "").toString().slice(0, 160),
              pointerEvents: cs.pointerEvents,
              position: cs.position,
              zIndex: cs.zIndex
            };
          });

        const interactive = kids.filter(x => x.pointerEvents && x.pointerEvents !== "none");

        return {
          ok:true,
          rootPointerEvents: rootCS.pointerEvents,
          totalChildrenScanned: kids.length,
          interactiveCount: interactive.length,
          interactiveTop: interactive.slice(0, 25),
          sample: kids.slice(0, 25)
        };
      }`
    }
  });
  console.log("EVAL_POINTER_EVENTS:", JSON.stringify(evalPointerEvents, null, 2));

  // 8) screenshot (optional)
  if (tools.some((t) => t.name === "take_screenshot")) {
    const shot = await rpc("tools/call", {
      name: tool("take_screenshot"),
      arguments: { fullPage: true }
    });
    console.log("SCREENSHOT:", JSON.stringify(shot, null, 2));
  }

  await sleep(300);
  server.kill();
}

main().catch((e) => {
  console.error("ERROR:", e);
  server.kill();
});
