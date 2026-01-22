const fs = require("fs");

const inJson = "tools/lint/ui_effects_extracted.json";
if (!fs.existsSync(inJson)) {
  console.error("No existe:", inJson, "Corre primero el extractor.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inJson, "utf8"));
const anim = (data.uiL4 || []).filter(x => x.kind === "animation" && x.file);

if (!anim.length) {
  console.log("[anim] No hay animation L4 detectados en UI.");
  process.exit(0);
}

const files = [...new Set(anim.map(x => x.file))];

function backup(p){
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  fs.copyFileSync(p, `${p}.bak_${stamp}`);
}

function stripKeyframes(css){
  // Quita bloques @keyframes ... { ... } con conteo de llaves
  let out = "";
  let i = 0;
  while (i < css.length) {
    const idx = css.indexOf("@keyframes", i);
    if (idx === -1) { out += css.slice(i); break; }
    out += css.slice(i, idx);

    // busca la primera llave {
    const braceStart = css.indexOf("{", idx);
    if (braceStart === -1) break;

    let depth = 0;
    let j = braceStart;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") {
        depth--;
        if (depth === 0) { j++; break; }
      }
    }
    i = j; // salta todo el bloque
  }
  return out;
}

for (const f of files) {
  if (!fs.existsSync(f)) { console.log("[anim] skip missing:", f); continue; }
  backup(f);

  let s = fs.readFileSync(f, "utf8");

  // 1) Quita líneas con animation:
  s = s.replace(/^\s*animation\s*:\s*[^;]*;\s*$/gmi, "");

  // 2) Quita @keyframes blocks
  s = stripKeyframes(s);

  // Limpia líneas vacías múltiples
  s = s.replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(f, s, "utf8");
  console.log("[anim] patched:", f);
}

console.log("[anim] done. Re-run: npm run lint:render");
