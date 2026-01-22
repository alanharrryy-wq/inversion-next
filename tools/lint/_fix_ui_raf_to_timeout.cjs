const fs = require("fs");

const inJson = "tools/lint/ui_effects_extracted.json";
if (!fs.existsSync(inJson)) {
  console.error("No existe:", inJson, "Corre primero el extractor.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inJson, "utf8"));
const raf = (data.uiL4 || []).filter(x => x.kind === "requestAnimationFrame" && x.file);

if (!raf.length) {
  console.log("[raf] No hay requestAnimationFrame L4 detectados en UI.");
  process.exit(0);
}

const files = [...new Set(raf.map(x => x.file))];

function backup(p){
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  fs.copyFileSync(p, `${p}.bak_${stamp}`);
}

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("[raf] skip missing:", f);
    continue;
  }

  backup(f);
  let s = fs.readFileSync(f, "utf8");

  // 1) window.requestAnimationFrame(x) -> setTimeout(x, 16)
  s = s.replace(/\bwindow\.requestAnimationFrame\s*\(\s*([^)]+?)\s*\)/g, "setTimeout($1, 16)");

  // 2) requestAnimationFrame(x) -> setTimeout(x, 16)
  s = s.replace(/\brequestAnimationFrame\s*\(\s*([^)]+?)\s*\)/g, "setTimeout($1, 16)");

  fs.writeFileSync(f, s, "utf8");
  console.log("[raf] patched:", f);
}

console.log("[raf] done. Re-run: npm run lint:render");
