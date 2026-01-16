import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const SRC = path.join(repoRoot, "src");

const outDocs = path.join(repoRoot, "docs/render/Slide02.inventory.json");
const outPublic = path.join(repoRoot, "public/hi/Slide02.inventory.json");

const SLIDE_ID = "slide-02";
const TSX_ENTRY = "src/slides/slide-02/ui/Slide02.tsx";

const read = (p) => {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
};

const isDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory();

const walk = (dir, acc=[]) => {
  for (const it of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, it.name);
    const n = p.replace(/\\/g,"/");
    if (n.includes("/node_modules/") || n.includes("/.git/") || n.includes("/dist/") || n.includes("/build/") || n.includes("/.vite/")) continue;
    if (it.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
};

const pickFiles = () => {
  if (!isDir(SRC)) throw new Error("No existe src/");
  return walk(SRC).filter(f => /\.(ts|tsx|css)$/.test(f));
};

const rel = (p) => path.relative(repoRoot, p).replace(/\\/g,"/");

const addUnique = (arr, v) => { if (!arr.includes(v)) arr.push(v); };

const parseImports = (file, text) => {
  const out = new Set();
  const patterns = [
    /import\s+(?:type\s+)?[^'"]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /import\s*['"]([^'"]+)['"]/g,
    /export\s+\*\s+from\s*['"]([^'"]+)['"]/g,
    /export\s+\{[^}]*\}\s+from\s*['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) out.add(m[1]);
  }
  if (file.endsWith(".css")) {
    const re = /@import\s+(?:url\()?\s*['"]([^'"]+)['"]\s*\)?\s*;/g;
    let m;
    while ((m = re.exec(text))) out.add(m[1]);
  }
  return [...out];
};

const resolveNoExt = (base) => {
  const exts = [".ts",".tsx",".js",".jsx",".mjs",".cjs",".css",".json"];
  const tries = [];
  if (path.extname(base)) tries.push(base);
  else {
    for (const e of exts) tries.push(base + e);
    for (const e of exts) tries.push(path.join(base, "index" + e));
  }
  for (const t of tries) {
    if (fs.existsSync(t) && fs.statSync(t).isFile()) return t;
  }
  return null;
};

const resolveSpec = (spec, fromFile) => {
  if (!spec) return null;
  if (/^(https?:)?\/\//.test(spec)) return null;
  if (/^data:/.test(spec)) return null;
  if (/^node:/.test(spec)) return null;
  if (/^virtual:/.test(spec)) return null;

  if (spec.startsWith("@/")) {
    const base = path.join(repoRoot, "src", spec.slice(2));
    return resolveNoExt(base);
  }
  if (spec.startsWith("./") || spec.startsWith("../")) {
    const base = path.resolve(path.dirname(fromFile), spec);
    return resolveNoExt(base);
  }
  return null;
};

const main = () => {
  const files = pickFiles();

  const inventory = {
    meta: {
      generatedAt: new Date().toISOString(),
      slideId: "slide-02",
      entry: TSX_ENTRY,
    },
    graph: {
      nodes: [],
      edges: [],
    },
    signals: {
      dataAttrs: {},
      hiClasses: {},
      tokens: {},
    },
    slide02: {
      files: [],
      domSignals: {
        dataAttrsUsed: [],
        hiClassesUsed: [],
        tokensMentioned: [],
      },
    },
    problems: [],
  };

  // Build node set & scan signals
  const fileText = new Map();
  for (const f of files) {
    const t = read(f);
    fileText.set(f, t);
    inventory.graph.nodes.push(rel(f));

    // tokens
    for (const m of t.matchAll(/--hi-[a-zA-Z0-9-]+/g)) {
      const tok = m[0];
      inventory.signals.tokens[tok] ??= { files: [] };
      addUnique(inventory.signals.tokens[tok].files, rel(f));
    }

    // data attrs (any data-xxx)
    for (const m of t.matchAll(/data-[a-zA-Z0-9-]+/g)) {
      const da = m[0];
      inventory.signals.dataAttrs[da] ??= { files: [] };
      addUnique(inventory.signals.dataAttrs[da].files, rel(f));
    }

    // hi- classes in css selectors or jsx class strings
    for (const m of t.matchAll(/hi-[a-zA-Z0-9-]+/g)) {
      const hc = m[0];
      inventory.signals.hiClasses[hc] ??= { files: [] };
      addUnique(inventory.signals.hiClasses[hc].files, rel(f));
    }
  }

  // Find Slide02 entry and walk deps (imports graph) starting from entry + index
  const seeds = [
    path.join(repoRoot, "src/slides/slide-02/ui/Slide02.tsx"),
    path.join(repoRoot, "src/slides/slide-02/index.ts"),
  ].filter(p => fs.existsSync(p));

  if (!seeds.length) {
    inventory.problems.push("No encontré seeds de Slide02 (src/slides/slide-02/...). ¿Existe en tu branch actual?");
  }

  const visited = new Set();
  const q = [...seeds];

  while (q.length) {
    const f = q.shift();
    if (!f) continue;
    if (visited.has(f)) continue;
    visited.add(f);

    const t = fileText.get(f) ?? read(f);
    inventory.slide02.files.push(rel(f));

    // dom signals (solo del TSX principal ayuda mucho)
    if (rel(f) === TSX_ENTRY || t.includes(SLIDE_ID)) {
      for (const m of t.matchAll(/data-[a-zA-Z0-9-]+/g)) addUnique(inventory.slide02.domSignals.dataAttrsUsed, m[0]);
      for (const m of t.matchAll(/hi-[a-zA-Z0-9-]+/g)) addUnique(inventory.slide02.domSignals.hiClassesUsed, m[0]);
      for (const m of t.matchAll(/--hi-[a-zA-Z0-9-]+/g)) addUnique(inventory.slide02.domSignals.tokensMentioned, m[0]);
    }

    const specs = parseImports(rel(f), t);
    for (const spec of specs) {
      const dep = resolveSpec(spec, f);
      if (!dep) continue;
      inventory.graph.edges.push({ from: rel(f), to: rel(dep), spec });
      if (!visited.has(dep)) q.push(dep);
    }
  }

  // Basic problems: attrs used but no CSS mentions
  for (const da of inventory.slide02.domSignals.dataAttrsUsed) {
    const filesMention = inventory.signals.dataAttrs[da]?.files ?? [];
    if (!filesMention.length) inventory.problems.push(`Attr ${da} usado por Slide02 pero no aparece en escaneo (raro).`);
  }

  fs.mkdirSync(path.dirname(outDocs), { recursive: true });
  fs.mkdirSync(path.dirname(outPublic), { recursive: true });

  const json = JSON.stringify(inventory, null, 2);
  fs.writeFileSync(outDocs, json, "utf8");
  fs.writeFileSync(outPublic, json, "utf8");

  console.log("OK docs:", outDocs);
  console.log("OK public:", outPublic);
  console.log("Slide02 files:", inventory.slide02.files.length);
  console.log("Nodes:", inventory.graph.nodes.length, "Edges:", inventory.graph.edges.length);
  if (inventory.problems.length) {
    console.log("Problems:");
    for (const p of inventory.problems) console.log(" -", p);
  }
};

main();
