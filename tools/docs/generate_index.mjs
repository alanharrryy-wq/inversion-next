#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const DOCS_DIRS = ["docs"];

const OUTPUT_INDEX = path.join(ROOT, "docs", "INDEX.md");
const OUTPUT_GLOSSARY = path.join(ROOT, "docs", "GLOSSARY.md");
const TERMS_FILE = path.join(ROOT, "docs", "_meta", "terms.json");

const RENDER_REPORT = path.join(ROOT, "tools", "lint", "render_policy_report.json");
const HEALTH_START = "<!-- HEALTH:START -->";
const HEALTH_END = "<!-- HEALTH:END -->";

const AREA_ORDER = ["policies", "architecture", "slides", "tooling", "runbooks", "notes", "other"];

const AREA_TITLES = {
  policies: "📜 Políticas",
  architecture: "🏗️ Arquitectura",
  slides: "🖼️ Slides",
  tooling: "🧰 Tooling",
  runbooks: "🧪 Runbooks",
  notes: "📝 Notas",
  other: "📦 Otros",
};

const STATUS_EMOJI = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
  draft: "📝",
  archived: "📦",
};

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      const base = path.basename(p);
      if (base === "node_modules" || base === "dist" || base === "build" || base === ".git") continue;
      out.push(...walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseFrontmatter(md) {
  if (!md.startsWith("---")) return { data: null, body: md };

  const end = md.indexOf("\n---", 3);
  if (end === -1) return { data: null, body: md };

  const raw = md.slice(3, end).trim();
  const body = md.slice(end + 4).trimStart();

  const data = {};
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();

    if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      data[key] = inner ? inner.split(",").map((s) => s.trim()).filter(Boolean) : [];
    } else {
      val = val.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      data[key] = val;
    }
  }

  return { data, body };
}

function toRepoRelative(p) {
  return p.replace(ROOT + path.sep, "").split(path.sep).join("/");
}

function fileMtimeISO(p) {
  const stat = fs.statSync(p);
  return new Date(stat.mtimeMs).toISOString().slice(0, 10);
}

function normalizeArea(area) {
  if (!area) return "other";
  const a = String(area).toLowerCase().trim();
  return AREA_TITLES[a] ? a : "other";
}

function normalizeStatus(status) {
  if (!status) return "draft";
  const s = String(status).toLowerCase().trim();
  return STATUS_EMOJI[s] ? s : "draft";
}

function safeText(s) {
  return String(s ?? "").replace(/\|/g, "\\|").trim();
}

function mdLink(relPath, title) {
  return `[${safeText(title)}](${relPath})`;
}

function collectDocs() {
  const files = [];
  for (const d of DOCS_DIRS) {
    const abs = path.join(ROOT, d);
    if (!fs.existsSync(abs)) continue;
    files.push(...walk(abs));
  }

  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));

  const items = [];
  for (const f of mdFiles) {
    const rel = toRepoRelative(f);
    if (rel === "docs/INDEX.md" || rel === "docs/GLOSSARY.md") continue;

    const text = readText(f);
    const { data } = parseFrontmatter(text);

    const title = data?.title || path.basename(f, ".md");
    const area = normalizeArea(data?.area);
    const status = normalizeStatus(data?.status);
    const tags = Array.isArray(data?.tags) ? data.tags : (data?.tags ? [String(data.tags)] : []);
    const owner = data?.owner || "";
    const updated = data?.updated || fileMtimeISO(f);

    items.push({ title, rel, area, status, tags, owner, updated });
  }

  const areaRank = new Map(AREA_ORDER.map((a, i) => [a, i]));
  items.sort((a, b) => {
    const ra = areaRank.get(a.area) ?? 999;
    const rb = areaRank.get(b.area) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });

  return items;
}

function tryReadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(readText(filePath)); } catch { return null; }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractExistingHealthBlock(prevIndexText) {
  if (!prevIndexText) return null;
  const re = new RegExp(`${escapeRegex(HEALTH_START)}[\\s\\S]*?${escapeRegex(HEALTH_END)}`, "m");
  const m = prevIndexText.match(re);
  return m ? m[0] : null;
}

function safeCell(x) {
  return String(x ?? "").replace(/\|/g, "\\|").trim();
}

function buildHealthBlockFromReport(report) {
  const lines = [];
  lines.push(HEALTH_START);
  lines.push("## 🩺 Salud del Sistema");
  lines.push("");
  lines.push("| Área | Estado | Detalle |");
  lines.push("|---|---:|---|");

  if (!report || !report.surfaces) {
    lines.push("| render | 📝 | Sin reporte. Corre `npm run lint:render` para generar `tools/lint/render_policy_report.json`. |");
    lines.push(HEALTH_END);
    return lines.join("\n");
  }

  const names = Object.keys(report.surfaces).sort();
  const artifactRows = [];
  let hasArtifactData = false;
  for (const name of names) {
    const surf = report.surfaces[name] || {};
    const l3 = Number.isFinite(Number(surf.l3Count)) ? Number(surf.l3Count) : 0;
    const l4 = Number.isFinite(Number(surf.l4Count)) ? Number(surf.l4Count) : 0;
    const score = Number.isFinite(Number(surf.score)) ? Number(surf.score) : null;
    const budget = Number.isFinite(Number(surf.scoreBudget)) ? Number(surf.scoreBudget) : null;

    let state = "🟢";
    if (l4 > 0) state = "🔴";
    else if (l3 > 0) state = "🟡";
    else if (score !== null && budget !== null && score > budget) state = "🟡";

    const parts = [];
    if (score !== null && budget !== null) parts.push(`score ${score} / budget ${budget}`);
    if (l3 > 0) parts.push(`L3=${l3}`);
    if (l4 > 0) parts.push(`L4=${l4}`);
    if (surf.maxLevelUsed) parts.push(`maxUsed=${surf.maxLevelUsed}`);
    if (surf.maxLevelAllowed) parts.push(`maxAllowed=${surf.maxLevelAllowed}`);
    const detail = parts.length ? safeCell(parts.join(" · ")) : "sin violaciones";

    lines.push(`| ${safeCell(name)} | ${state} | ${detail} |`);

    const artifactScore = Number.isFinite(Number(surf.artifactScore))
      ? Number(surf.artifactScore)
      : (Number.isFinite(Number(surf.scopes?.artifacts?.score)) ? Number(surf.scopes.artifacts.score) : null);
    const artifactL3 = Number.isFinite(Number(surf.artifactL3Count))
      ? Number(surf.artifactL3Count)
      : (Number.isFinite(Number(surf.scopes?.artifacts?.l3Count)) ? Number(surf.scopes.artifacts.l3Count) : null);
    const artifactL4 = Number.isFinite(Number(surf.artifactL4Count))
      ? Number(surf.artifactL4Count)
      : (Number.isFinite(Number(surf.scopes?.artifacts?.l4Count)) ? Number(surf.scopes.artifacts.l4Count) : null);
    const artifactFiles = Number.isFinite(Number(surf.artifactFiles))
      ? Number(surf.artifactFiles)
      : (Number.isFinite(Number(surf.scopes?.artifacts?.files)) ? Number(surf.scopes.artifacts.files) : null);

    if (artifactScore !== null || artifactL3 !== null || artifactL4 !== null || artifactFiles !== null) {
      hasArtifactData = true;
      const artifactParts = [];
      if (artifactScore !== null) artifactParts.push(`score ${artifactScore}`);
      if (artifactL3 !== null) artifactParts.push(`L3=${artifactL3}`);
      if (artifactL4 !== null) artifactParts.push(`L4=${artifactL4}`);
      if (artifactFiles !== null) artifactParts.push(`files=${artifactFiles}`);
      const artifactDetail = artifactParts.length ? safeCell(artifactParts.join(" · ")) : "sin artifacts";
      artifactRows.push(`| ${safeCell(name)} | ${artifactDetail} |`);
    }
  }

  if (hasArtifactData) {
    lines.push("");
    lines.push("Artifacts (informacional)");
    lines.push("");
    lines.push("| Área | Detalle |");
    lines.push("|---|---|");
    lines.push(...artifactRows);
  }

  lines.push(HEALTH_END);
  return lines.join("\n");
}

function loadTerms() {
  if (!fs.existsSync(TERMS_FILE)) return [];
  try {
    const raw = readText(TERMS_FILE);
    const json = JSON.parse(raw);
    if (!Array.isArray(json)) return [];
    return json
      .map((t) => ({
        term: String(t.term || "").trim(),
        def: String(t.def || "").trim(),
        links: Array.isArray(t.links) ? t.links.map(String) : [],
      }))
      .filter((t) => t.term && t.def);
  } catch {
    return [];
  }
}

function generateIndexMd(items, prevIndexText) {
  const today = new Date().toISOString().slice(0, 10);

  const byArea = new Map();
  for (const it of items) {
    if (!byArea.has(it.area)) byArea.set(it.area, []);
    byArea.get(it.area).push(it);
  }

  const lines = [];
  lines.push(`# Índice del Repo`);
  lines.push(``);
  lines.push(`> Auto-generado. Última generación: **${today}**`);
  lines.push(``);
  lines.push(`## Cómo usar esto en un chat`);
  lines.push(`- “Vamos a trabajar en **policies**” → abre la sección **📜 Políticas**`);
  lines.push(`- “Vamos a trabajar en **slides**” → abre **🖼️ Slides**`);
  lines.push(`- “Dame el estatus del repo” → revisa **estatus** y **updated** aquí`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  const report = tryReadJson(RENDER_REPORT);
  const prevHealth = extractExistingHealthBlock(prevIndexText);
  const healthBlock = report ? buildHealthBlockFromReport(report) : (prevHealth || buildHealthBlockFromReport(null));
  lines.push(healthBlock);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  for (const area of AREA_ORDER) {
    const list = byArea.get(area);
    if (!list || list.length === 0) continue;

    lines.push(`## ${AREA_TITLES[area] || area}`);
    lines.push(``);
    lines.push(`| Doc | Estado | Tags | Owner | Updated | Ruta |`);
    lines.push(`|---|---:|---|---|---:|---|`);

    for (const it of list) {
      const st = STATUS_EMOJI[it.status] || "📝";
      const tags = it.tags.length ? it.tags.join(", ") : "";
      lines.push(`| ${mdLink(it.rel, it.title)} | ${st} | ${safeText(tags)} | ${safeText(it.owner)} | ${safeText(it.updated)} | \`${it.rel}\` |`);
    }

    lines.push(``);
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Notas`);
  lines.push(`- Si un doc no trae frontmatter, cae en **Otros** y status **draft**.`);
  lines.push(`- Para que aparezca bonito: agrega title, area, status, tags, owner, updated en el frontmatter.`);
  lines.push(``);

  return lines.join("\n");
}

function generateGlossaryMd(terms) {
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push(`# Glosario`);
  lines.push(``);
  lines.push(`> Auto-generado desde docs/_meta/terms.json. Última generación: **${today}**`);
  lines.push(``);

  if (!terms.length) {
    lines.push(`No hay términos todavía. Agrega entradas a docs/_meta/terms.json.`);
    lines.push(``);
    return lines.join("\n");
  }

  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term));

  for (const t of sorted) {
    lines.push(`## ${t.term}`);
    lines.push(``);
    lines.push(`${t.def}`);
    if (t.links && t.links.length) {
      lines.push(``);
      lines.push(`**Links:**`);
      for (const l of t.links) lines.push(`- ${l}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  ensureDir(path.join(ROOT, "docs"));
  ensureDir(path.join(ROOT, "docs", "_meta"));
  ensureDir(path.join(ROOT, "tools", "docs"));

  const prevIndexText = fs.existsSync(OUTPUT_INDEX) ? readText(OUTPUT_INDEX) : "";

  const items = collectDocs();
  const indexMd = generateIndexMd(items, prevIndexText);
  fs.writeFileSync(OUTPUT_INDEX, indexMd, "utf8");

  const terms = loadTerms();
  const glossaryMd = generateGlossaryMd(terms);
  fs.writeFileSync(OUTPUT_GLOSSARY, glossaryMd, "utf8");

  console.log(`[docs:index] OK -> ${toRepoRelative(OUTPUT_INDEX)} (${items.length} docs)`);
  console.log(`[docs:index] OK -> ${toRepoRelative(OUTPUT_GLOSSARY)} (${terms.length} terms)`);
}

main();
