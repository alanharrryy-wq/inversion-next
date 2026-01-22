const fs = require("fs");
const path = require("path");

const reportPath = path.join("tools","lint","render_policy_report.json");
if (!fs.existsSync(reportPath)) {
  console.error("No existe:", reportPath);
  process.exit(1);
}

const r = JSON.parse(fs.readFileSync(reportPath, "utf8"));

function isObj(x){ return x && typeof x === "object" && !Array.isArray(x); }

const hits = [];
const stack = [{v:r, p:"root"}];

while (stack.length) {
  const {v, p} = stack.pop();
  if (!v) continue;

  if (Array.isArray(v)) {
    for (let i=v.length-1; i>=0; i--) stack.push({v:v[i], p:`${p}[${i}]`});
    continue;
  }

  if (isObj(v)) {
    // Detecta "effect-like" objects
    if (typeof v.level === "string" && typeof v.surface === "string") {
      hits.push({
        surface: v.surface,
        level: String(v.level).trim(),
        kind: v.kind ?? v.type ?? "",
        score: v.score ?? null,
        file: v.file ?? null,
        line: v.line ?? null,
        detail: v.detail ?? v.message ?? "",
        _path: p
      });
    }

    const keys = Object.keys(v);
    for (let i=keys.length-1; i>=0; i--) {
      const k = keys[i];
      stack.push({v:v[k], p:`${p}.${k}`});
    }
  }
}

// Filtra UI
const ui = hits.filter(x => x.surface === "ui");
const uiL4 = ui.filter(x => x.level === "L4");
const uiL3 = ui.filter(x => x.level === "L3");

function topBy(arr, key){
  const m = new Map();
  for (const x of arr) {
    const k = x[key] ?? "(null)";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
}

function mdTable(rows){
  const lines = [];
  lines.push("| Level | Kind | Score | File | Line | Detail |");
  lines.push("|---|---|---:|---|---:|---|");
  for (const x of rows) {
    const f = x.file ?? "(null)";
    const ln = x.line ?? "";
    const sc = x.score ?? "";
    const det = String(x.detail ?? "").replace(/\|/g,"\\|");
    lines.push(`| ${x.level} | ${x.kind} | ${sc} | ${f} | ${ln} | ${det} |`);
  }
  return lines.join("\n");
}

const outDir = path.join("tools","lint");
const outJson = path.join(outDir, "ui_effects_extracted.json");
const outMd   = path.join(outDir, "ui_effects_extracted.md");

const payload = {
  generatedAt: new Date().toISOString(),
  summary: {
    uiL4: uiL4.length,
    uiL3: uiL3.length,
    uiAll: ui.length
  },
  topFilesL4: topBy(uiL4, "file"),
  topKindsL4: topBy(uiL4, "kind"),
  topFilesL3: topBy(uiL3, "file"),
  topKindsL3: topBy(uiL3, "kind"),
  uiL4,
  uiL3
};

fs.writeFileSync(outJson, JSON.stringify(payload, null, 2), "utf8");

let md = "";
md += `# UI Effects Extracted\n\n`;
md += `Generated: ${payload.generatedAt}\n\n`;
md += `## Summary\n`;
md += `- UI L4: ${payload.summary.uiL4}\n`;
md += `- UI L3: ${payload.summary.uiL3}\n`;
md += `- UI Total: ${payload.summary.uiAll}\n\n`;

md += `## Top L4 Files\n`;
md += payload.topFilesL4.map(([k,c])=>`- ${c} · ${k}`).join("\n") + "\n\n";

md += `## Top L4 Kinds\n`;
md += payload.topKindsL4.map(([k,c])=>`- ${c} · ${k}`).join("\n") + "\n\n";

md += `## L4 Details (first 120)\n\n`;
md += mdTable(uiL4.slice(0,120)) + "\n\n";

md += `## L3 Details (first 120)\n\n`;
md += mdTable(uiL3.slice(0,120)) + "\n";

fs.writeFileSync(outMd, md, "utf8");

console.log("[extract] UI L4 =", uiL4.length, "UI L3 =", uiL3.length);
console.log("[extract] wrote:", outJson);
console.log("[extract] wrote:", outMd);
