const fs = require("fs");

const p = "tools/docs/generate_index.mjs";
let s = fs.readFileSync(p, "utf8");

// 1) Constantes Health (después de TERMS_FILE)
if (!s.includes("RENDER_REPORT")) {
  s = s.replace(
    'const TERMS_FILE = path.join(ROOT, "docs", "_meta", "terms.json");',
    'const TERMS_FILE = path.join(ROOT, "docs", "_meta", "terms.json");\n\n' +
    'const RENDER_REPORT = path.join(ROOT, "tools", "lint", "render_policy_report.json");\n' +
    'const HEALTH_START = "<!-- HEALTH:START -->";\n' +
    'const HEALTH_END = "<!-- HEALTH:END -->";'
  );
}

// Helpers
function ensureHelpers(src) {
  if (src.includes("function tryReadJson")) return src;

  return src.replace(
    "function loadTerms() {",
    'function tryReadJson(filePath) {\n' +
      '  if (!fs.existsSync(filePath)) return null;\n' +
      '  try { return JSON.parse(readText(filePath)); } catch { return null; }\n' +
      '}\n\n' +
      'function escapeRegex(str) {\n' +
      '  return String(str).replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\n' +
      '}\n\n' +
      'function extractExistingHealthBlock(prevIndexText) {\n' +
      '  if (!prevIndexText) return null;\n' +
      '  const re = new RegExp(`${escapeRegex(HEALTH_START)}[\\s\\S]*?${escapeRegex(HEALTH_END)}`, "m");\n' +
      '  const m = prevIndexText.match(re);\n' +
      '  return m ? m[0] : null;\n' +
      '}\n\n' +
      'function safeCell(x) {\n' +
      '  return String(x ?? "").replace(/\\|/g, "\\\\|").trim();\n' +
      '}\n\n' +
      'function buildHealthBlockFromReport(report) {\n' +
      '  const lines = [];\n' +
      '  lines.push(HEALTH_START);\n' +
      '  lines.push("## 🩺 Salud del Sistema");\n' +
      '  lines.push("");\n' +
      '  lines.push("| Área | Estado | Detalle |");\n' +
      '  lines.push("|---|---:|---|");\n\n' +
      '  if (!report || !report.surfaces) {\n' +
      '    lines.push("| render | 📝 | Sin reporte. Corre `npm run lint:render` para generar `tools/lint/render_policy_report.json`. |");\n' +
      '    lines.push(HEALTH_END);\n' +
      '    return lines.join("\\n");\n' +
      '  }\n\n' +
      '  const names = Object.keys(report.surfaces).sort();\n' +
      '  for (const name of names) {\n' +
      '    const surf = report.surfaces[name] || {};\n' +
      '    const l3 = Number.isFinite(Number(surf.l3Count)) ? Number(surf.l3Count) : 0;\n' +
      '    const l4 = Number.isFinite(Number(surf.l4Count)) ? Number(surf.l4Count) : 0;\n' +
      '    const score = Number.isFinite(Number(surf.score)) ? Number(surf.score) : null;\n' +
      '    const budget = Number.isFinite(Number(surf.scoreBudget)) ? Number(surf.scoreBudget) : null;\n\n' +
      '    let state = "🟢";\n' +
      '    if (l4 > 0) state = "🔴";\n' +
      '    else if (l3 > 0) state = "🟡";\n' +
      '    else if (score !== null && budget !== null && score > budget) state = "🟡";\n\n' +
      '    const parts = [];\n' +
      '    if (score !== null && budget !== null) parts.push(`score ${score} / budget ${budget}`);\n' +
      '    if (l3 > 0) parts.push(`L3=${l3}`);\n' +
      '    if (l4 > 0) parts.push(`L4=${l4}`);\n' +
      '    if (surf.maxLevelUsed) parts.push(`maxUsed=${surf.maxLevelUsed}`);\n' +
      '    if (surf.maxLevelAllowed) parts.push(`maxAllowed=${surf.maxLevelAllowed}`);\n' +
      '    const detail = parts.length ? safeCell(parts.join(" · ")) : "sin violaciones";\n\n' +
      '    lines.push(`| ${safeCell(name)} | ${state} | ${detail} |`);\n' +
      '  }\n\n' +
      '  lines.push(HEALTH_END);\n' +
      '  return lines.join("\\n");\n' +
      '}\n\n' +
      "function loadTerms() {"
  );
}

s = ensureHelpers(s);

// 2) Firma generateIndexMd(items) -> (items, prevIndexText)
s = s.replace("function generateIndexMd(items) {", "function generateIndexMd(items, prevIndexText) {");

// 3) Inyectar Health block antes del loop de áreas (buscamos el patrón original)
if (!s.includes("const report = tryReadJson(RENDER_REPORT);")) {
  s = s.replace(
    "  lines.push(`---`);\n  lines.push(``);\n\n  for (const area of AREA_ORDER) {",
    "  lines.push(`---`);\n  lines.push(``);\n\n" +
      "  const report = tryReadJson(RENDER_REPORT);\n" +
      "  const prevHealth = extractExistingHealthBlock(prevIndexText);\n" +
      "  const healthBlock = report ? buildHealthBlockFromReport(report) : (prevHealth || buildHealthBlockFromReport(null));\n" +
      "  lines.push(healthBlock);\n" +
      "  lines.push(``);\n" +
      "  lines.push(`---`);\n" +
      "  lines.push(``);\n\n" +
      "  for (const area of AREA_ORDER) {"
  );
}

// 4) main(): pasar prevIndexText
if (!s.includes("const prevIndexText")) {
  s = s.replace(
    "  const items = collectDocs();\n  const indexMd = generateIndexMd(items);\n  fs.writeFileSync(OUTPUT_INDEX, indexMd, \"utf8\");",
    "  const prevIndexText = fs.existsSync(OUTPUT_INDEX) ? readText(OUTPUT_INDEX) : \"\";\n\n" +
      "  const items = collectDocs();\n" +
      "  const indexMd = generateIndexMd(items, prevIndexText);\n" +
      "  fs.writeFileSync(OUTPUT_INDEX, indexMd, \"utf8\");"
  );
}

fs.writeFileSync(p, s, "utf8");
console.log('[patch] generate_index.mjs actualizado: HEALTH automático');
