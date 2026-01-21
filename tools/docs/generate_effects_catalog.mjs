#!/usr/bin/env node
/* eslint-disable no-console */

import fs from "node:fs";
import path from "node:path";

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    const gitDir = path.join(dir, ".git");
    if (fs.existsSync(gitDir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return startDir;
    dir = parent;
  }
}

const ROOT = findRepoRoot(process.cwd());

const CATALOG_PATH = path.join(ROOT, "docs", "architecture", "effects.catalog.json");
const PLANNED_PATH_DEFAULT = path.join(ROOT, "docs", "architecture", "effects.catalog.planned.json");
const MERGED_PATH_DEFAULT = path.join(ROOT, "docs", "architecture", "effects.catalog.merged.json");

const POLICY_PATH = path.join(ROOT, "docs", "architecture", "EFFECTS_POLICY.json");
const AUTO_PATH = path.join(ROOT, "docs", "architecture", "effects.catalog.auto.json");
const OUTPUT_PATH = path.join(ROOT, "docs", "architecture", "EFFECTS_CATALOG.md");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function toRepoRelative(p) {
  return toPosix(path.relative(ROOT, p));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  const raw = readText(filePath);
  return JSON.parse(raw);
}

function stringifyJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function uniqueSorted(list) {
  return Array.from(new Set(list)).sort();
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ");
}

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const base = entry.name;
      if (base === "node_modules" || base === "dist" || base === "build" || base === ".git") continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function listEffectsCssFiles() {
  const dir = path.join(ROOT, "src", "shared", "render", "effects");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function listSlideTsxFiles() {
  const base = path.join(ROOT, "src", "slides");
  if (!fs.existsSync(base)) return [];
  return walk(base)
    .filter((filePath) => filePath.endsWith(".tsx"))
    .filter((filePath) => toPosix(path.relative(base, filePath)).includes("/ui/"))
    .sort();
}

function collectSelectors(text) {
  const selectors = new Set();
  const selectorRegex = /(^|})\s*([^{]+)\{/g;
  for (const match of text.matchAll(selectorRegex)) {
    const block = match[2].trim();
    if (!block) continue;
    if (block.startsWith("@")) continue;
    const parts = block
      .split(",")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower === "from" || lower === "to" || /\d+%/.test(lower)) continue;
      if (part.includes("}")) continue;
      if (!part.includes("[data-") && !part.includes(".hi-")) continue;
      selectors.add(part);
    }
  }
  return uniqueSorted(Array.from(selectors));
}

function collectDataAttributes(text) {
  const attributes = [];
  const attrRegex = /\[(data-[a-z0-9-]+(?:[~|^$*]?=[^\]]+)?)\]/gi;
  for (const match of text.matchAll(attrRegex)) {
    const raw = match[1].trim();
    const normalized = raw.replace(/\s+/g, "");
    attributes.push(normalized);
  }
  return uniqueSorted(attributes);
}

function collectTokens(text) {
  const matches = text.match(/--hi-[a-z0-9-]+/gi) || [];
  return uniqueSorted(matches.map((token) => token.toLowerCase()));
}

function collectCostSignals(text) {
  const signals = new Set();
  if (/@keyframes\b/i.test(text) || /\banimation(-name)?\s*:/i.test(text)) {
    signals.add("animation");
  }
  if (/\bfilter\s*:/i.test(text)) {
    signals.add("filter");
  }
  if (/\bbackdrop-filter\s*:/i.test(text) || /\b-webkit-backdrop-filter\s*:/i.test(text)) {
    signals.add("backdrop-filter");
  }
  if (/\bmix-blend-mode\s*:/i.test(text)) {
    signals.add("mix-blend-mode");
  }
  return uniqueSorted(Array.from(signals));
}

function scanCssFile(filePath) {
  const raw = readText(filePath);
  const text = stripCssComments(raw);
  return {
    path: toRepoRelative(filePath),
    kind: "css",
    selectors: collectSelectors(text),
    dataAttributes: collectDataAttributes(text),
    tokens: collectTokens(text),
    costSignals: collectCostSignals(text)
  };
}

function collectTsxDataAttributes(text) {
  const attributes = new Set();
  const attrRegex = /\b(data-[a-z0-9-]+)\s*=\s*("([^"]*)"|'([^']*)'|\{[^}]*\})/gi;
  for (const match of text.matchAll(attrRegex)) {
    const name = match[1];
    const value = match[2].trim();
    attributes.add(`${name}=${value}`);
  }
  return uniqueSorted(Array.from(attributes));
}

function scanTsxFile(filePath) {
  const text = readText(filePath);
  return {
    path: toRepoRelative(filePath),
    kind: "tsx",
    selectors: [],
    dataAttributes: collectTsxDataAttributes(text),
    tokens: [],
    costSignals: []
  };
}

function generateAutoData() {
  const effectFiles = listEffectsCssFiles();
  const materialsFile = path.join(ROOT, "src", "shared", "render", "materials", "materials.css");
  const appMaterialsFile = path.join(ROOT, "src", "app", "styles", "hi-materials.css");
  const slideFiles = listSlideTsxFiles();

  const cssFiles = [...effectFiles];
  if (fs.existsSync(materialsFile)) cssFiles.push(materialsFile);
  if (fs.existsSync(appMaterialsFile)) cssFiles.push(appMaterialsFile);

  const files = [];
  for (const filePath of cssFiles) files.push(scanCssFile(filePath));
  for (const filePath of slideFiles) files.push(scanTsxFile(filePath));

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    version: "1.0",
    sources: {
      effects: "src/shared/render/effects/*.css",
      materials: "src/shared/render/materials/materials.css",
      appStyles: "src/app/styles/hi-materials.css",
      slides: "src/slides/**/ui/*.tsx"
    },
    files
  };
}

function toCode(value) {
  return `\`${value}\``;
}

function normalizeTextList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function getEntryPaths(entry) {
  const paths = Array.isArray(entry.paths)
    ? entry.paths
    : Array.isArray(entry.filePaths)
      ? entry.filePaths
      : [];
  return paths.map((item) => toPosix(String(item)));
}

function formatCodeList(list, empty = "none") {
  if (!Array.isArray(list) || list.length === 0) return empty;
  return list.map((item) => toCode(item)).join(", ");
}

function formatTextList(list, empty = "none") {
  if (!Array.isArray(list) || list.length === 0) return empty;
  return list.join("; ");
}

function formatSurfaces(surfaces) {
  if (!Array.isArray(surfaces) || surfaces.length === 0) return "none";
  return surfaces.join(", ");
}

function formatActivation(activation, mode = "full") {
  if (!activation || typeof activation !== "object") return "none";
  const attributes = Array.isArray(activation.attributes) ? activation.attributes : [];
  const selectors = Array.isArray(activation.selectors) ? activation.selectors : [];

  if (mode === "summary") {
    const list = attributes.length ? attributes : selectors;
    return list.length ? list.map(toCode).join(", ") : "none";
  }

  const list = [...attributes, ...selectors];
  return list.length ? list.map(toCode).join(", ") : "none";
}

function formatExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) return "none";
  return examples
    .map((example) => {
      const loc = example.line ? `${example.path}:${example.line}` : example.path;
      const base = toCode(loc);
      return example.note ? `${base} (${example.note})` : base;
    })
    .join("; ");
}

function parseAttributeSpec(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // supports: data-x, data-x="y", data-x^="glass"
  const match = raw.match(/^(data-[a-z0-9-]+)(?:([~|^$*]?=)(.+))?$/i);
  if (!match) return null;
  const name = match[1];
  const operator = match[2] || "";
  const rhs = match[3] || "";
  const cleaned = rhs.trim();

  const values = [];
  if (cleaned) {
    // split common "a|b|c" patterns, remove quotes
    const dequoted = cleaned.replace(/^["']|["']$/g, "");
    for (const part of dequoted.split("|")) {
      const v = part.trim();
      if (v) values.push(v);
    }
  }

  return { name, operator, values };
}

function parseSelectorAttributes(selector) {
  const attrs = [];
  const attrRegex = /\[(data-[a-z0-9-]+)(?:([~|^$*]?=)\s*("[^"]*"|'[^']*'|[^\]]+))?\]/gi;
  for (const match of selector.matchAll(attrRegex)) {
    const name = match[1];
    const operator = match[2] || "";
    const rawValue = match[3] ? String(match[3]).trim() : "";
    const value = rawValue.replace(/^["']|["']$/g, "");
    attrs.push({ name, operator, value });
  }
  return attrs;
}

function selectorMatchesSpecs(selector, specs) {
  if (!selector) return false;
  const selectorAttrs = parseSelectorAttributes(String(selector));
  if (!specs.length) return selectorAttrs.length > 0;

  for (const spec of specs) {
    const matches = selectorAttrs.filter((attr) => attr.name === spec.name);
    if (!matches.length) continue;

    for (const attr of matches) {
      if (!attr.operator) return true;
      if (!spec.values.length) return true;

      for (const value of spec.values) {
        if (attr.value === value) return true;
        if (spec.operator === "^=" && attr.value.startsWith(value)) return true;
      }
    }
  }
  return false;
}

function attributeMatchesSpecs(attr, specs) {
  const parsed = parseAttributeSpec(attr);
  if (!parsed) return false;
  if (!specs.length) return true;

  const spec = specs.find((item) => item.name === parsed.name);
  if (!spec) return false;

  if (!parsed.operator) return true;
  if (parsed.values.some((value) => value.includes("{") || value.includes("}"))) return true;

  if (!spec.values.length) return true;
  if (!parsed.values.length) return true;

  for (const value of spec.values) {
    if (parsed.values.includes(value)) return true;
    if (spec.operator === "^=" && parsed.values.some((v) => v.startsWith(value))) return true;
  }
  return false;
}

function extractSpecsFromEntry(entry) {
  const attributes = Array.isArray(entry.activation?.attributes) ? entry.activation.attributes : [];
  const specs = [];
  for (const attr of attributes) {
    const parsed = parseAttributeSpec(attr);
    if (parsed) specs.push(parsed);
  }
  return specs;
}

function buildObservedSignals(entry, autoData) {
  if (!autoData || !Array.isArray(autoData.files)) {
    return { line: "none", usageRefs: [] };
  }

  const entryPaths = getEntryPaths(entry);
  const entrySpecs = extractSpecsFromEntry(entry);

  const relatedFiles = autoData.files.filter((file) => {
    if (file.kind !== "css") return false;
    if (entryPaths.includes(file.path)) return true;
    if (file.path.endsWith(`/${entry.id}.css`)) return true;
    return false;
  });

  const observedTokens = uniqueSorted(relatedFiles.flatMap((file) => file.tokens || []));
  const observedCostSignals = uniqueSorted(relatedFiles.flatMap((file) => file.costSignals || []));
  const observedSelectors = uniqueSorted(
    relatedFiles.flatMap((file) => (file.selectors || []).filter((sel) => selectorMatchesSpecs(sel, entrySpecs)))
  );
  const observedAttributes = uniqueSorted(
    relatedFiles.flatMap((file) => (file.dataAttributes || []).filter((a) => attributeMatchesSpecs(a, entrySpecs)))
  );

  const usageRefs = [];
  if (entrySpecs.length) {
    for (const file of autoData.files) {
      if (file.kind !== "tsx") continue;
      const hasMatch = (file.dataAttributes || []).some((a) => attributeMatchesSpecs(a, entrySpecs));
      if (hasMatch) usageRefs.push(file.path);
    }
  }

  const parts = [];
  if (observedCostSignals.length) parts.push(`cost ${formatCodeList(observedCostSignals)}`);
  if (observedTokens.length) parts.push(`tokens ${formatCodeList(observedTokens)}`);
  if (observedSelectors.length) parts.push(`selectors ${formatCodeList(observedSelectors)}`);
  if (observedAttributes.length) parts.push(`attributes ${formatCodeList(observedAttributes)}`);
  if (usageRefs.length) parts.push(`usage ${formatCodeList(uniqueSorted(usageRefs))}`);

  return {
    line: parts.length ? parts.join("; ") : "none",
    usageRefs: uniqueSorted(usageRefs)
  };
}

function renderDiscoveredSection(catalog, autoData) {
  if (!autoData || !Array.isArray(autoData.files)) return "";
  const registered = new Set((catalog.entries || []).flatMap((entry) => getEntryPaths(entry)));
  const unregistered = autoData.files.filter((file) => file.kind === "css" && !registered.has(file.path));

  const lines = [];
  lines.push("## Discovered (unregistered)");
  lines.push("");
  if (!unregistered.length) {
    lines.push("None.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("Auto-scan found CSS sources that are not referenced in the curated catalog.");
  lines.push("");
  lines.push("| Path | Cost signals | Data attributes | Tokens |");
  lines.push("| --- | --- | --- | --- |");
  for (const file of unregistered) {
    lines.push(
      `| ${file.path} | ${formatCodeList(file.costSignals)} | ${formatCodeList(file.dataAttributes)} | ${formatCodeList(file.tokens)} |`
    );
  }
  lines.push("");
  return lines.join("\n");
}

function hasAllowMarkerDoc(entry, markerText) {
  const notes = normalizeTextList(entry.notes);
  const risks = normalizeTextList(entry.risks);
  const scoreNotes = entry.scoreNotes ? [String(entry.scoreNotes)] : [];
  const description = entry.description ? [String(entry.description)] : [];
  const tokens = [...notes, ...risks, ...scoreNotes, ...description];
  return tokens.some((value) => value.includes(markerText));
}

function validateCatalog(catalog, policy) {
  const errors = [];
  const warnings = [];

  const levelOrder = Array.isArray(policy?.levelOrder)
    ? policy.levelOrder
    : ["L0", "L1", "L2", "L3", "L4"];
  const levelRank = new Map(levelOrder.map((level, idx) => [level, idx]));

  const budgets = policy?.budgets || {};
  const allowMarkerText = policy?.allowMarker?.comment || "hi-allow:L3";
  const allowMarkerSurfaces = new Set(
    Array.isArray(policy?.allowMarker?.requiredForSurfaces)
      ? policy.allowMarker.requiredForSurfaces
      : ["overlay", "inspector"]
  );

  const hardRules = policy?.hardRules || {};
  const centralizedBlurText = hardRules?.centralizedBlur?.name || "Centralized Blur Rule";

  for (const entry of catalog.entries || []) {
    const id = entry.id || "unknown";
    const costSignals = Array.isArray(entry.costSignals) ? entry.costSignals : [];
    const surfaces = Array.isArray(entry.allowedSurfaces) ? entry.allowedSurfaces.filter(Boolean) : [];
    const cleanedSurfaces = surfaces.filter((surface) => surface !== "none");

    if (costSignals.includes("backdrop-filter") && cleanedSurfaces.length) {
      const okDoc =
        hasAllowMarkerDoc(entry, centralizedBlurText) || hasAllowMarkerDoc(entry, "Centralized Blur");
      if (!okDoc) {
        warnings.push(
          `[${id}] uses backdrop-filter: document centralized blur constraint (only 1 per surface).`
        );
      }
    }

    const level = entry.estimatedLevel;
    const levelRankValue = levelRank.get(level);

    if (!levelRank.has(level)) {
      warnings.push(`[${id}] missing or invalid estimatedLevel.`);
    }

    if (level === "L4" && cleanedSurfaces.length > 0) {
      errors.push(`[${id}] L4 entries must not allow any surfaces.`);
    }

    if (level === "L3" && cleanedSurfaces.includes("stage")) {
      errors.push(`[${id}] L3 entries cannot allow the stage surface.`);
    }

    for (const surface of cleanedSurfaces) {
      const budget = budgets[surface];
      if (!budget) {
        warnings.push(`[${id}] unknown surface "${surface}" in allowedSurfaces.`);
        continue;
      }

      if (!levelRank.has(level)) continue;

      const maxLevel = budget.maxLevel;
      const maxRank = levelRank.get(maxLevel);
      if (typeof maxRank === "number" && levelRankValue > maxRank) {
        const requiresAllowMarker = Boolean(budget.requiresAllowMarkerForL3);
        const allowMarkerOk = level === "L3" && requiresAllowMarker && entry.allowMarkerRequired === true;
        if (!allowMarkerOk) {
          errors.push(`[${id}] ${level} exceeds ${surface} maxLevel ${maxLevel}.`);
        }
      }

      if (level === "L3" && allowMarkerSurfaces.has(surface)) {
        if (entry.allowMarkerRequired !== true) {
          errors.push(`[${id}] ${surface} L3 requires allowMarkerRequired=true.`);
        }
        if (!hasAllowMarkerDoc(entry, allowMarkerText)) {
          errors.push(`[${id}] ${surface} L3 must document allow marker "${allowMarkerText}".`);
        }
      }
    }
  }

  return {
    errors,
    warnings,
    summary: {
      checked: (catalog.entries || []).length,
      errors: errors.length,
      warnings: warnings.length
    }
  };
}

function renderMarkdown(catalog, autoData, validation, mergeMeta) {
  if (!catalog || typeof catalog !== "object") {
    throw new Error("Invalid catalog: expected an object.");
  }
  if (!Array.isArray(catalog.entries)) {
    throw new Error("Invalid catalog: expected entries array.");
  }

  const sortedEntries = [...catalog.entries].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const lines = [];
  lines.push("# Effects Catalog");
  lines.push("");
  lines.push("Canonical list of render effects and materials.");
  lines.push("Inclusion here is not a promise to use an effect; it is the approved options list.");
  lines.push("");
  lines.push(`Generated from ${toCode("docs/architecture/effects.catalog.json")}.`);

  if (mergeMeta?.enabled) {
    lines.push(
      `Merged planned entries from ${toCode(
        mergeMeta.plannedRelative
      )} (added ${mergeMeta.addedCount}, skipped ${mergeMeta.skippedCount}).`
    );
  }

  if (autoData) {
    lines.push(`Auto signals from ${toCode("docs/architecture/effects.catalog.auto.json")}.`);
  }

  lines.push("");
  lines.push("## Levels and Budgets (Brief)");
  lines.push("");
  lines.push("- L0: Static paint or token-only styling.");
  lines.push("- L1: Light composition (small shadows/opacity).");
  lines.push("- L2: Composited layers, masks, pseudo-elements.");
  lines.push("- L3: Framebuffer-dependent (filter, mix-blend-mode, backdrop-filter).");
  lines.push("- L4: Continuous recomposition (animation/transitions).");
  lines.push("");
  lines.push("Surface budgets (see render policy):");
  lines.push("- stage: max L2, no L3/L4.");
  lines.push("- ui: max L3 within budget.");
  lines.push("- overlay/inspector: L3 only with hi-allow:L3.");
  lines.push("- L4: forbidden on all surfaces.");
  lines.push("");
  lines.push("## Policy validation");
  lines.push("");

  if (validation) {
    const status = validation.errors.length ? "FAIL" : "PASS";
    lines.push(
      `Status: ${status} (${validation.summary.checked} entries, ${validation.summary.errors} errors, ${validation.summary.warnings} warnings).`
    );

    if (validation.errors.length) {
      lines.push("");
      lines.push("Errors:");
      for (const item of validation.errors) lines.push(`- ${item}`);
    }

    if (validation.warnings.length) {
      lines.push("");
      lines.push("Warnings:");
      for (const item of validation.warnings) lines.push(`- ${item}`);
    }
  } else {
    lines.push("Status: unavailable (policy not loaded).");
  }

  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| ID | Category | Status | Level | Allowed surfaces | Activation |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (const entry of sortedEntries) {
    const activation = formatActivation(entry.activation, "summary");
    const allowedSurfaces = formatSurfaces(entry.allowedSurfaces);
    const category = entry.category || entry.kind || "unknown";
    lines.push(
      `| ${entry.id} | ${category} | ${entry.status} | ${entry.estimatedLevel} | ${allowedSurfaces} | ${activation} |`
    );
  }

  lines.push("");
  lines.push("## Entries");
  lines.push("");

  for (const entry of sortedEntries) {
    const notes = normalizeTextList(entry.notes);
    const observed = buildObservedSignals(entry, autoData);
    const category = entry.category || entry.kind || "unknown";
    const description = entry.description || entry.name || "none";

    lines.push(`### ${entry.id}`);
    lines.push("");
    lines.push(`- Description: ${description}`);
    lines.push(`- Category: ${category}`);
    lines.push(`- Tags: ${formatCodeList(entry.tags)}`);
    lines.push(`- Status: ${entry.status}`);
    lines.push(`- Paths: ${formatCodeList(getEntryPaths(entry))}`);
    lines.push(`- Activation: ${formatActivation(entry.activation, "full")}`);
    lines.push(`- Estimated level: ${entry.estimatedLevel}`);
    lines.push(`- Cost signals: ${formatCodeList(entry.costSignals)}`);
    lines.push(`- Score notes: ${entry.scoreNotes || "none"}`);
    lines.push(`- Allowed surfaces: ${formatSurfaces(entry.allowedSurfaces)}`);
    lines.push(`- Allow marker required: ${entry.allowMarkerRequired ? "yes" : "no"}`);
    lines.push(`- Tokens: ${formatCodeList(entry.tokens)}`);
    lines.push(`- Observed signals: ${observed.line}`);
    lines.push(`- Risks: ${formatTextList(entry.risks)}`);
    lines.push(`- Examples: ${formatExamples(entry.examples)}`);
    lines.push(`- Notes: ${formatTextList(notes)}`);
    lines.push("");
  }

  const discovered = renderDiscoveredSection(catalog, autoData);
  if (discovered) lines.push(discovered);

  return `${lines.join("\n")}\n`;
}

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {
    auto: false,
    check: false,
    mergePlanned: false,
    
    requirePlanned: false,plannedPath: "",
    writeMerged: false,
    mergedOutPath: "",
    help: false
  };

  const args = [...argv];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--auto") out.auto = true;
    else if (a === "--check") out.check = true;
    else if (a === "--merge-planned") out.mergePlanned = true;
    
    else if (a === "--require-planned") out.requirePlanned = true;else if (a === "--planned") out.plannedPath = String(args[i + 1] || "").trim(), i++;
    else if (a === "--write-merged") out.writeMerged = true;
    else if (a === "--merged-out") out.mergedOutPath = String(args[i + 1] || "").trim(), i++;
    else fail(`[docs:effects] unknown arg: ${a}`);
  }

  return out;
}

function printHelp() {
  const lines = [];
  lines.push("generate_effects_catalog.mjs");
  lines.push("");
  lines.push("Usage:");
  lines.push("  node tools/docs/generate_effects_catalog.mjs [--auto] [--check]");
  lines.push("  node tools/docs/generate_effects_catalog.mjs --merge-planned [--planned <path>] [--write-merged] [--merged-out <path>]");
  lines.push("");
  lines.push("Flags:");
  lines.push("  --auto            Regenerate docs/architecture/effects.catalog.auto.json and then EFFECTS_CATALOG.md");
  lines.push("  --check           CI mode: fail if generated outputs differ, or if policy errors exist");
  lines.push("  --merge-planned   Merge planned catalog into runtime catalog for docs output only (does NOT overwrite canonical)");
  lines.push("  --planned <path>  Planned catalog path (default docs/architecture/effects.catalog.planned.json)");
  lines.push("  --write-merged    Write merged catalog json to docs/architecture/effects.catalog.merged.json (or --merged-out)");
  lines.push("  --merged-out <p>  Custom merged output path");
  lines.push("  -h, --help        Show this help");
  console.log(lines.join("\n"));
}

function assertCatalogNotGarbage(catalogRawText, catalogObj) {
  if (catalogRawText.includes("PASTE_CODEX_JSON_HERE")) {
    fail("[docs:effects] effects.catalog.json looks like a placeholder (PASTE_CODEX_JSON_HERE). Aborting.");
  }
  if (!catalogObj || typeof catalogObj !== "object") {
    fail("[docs:effects] effects.catalog.json invalid (expected object).");
  }
  if (!Array.isArray(catalogObj.entries)) {
    fail("[docs:effects] effects.catalog.json invalid (entries must be an array).");
  }
  if (catalogObj.entries.length === 0) {
    fail("[docs:effects] effects.catalog.json entries is EMPTY. Refusing to generate docs (this is usually accidental overwrite).");
  }

  const ids = catalogObj.entries.map((e) => String(e?.id || "").trim()).filter(Boolean);
  const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (dupes.length) {
    fail(`[docs:effects] effects.catalog.json has duplicate ids: ${uniqueSorted(dupes).join(", ")}`);
  }
}

function loadPlanned(plannedPath) {
  if (!plannedPath || !fs.existsSync(plannedPath)) return null;
  const obj = readJson(plannedPath);
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.entries)) {
    fail(`[docs:effects] planned catalog invalid: ${toRepoRelative(plannedPath)} (expected {entries:[]})`);
  }
  return obj;
}

function mergeCatalog(baseCatalog, plannedCatalog) {
  const baseEntries = Array.isArray(baseCatalog.entries) ? baseCatalog.entries : [];
  const plannedEntries = Array.isArray(plannedCatalog?.entries) ? plannedCatalog.entries : [];

  const map = new Map();
  for (const e of baseEntries) {
    const id = String(e?.id || "").trim();
    if (!id) continue;
    map.set(id, e);
  }

  let added = 0;
  let skipped = 0;

  for (const p of plannedEntries) {
    const id = String(p?.id || "").trim();
    if (!id) continue;

    if (map.has(id)) {
      skipped++;
      continue;
    }

    const planned = { ...p, status: p.status || "planned" };
    map.set(id, planned);
    added++;
  }

  const mergedEntries = [...map.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const merged = { ...baseCatalog, entries: mergedEntries };
  return { merged, added, skipped };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  let autoData = null;
  let autoText = "";
  let hasDiffError = false;

  // AUTO mode: generate or check effects.catalog.auto.json
  if (opts.auto) {
    autoData = generateAutoData();
    autoText = stringifyJson(autoData);

    if (opts.check) {
      const current = fs.existsSync(AUTO_PATH) ? readText(AUTO_PATH) : "";
      if (current !== autoText) {
        console.error("[docs:effects:auto] auto catalog is out of date.");
        hasDiffError = true;
      }
    } else {
      fs.writeFileSync(AUTO_PATH, autoText, "utf8");
      console.log(`[docs:effects:auto] OK -> ${toRepoRelative(AUTO_PATH)}`);
    }
  } else if (fs.existsSync(AUTO_PATH)) {
    autoData = readJson(AUTO_PATH);
  }

  // Load canonical catalog with HARD GUARDS
  const catalogRaw = readText(CATALOG_PATH);
  const catalogObj = JSON.parse(catalogRaw);
  assertCatalogNotGarbage(catalogRaw, catalogObj);

  let catalog = catalogObj;
  let mergeMeta = { enabled: false, plannedRelative: "", addedCount: 0, skippedCount: 0 };

  // Merge planned if requested
  if (opts.mergePlanned) {
    const plannedPath = opts.plannedPath ? path.resolve(ROOT, opts.plannedPath) : PLANNED_PATH_DEFAULT;
    const planned = loadPlanned(plannedPath);    if (!planned) {
      const msg = `[docs:effects] --merge-planned requested, but planned file not found: ${toRepoRelative(plannedPath)}`;
      if (opts.requirePlanned) {
        console.error(msg);
        process.exit(2);
      }
      console.warn(msg);
    } else {
      const res = mergeCatalog(catalogObj, planned);
      catalog = res.merged;
      mergeMeta = {
        enabled: true,
        plannedRelative: toRepoRelative(plannedPath),
        addedCount: res.added,
        skippedCount: res.skipped
      };

      if (opts.writeMerged) {
        const outPath = opts.mergedOutPath
          ? path.resolve(ROOT, opts.mergedOutPath)
          : MERGED_PATH_DEFAULT;

        const mergedText = stringifyJson({ ...catalog, entries: [...catalog.entries] });
        if (opts.check) {
          const current = fs.existsSync(outPath) ? readText(outPath) : "";
          if (current !== mergedText) {
            console.error("[docs:effects:merge] merged catalog json is out of date.");
            hasDiffError = true;
          }
        } else {
          fs.writeFileSync(outPath, mergedText, "utf8");
          console.log(`[docs:effects:merge] OK -> ${toRepoRelative(outPath)}`);
        }
      }
    }
  }

  // Sort entries deterministically (even canonical)
  const sortedEntries = Array.isArray(catalog.entries)
    ? [...catalog.entries].sort((a, b) => String(a.id).localeCompare(String(b.id)))
    : [];
  const sortedCatalog = { ...catalog, entries: sortedEntries };

  const policy = readJson(POLICY_PATH);
  const validation = validateCatalog(sortedCatalog, policy);

  for (const warning of validation.warnings) console.warn(`[docs:effects:policy] ${warning}`);
  for (const error of validation.errors) console.error(`[docs:effects:policy] ${error}`);

  const output = renderMarkdown(sortedCatalog, autoData, validation, mergeMeta);

  if (opts.check) {
    const current = fs.existsSync(OUTPUT_PATH) ? readText(OUTPUT_PATH) : "";
    if (current !== output) {
      console.error("[docs:effects] catalog markdown is out of date.");
      hasDiffError = true;
    }
    if (validation.errors.length) process.exit(2);
    if (hasDiffError) process.exit(1);
    console.log("[docs:effects] OK");
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, output, "utf8");
  console.log(`[docs:effects] OK -> ${toRepoRelative(OUTPUT_PATH)}`);
  if (validation.errors.length) process.exit(2);
}

main();

