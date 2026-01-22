import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const policyPath = path.join(repoRoot, "docs", "architecture", "EFFECTS_POLICY.json");
const reportDir = path.join(repoRoot, "tools", "lint");
const reportJsonPath = path.join(reportDir, "render_policy_report.json");
const reportMdPath = path.join(reportDir, "render_policy_report.md");
const baselinePath = path.join(reportDir, "render_policy_baseline.json");
const configPath = path.join(reportDir, "render_policy.config.json");
const args = new Set(process.argv.slice(2));
const writeBaseline = args.has("--baseline");

if (!fs.existsSync(policyPath)) {
  console.error(`Render policy not found at ${policyPath}`);
  process.exit(1);
}

const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
const levelRank = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };

const ignoreDirs = new Set([
  "node_modules",
  ".git",
  "dist",
  ".patcher_backups",
  "coverage",
  ".next",
  "out",
  ".turbo"
]);

const allowedExts = new Set([".css", ".scss", ".sass", ".less", ".ts", ".tsx"]);
const stylesheetExts = new Set([".css", ".scss", ".sass", ".less"]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

const defaultScopeConfig = {
  catalogMarkers: ["@render-catalog"],
  markerScanBytes: 4096,
  fallbackArtifactPrefixes: ["src/slides/", "tools/bundles/", "hitech-templates/"]
};

function asArray(value, fallback = []) {
  if (!value) return [...fallback];
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  return [String(value)];
}

function normalizeCatalogMarkers(raw, fallback) {
  if (!raw) return [...fallback];
  if (Array.isArray(raw)) {
    const out = raw.map(item => String(item)).filter(Boolean);
    return out.length ? out : [...fallback];
  }
  if (typeof raw === "object") {
    const merged = []
      .concat(asArray(raw.all), asArray(raw.css), asArray(raw.code))
      .map(item => String(item))
      .filter(Boolean);
    return merged.length ? merged : [...fallback];
  }
  const str = String(raw).trim();
  return str ? [str] : [...fallback];
}

function readScopeConfig() {
  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      runtimeExclude: [],
      artifactInclude: [],
      catalogMarkers: [...defaultScopeConfig.catalogMarkers],
      markerScanBytes: defaultScopeConfig.markerScanBytes
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid scope config");
    }
    const runtimeExclude = asArray(raw?.scopes?.runtime?.exclude ?? raw?.runtimeExclude ?? []);
    const artifactInclude = asArray(raw?.scopes?.artifacts?.include ?? raw?.artifactInclude ?? []);
    const catalogMarkers = normalizeCatalogMarkers(raw?.catalogMarkers, defaultScopeConfig.catalogMarkers);
    const markerScanBytes = Number.isFinite(Number(raw?.markerScanBytes))
      ? Math.max(256, Number(raw.markerScanBytes))
      : defaultScopeConfig.markerScanBytes;
    return {
      valid: true,
      runtimeExclude,
      artifactInclude,
      catalogMarkers,
      markerScanBytes
    };
  } catch (err) {
    console.warn(`[render-policy] Failed to read ${configPath}. Using fallback scope.`);
    return {
      valid: false,
      runtimeExclude: [],
      artifactInclude: [],
      catalogMarkers: [...defaultScopeConfig.catalogMarkers],
      markerScanBytes: defaultScopeConfig.markerScanBytes
    };
  }
}

function normalizeGlob(glob) {
  return toPosix(String(glob).trim()).replace(/^\.\//, "");
}

function globToRegExp(glob) {
  const normalized = normalizeGlob(glob);
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const placeholder = "__GLOBSTAR__";
  const withGlobstar = escaped.replace(/\*\*/g, placeholder);
  const withSingles = withGlobstar.replace(/\*/g, "[^/]*");
  const finalPattern = withSingles.replace(new RegExp(placeholder, "g"), ".*");
  return new RegExp(`^${finalPattern}$`);
}

function compileGlobSet(globs) {
  return asArray(globs).map((g) => ({ glob: g, regex: globToRegExp(g) }));
}

function matchesAny(compiled, relPath) {
  return compiled.some((entry) => entry.regex.test(relPath));
}

const scopeConfig = readScopeConfig();
const compiledScopeGlobs = scopeConfig.valid
  ? {
      runtimeExclude: compileGlobSet(scopeConfig.runtimeExclude),
      artifactInclude: compileGlobSet(scopeConfig.artifactInclude)
    }
  : { runtimeExclude: [], artifactInclude: [] };

function hasCatalogMarker(content) {
  if (!scopeConfig.catalogMarkers.length) return false;
  const scan = content.slice(0, scopeConfig.markerScanBytes);
  return scopeConfig.catalogMarkers.some(marker => marker && scan.includes(marker));
}

function classifyScope(relativePath, content) {
  const posixPath = normalizeGlob(relativePath);
  const catalogMarker = hasCatalogMarker(content);
  if (catalogMarker) {
    return { scope: "artifact", reason: "catalog-marker", catalogMarker };
  }
  if (scopeConfig.valid) {
    if (matchesAny(compiledScopeGlobs.artifactInclude, posixPath) ||
        matchesAny(compiledScopeGlobs.runtimeExclude, posixPath)) {
      return { scope: "artifact", reason: "config-match", catalogMarker };
    }
    return { scope: "runtime", reason: "config-default", catalogMarker };
  }
  if (defaultScopeConfig.fallbackArtifactPrefixes.some(prefix => posixPath.startsWith(prefix))) {
    return { scope: "artifact", reason: "fallback-prefix", catalogMarker };
  }
  return { scope: "runtime", reason: "fallback-default", catalogMarker };
}

function inferSurface(relativePath) {
  const posix = toPosix(relativePath);
  for (const rule of policy.surfaceInference.rules) {
    const needle = rule.pattern.replace(/\*/g, "");
    if (needle && posix.includes(needle)) {
      return rule.surface;
    }
  }
  if (posix.startsWith("src/")) {
    return "ui";
  }
  return policy.surfaceInference.defaultSurface || "ui";
}

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        walk(fullPath, results);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExts.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function parseLengthToken(token) {
  const match = token.match(/^(-?\d*\.?\d+)(px|rem|em)$/i);
  if (!match) return null;
  const value = Math.abs(Number.parseFloat(match[1]));
  const unit = match[2].toLowerCase();
  if (unit === "px") return value;
  return value * 16;
}

function isLargeBlurShadow(value) {
  const shadows = value.split(",");
  for (const shadow of shadows) {
    const parts = shadow.trim().split(/\s+/).filter(Boolean);
    const lengthTokens = [];
    for (const part of parts) {
      const len = parseLengthToken(part);
      if (len !== null) {
        lengthTokens.push(len);
      }
    }
    if (lengthTokens.length >= 3) {
      const blur = lengthTokens[2];
      if (blur >= 20) {
        return true;
      }
    } else if (lengthTokens.length === 1 && lengthTokens[0] >= 24) {
      return true;
    }
  }
  return false;
}

function parsePropertyValue(line, propName) {
  const regex = new RegExp(`\\b${propName}\\b\\s*[:=]\\s*([^;]+)`, "i");
  const match = line.match(regex);
  return match ? match[1].trim() : "";
}

function normalizeValue(value) {
  return value.replace(/["'`]/g, "").toLowerCase();
}

function stripCssComments(line, state) {
  let result = "";
  let idx = 0;
  while (idx < line.length) {
    if (state.inComment) {
      const endIdx = line.indexOf("*/", idx);
      if (endIdx === -1) {
        return { text: result, inComment: true };
      }
      idx = endIdx + 2;
      state.inComment = false;
      continue;
    }
    const startIdx = line.indexOf("/*", idx);
    if (startIdx === -1) {
      result += line.slice(idx);
      break;
    }
    result += line.slice(idx, startIdx);
    idx = startIdx + 2;
    state.inComment = true;
  }
  return { text: result, inComment: state.inComment };
}

function detectPanelBlurInCss(lines) {
  const hits = [];
  const stack = [];
  let selectorBuffer = "";
  const commentState = { inComment: false };
  const backdropRegex = /\b(-webkit-)?backdrop-filter\b\s*:/i;
  const panelSelectorRegex = /\.((hi-panel)|(board-glass))\b/;

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const stripped = stripCssComments(line, commentState);
    const cleaned = stripped.text;
    if (!cleaned.trim()) {
      return;
    }

    let remainder = cleaned;
    while (remainder.includes("{")) {
      const braceIndex = remainder.indexOf("{");
      const before = remainder.slice(0, braceIndex).trim();
      const selectorText = [selectorBuffer, before].filter(Boolean).join(" ").trim();
      const parentActive = stack.length > 0 ? stack[stack.length - 1].panelActive : false;
      const isPanelSelector = panelSelectorRegex.test(selectorText);
      const panelActive = parentActive || isPanelSelector;
      stack.push({ panelActive });
      selectorBuffer = "";
      remainder = remainder.slice(braceIndex + 1);
      if (panelActive && backdropRegex.test(remainder)) {
        hits.push({ line: lineNumber });
      }
    }

    const currentActive = stack.length > 0 ? stack[stack.length - 1].panelActive : false;
    if (currentActive && backdropRegex.test(remainder)) {
      hits.push({ line: lineNumber });
    }

    const closeCount = (remainder.match(/}/g) || []).length;
    for (let i = 0; i < closeCount; i += 1) {
      stack.pop();
    }

    if (!remainder.includes("{") && stack.length === 0 && !remainder.includes("}")) {
      selectorBuffer = `${selectorBuffer} ${remainder.trim()}`.trim();
    }
  });

  return hits;
}

function detectEffectsInLine(line, lineNumber) {
  const effects = [];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return effects;
  }

  const lower = trimmed.toLowerCase();

  const hasBackdrop = lower.includes("backdrop-filter") || lower.includes("backdropfilter");
  if (hasBackdrop) {
    effects.push({
      kind: "backdrop-filter",
      level: "L3",
      score: policy.scores["backdrop-filter"].score,
      line: lineNumber,
      detail: trimmed
    });
  }

  const hasWebkitBackdrop = lower.includes("-webkit-backdrop-filter");
  if (hasWebkitBackdrop && !hasBackdrop) {
    effects.push({
      kind: "backdrop-filter",
      level: "L3",
      score: policy.scores["backdrop-filter"].score,
      line: lineNumber,
      detail: trimmed
    });
  }

  if (!hasBackdrop && !hasWebkitBackdrop) {
    if (/(^|[^-])\bfilter\b\s*[:=]/i.test(trimmed)) {
      effects.push({
        kind: "filter",
        level: "L3",
        score: policy.scores["filter"].score,
        line: lineNumber,
        detail: trimmed
      });
    }
  }

  if (/(^|[^-])\bmix-blend-mode\b\s*[:=]/i.test(trimmed) || /\bmixBlendMode\b\s*[:=]/i.test(trimmed)) {
    effects.push({
      kind: "mix-blend-mode",
      level: "L3",
      score: policy.scores["mix-blend-mode"].score,
      line: lineNumber,
      detail: trimmed
    });
  }

  const boxShadowValue = parsePropertyValue(trimmed, "box-shadow") || parsePropertyValue(trimmed, "boxShadow");
  if (boxShadowValue && isLargeBlurShadow(boxShadowValue)) {
    effects.push({
      kind: "large-blurred-shadow",
      level: "L3",
      score: policy.scores["large-blurred-shadow"].score,
      line: lineNumber,
      detail: trimmed
    });
  }

  const willChangeValue = parsePropertyValue(trimmed, "will-change") || parsePropertyValue(trimmed, "willChange");
  if (willChangeValue) {
    const normalized = normalizeValue(willChangeValue);
    const isL3 = normalized.includes("filter") || normalized.includes("backdrop-filter") || normalized.includes("blur");
    if (isL3) {
      effects.push({
        kind: "will-change-blur",
        level: "L3",
        score: policy.scores["will-change-including-blur-or-filter"].score,
        line: lineNumber,
        detail: trimmed
      });
    } else {
      effects.push({
        kind: "will-change",
        level: "L2",
        score: policy.scores["will-change"].score,
        line: lineNumber,
        detail: trimmed
      });
    }
  }

  if (/\btransform\b\s*[:=]/i.test(trimmed) && !/\btransform-origin\b/i.test(trimmed)) {
    effects.push({
      kind: "transform",
      level: "L2",
      score: 0,
      line: lineNumber,
      detail: trimmed
    });
  }

  if (/\bmask(-image)?\b\s*[:=]/i.test(trimmed) || /\b-webkit-mask(-image)?\b\s*[:=]/i.test(trimmed)) {
    effects.push({
      kind: "mask",
      level: "L2",
      score: 0,
      line: lineNumber,
      detail: trimmed
    });
  }

  if (/\banimation(-name)?\b\s*[:=]/i.test(trimmed) || trimmed.includes("@keyframes")) {
    const animationValue = parsePropertyValue(trimmed, "animation") || parsePropertyValue(trimmed, "animation-name");
    const normalized = normalizeValue(animationValue);
    if (!animationValue || normalized !== "none") {
      effects.push({
        kind: "animation",
        level: "L4",
        score: policy.scores["animation"].score,
        line: lineNumber,
        detail: trimmed
      });
    }
  }

  const transitionValue = parsePropertyValue(trimmed, "transition") || parsePropertyValue(trimmed, "transition-property");
  if (transitionValue) {
    const normalized = normalizeValue(transitionValue);
    if (/(transform|opacity|filter)/.test(normalized)) {
      effects.push({
        kind: "transition",
        level: "L4",
        score: policy.scores["transition-transform-opacity-filter"].score,
        line: lineNumber,
        detail: trimmed
      });
    }
  }

  if (trimmed.includes("requestAnimationFrame")) {
    effects.push({
      kind: "requestAnimationFrame",
      level: "L4",
      score: policy.scores["animation"].score,
      line: lineNumber,
      detail: trimmed
    });
  }

  return effects;
}

const files = walk(repoRoot);
const fileRecords = [];

for (const filePath of files) {
  const relativePath = path.relative(repoRoot, filePath);
  const surface = inferSurface(relativePath);
  const ext = path.extname(filePath).toLowerCase();
  const isStylesheet = stylesheetExts.has(ext);
  const content = fs.readFileSync(filePath, "utf8");
  const scopeInfo = classifyScope(relativePath, content);
  const scope = scopeInfo.scope;
  const lines = content.split(/\r?\n/);
  const allowMarker = content.includes(policy.allowMarker.comment);
  const hasIsolation = /\bisolation\s*[:=]\s*isolate\b/i.test(content);
  const hasContain = /\bcontain\s*:\s*[^;]*(paint|layout)\b/i.test(content);
  const applyIsolationDiscount = hasIsolation && hasContain;

  const effects = [];
  const blockedClasses = [];
  const panelBlurHits = isStylesheet ? detectPanelBlurInCss(lines) : [];

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const lineLower = line.toLowerCase();

    if (/\bhi-panel\b/.test(lineLower)) {
      blockedClasses.push({ name: "hi-panel", line: lineNumber });
    }
    if (/\bboard-glass\b/.test(lineLower)) {
      blockedClasses.push({ name: "board-glass", line: lineNumber });
    }

    const lineEffects = detectEffectsInLine(line, lineNumber);
    for (const effect of lineEffects) {
      effects.push(effect);
    }
  });

  if (applyIsolationDiscount) {
    for (const effect of effects) {
      if (effect.level === "L3" && effect.score > 0) {
        effect.score = Math.max(6, effect.score - 2);
        effect.detail = `${effect.detail} (isolation discount)`;
      }
    }
  }

  fileRecords.push({
    filePath: relativePath,
    surface,
    scope,
    scopeReason: scopeInfo.reason,
    catalogMarker: scopeInfo.catalogMarker,
    allowMarker,
    effects,
    blockedClasses,
    panelBlurHits,
    hasIsolation,
    hasContain
  });
}

const surfaces = {};
const violations = [];
const runtimeViolations = [];
const artifactViolations = [];

function createScopeAggregate() {
  return {
    files: [],
    effects: [],
    maxLevelUsed: "L0",
    l3Count: 0,
    l4Count: 0,
    score: 0,
    backdropOccurrences: []
  };
}

function applyEffectAggregate(aggregate, effect) {
  if (levelRank[effect.level] > levelRank[aggregate.maxLevelUsed]) {
    aggregate.maxLevelUsed = effect.level;
  }
  if (effect.level === "L3") aggregate.l3Count += 1;
  if (effect.level === "L4") aggregate.l4Count += 1;
  aggregate.score += effect.score || 0;
  if (effect.kind === "backdrop-filter") {
    aggregate.backdropOccurrences.push({ file: effect.file, line: effect.line });
  }
}

function ensureSurface(surface) {
  if (!surfaces[surface]) {
    surfaces[surface] = {
      surface,
      files: [],
      allowMarkerPresent: false,
      effects: [],
      maxLevelUsed: "L0",
      l3Count: 0,
      l4Count: 0,
      score: 0,
      backdropOccurrences: [],
      scopes: {
        runtime: createScopeAggregate(),
        artifacts: createScopeAggregate()
      }
    };
  }
  return surfaces[surface];
}

for (const record of fileRecords) {
  const surfaceData = ensureSurface(record.surface);
  surfaceData.files.push(record.filePath);
  const scopeKey = record.scope === "artifact" ? "artifacts" : "runtime";
  const scopeData = surfaceData.scopes[scopeKey];
  scopeData.files.push(record.filePath);
  if (record.allowMarker && record.scope === "runtime") {
    surfaceData.allowMarkerPresent = true;
  }

  for (const effect of record.effects) {
    const effectWithMeta = {
      ...effect,
      file: record.filePath,
      surface: record.surface,
      scope: record.scope === "artifact" ? "artifact" : "runtime"
    };
    surfaceData.effects.push(effectWithMeta);
    scopeData.effects.push(effectWithMeta);
    applyEffectAggregate(surfaceData, effectWithMeta);
    applyEffectAggregate(scopeData, effectWithMeta);
  }
}

function addViolation(payload) {
  const scope = payload.scope || "runtime";
  const entry = {
    ...payload,
    scope,
    id: `${payload.type}-${violations.length + 1}`
  };
  violations.push(entry);
  if (scope === "artifact") {
    artifactViolations.push(entry);
  } else {
    runtimeViolations.push(entry);
  }
}

const aggregateViolationTypes = new Set([
  "max-level",
  "max-l3",
  "max-l4",
  "score-budget",
  "centralized-blur"
]);

function violationKey(violation) {
  const file = violation.file ?? "";
  const line = violation.line ?? "";
  const surface = violation.surface ?? "";
  const scope = violation.scope ?? "runtime";
  if (aggregateViolationTypes.has(violation.type)) {
    return `${violation.type}|${scope}|${surface}|${file}|${line}`;
  }
  return `${violation.type}|${scope}|${file}|${line}|${violation.message}`;
}

for (const record of fileRecords) {
  if (record.surface === "overlay" || record.surface === "inspector") {
    const hasL3 = record.effects.some(effect => effect.level === "L3");
    if (hasL3 && !record.allowMarker) {
      addViolation({
        type: "allow-marker",
        surface: record.surface,
        file: record.filePath,
        line: record.effects.find(effect => effect.level === "L3")?.line || 1,
        message: `L3 effects require ${policy.allowMarker.comment} in ${record.surface} files.`,
        scope: record.scope
      });
    }
  }

  if (record.panelBlurHits.length > 0) {
    addViolation({
      type: "no-per-panel-blur",
      surface: record.surface,
      file: record.filePath,
      line: record.panelBlurHits[0].line,
      message: "No per-panel blur: backdrop-filter on panel classes is forbidden.",
      scope: record.scope
    });
  }
}

function resolveSurfaceBudget(surface, allowMarkerPresent) {
  const surfaceConfig = policy.budgets[surface] || {};
  let maxL3 = surfaceConfig.maxL3 ?? 0;
  let scoreBudget = surfaceConfig.scoreBudget ?? 0;
  let maxLevelAllowed = surfaceConfig.maxLevel || "L0";
  let maxL4 = surfaceConfig.maxL4 ?? 0;
  let inspectorMode = null;

  if (surface === "inspector") {
    inspectorMode = allowMarkerPresent ? "unsafe" : "safe";
    const inspectorBudget = surfaceConfig[inspectorMode] || surfaceConfig.safe || {};
    maxL3 = inspectorBudget.maxL3 ?? maxL3;
    scoreBudget = inspectorBudget.scoreBudget ?? scoreBudget;
  }

  if (surfaceConfig.requiresAllowMarkerForL3 && allowMarkerPresent && maxLevelAllowed === "L2") {
    maxLevelAllowed = "L3";
  }

  return { maxL3, maxL4, scoreBudget, maxLevelAllowed, inspectorMode };
}

function addBudgetViolations(surface, stats, budget, scope) {
  if (stats.maxLevelUsed && levelRank[stats.maxLevelUsed] > levelRank[budget.maxLevelAllowed]) {
    addViolation({
      type: "max-level",
      surface,
      file: null,
      line: null,
      message: `Max level exceeded: ${stats.maxLevelUsed} used, ${budget.maxLevelAllowed} allowed.`,
      scope
    });
  }

  if (stats.l3Count > budget.maxL3) {
    addViolation({
      type: "max-l3",
      surface,
      file: null,
      line: null,
      message: `L3 count ${stats.l3Count} exceeds budget ${budget.maxL3}.`,
      scope
    });
  }

  if (stats.l4Count > budget.maxL4) {
    addViolation({
      type: "max-l4",
      surface,
      file: null,
      line: null,
      message: `L4 count ${stats.l4Count} exceeds budget ${budget.maxL4}.`,
      scope
    });
  }

  if (stats.score > budget.scoreBudget) {
    addViolation({
      type: "score-budget",
      surface,
      file: null,
      line: null,
      message: `Score ${stats.score} exceeds budget ${budget.scoreBudget}.`,
      scope
    });
  }

  if (stats.backdropOccurrences.length > 1) {
    addViolation({
      type: "centralized-blur",
      surface,
      file: null,
      line: null,
      message: `Centralized Blur Rule violated: ${stats.backdropOccurrences.length} backdrop-filters found.`,
      details: stats.backdropOccurrences,
      scope
    });
  }
}

for (const [surface, data] of Object.entries(surfaces)) {
  const budget = resolveSurfaceBudget(surface, data.allowMarkerPresent);
  addBudgetViolations(surface, data.scopes.runtime, budget, "runtime");
}

const blockedClassnames = policy.blockedClassnames || {};
for (const record of fileRecords) {
  if (!record.blockedClasses.length) continue;
  if (record.surface === "inspector" && record.allowMarker) {
    continue;
  }

  const blockedForSurface = blockedClassnames[record.surface];
  if (!blockedForSurface) continue;

  for (const blocked of record.blockedClasses) {
    if (blockedForSurface.includes(blocked.name)) {
      addViolation({
        type: "blocked-classname",
        surface: record.surface,
        file: record.filePath,
        line: blocked.line,
        message: `Blocked classname ${blocked.name} used in ${record.surface} surface.`,
        scope: record.scope
      });
    }
  }
}

const runtimeFileCount = fileRecords.filter(record => record.scope === "runtime").length;
const artifactFileCount = fileRecords.filter(record => record.scope === "artifact").length;
const runtimeEffectCount = fileRecords.reduce(
  (sum, record) => sum + (record.scope === "runtime" ? record.effects.length : 0),
  0
);
const artifactEffectCount = fileRecords.reduce(
  (sum, record) => sum + (record.scope === "artifact" ? record.effects.length : 0),
  0
);

const report = {
  policyVersion: policy.version,
  generatedAt: new Date().toISOString(),
  repoRoot,
  summary: {
    fileCount: fileRecords.length,
    effectCount: fileRecords.reduce((sum, record) => sum + record.effects.length, 0),
    violationCount: violations.length,
    runtimeFileCount,
    artifactFileCount,
    runtimeEffectCount,
    artifactEffectCount,
    runtimeViolationCount: runtimeViolations.length,
    artifactViolationCount: artifactViolations.length
  },
  surfaces: Object.fromEntries(
    Object.entries(surfaces).map(([surface, data]) => {
      const budget = resolveSurfaceBudget(surface, data.allowMarkerPresent);
      const runtime = data.scopes.runtime;
      const artifacts = data.scopes.artifacts;

      return [
        surface,
        {
          files: data.files.length,
          runtimeFiles: runtime.files.length,
          artifactFiles: artifacts.files.length,
          allowMarkerPresent: data.allowMarkerPresent,
          inspectorMode: budget.inspectorMode,
          maxLevelUsed: runtime.maxLevelUsed,
          maxLevelAllowed: budget.maxLevelAllowed,
          l3Count: runtime.l3Count,
          l4Count: runtime.l4Count,
          score: runtime.score,
          maxL3: budget.maxL3,
          maxL4: budget.maxL4,
          scoreBudget: budget.scoreBudget,
          artifactMaxLevelUsed: artifacts.maxLevelUsed,
          artifactL3Count: artifacts.l3Count,
          artifactL4Count: artifacts.l4Count,
          artifactScore: artifacts.score,
          scopes: {
            runtime: {
              files: runtime.files.length,
              maxLevelUsed: runtime.maxLevelUsed,
              l3Count: runtime.l3Count,
              l4Count: runtime.l4Count,
              score: runtime.score
            },
            artifacts: {
              files: artifacts.files.length,
              maxLevelUsed: artifacts.maxLevelUsed,
              l3Count: artifacts.l3Count,
              l4Count: artifacts.l4Count,
              score: artifacts.score
            }
          }
        }
      ];
    })
  ),
  effects: surfaces,
  violations
};

const baselineViolations = runtimeViolations;

const baselineData = {
  policyVersion: policy.version,
  generatedAt: new Date().toISOString(),
  violations: baselineViolations.map(violation => ({
    type: violation.type,
    surface: violation.surface ?? null,
    file: violation.file ?? null,
    line: violation.line ?? null,
    message: violation.message,
    scope: violation.scope ?? "runtime"
  })),
  surfaces: Object.fromEntries(
    Object.entries(report.surfaces).map(([surface, stats]) => [
      surface,
      { score: stats.score, l3Count: stats.l3Count, l4Count: stats.l4Count }
    ])
  ),
  artifactSurfaces: Object.fromEntries(
    Object.entries(report.surfaces).map(([surface, stats]) => [
      surface,
      { score: stats.artifactScore, l3Count: stats.artifactL3Count, l4Count: stats.artifactL4Count }
    ])
  )
};

if (!report.effects?.ui || !Array.isArray(report.effects.ui.effects)) {
  console.warn("[render-policy] report.effects.ui.effects missing; creating empty array.");
  report.effects = report.effects || {};
  report.effects.ui = report.effects.ui || ensureSurface("ui");
  if (!Array.isArray(report.effects.ui.effects)) report.effects.ui.effects = [];
}

const uiEffects = report.effects.ui.effects;
if (!uiEffects.some(effect => effect && effect.scope)) {
  console.warn("[render-policy] Warning: no scope found in report.effects.ui.effects.");
}

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");

let md = "# Render Effects Policy Report\n";
md += `Generated: ${report.generatedAt}\n\n`;
md += "## Summary\n";
md += `- Files scanned: ${report.summary.fileCount} (runtime ${report.summary.runtimeFileCount}, artifacts ${report.summary.artifactFileCount})\n`;
md += `- Effects detected: ${report.summary.effectCount} (runtime ${report.summary.runtimeEffectCount}, artifacts ${report.summary.artifactEffectCount})\n`;
md += `- Violations: ${report.summary.violationCount} (runtime ${report.summary.runtimeViolationCount}, artifacts ${report.summary.artifactViolationCount})\n\n`;

md += "## Surface Budgets (Runtime)\n";
md += "| Surface | Max Level Used | Max Level Allowed | L3 Count | L4 Count | Score | Score Budget |\n";
md += "| --- | --- | --- | --- | --- | --- | --- |\n";
for (const [surface, stats] of Object.entries(report.surfaces)) {
  md += `| ${surface} | ${stats.maxLevelUsed} | ${stats.maxLevelAllowed} | ${stats.l3Count} | ${stats.l4Count} | ${stats.score} | ${stats.scoreBudget} |\n`;
}
md += "\n";

md += "## Artifacts (Informational)\n";
md += "| Surface | Max Level Used | L3 Count | L4 Count | Score | Files |\n";
md += "| --- | --- | --- | --- | --- | --- |\n";
for (const [surface, stats] of Object.entries(report.surfaces)) {
  md += `| ${surface} | ${stats.artifactMaxLevelUsed} | ${stats.artifactL3Count} | ${stats.artifactL4Count} | ${stats.artifactScore} | ${stats.artifactFiles} |\n`;
}
md += "\n";

md += "## Violations\n";
if (report.violations.length === 0) {
  md += "No violations found.\n";
} else {
  for (const violation of report.violations) {
    const location = violation.file ? `${violation.file}:${violation.line || 1}` : "surface aggregate";
    const scopeLabel = violation.scope === "artifact" ? "artifact" : "runtime";
    md += `- [${violation.surface}:${scopeLabel}] ${violation.message} (${location})\n`;
  }
}

fs.writeFileSync(reportMdPath, md, "utf8");

console.log(`Render policy report written to ${reportJsonPath}`);
console.log(`Render policy report written to ${reportMdPath}`);

if (writeBaseline) {
  fs.writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2), "utf8");
  console.log(`Render policy baseline written to ${baselinePath}`);
  process.exit(0);
}

let baseline = null;
if (fs.existsSync(baselinePath)) {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

const violationsForComparison = runtimeViolations;
let newViolations = violationsForComparison;
const surfaceIncreases = [];

if (baseline) {
  const baselineViolationsList = (baseline.violations || []).filter(v => (v.scope ?? "runtime") !== "artifact");
  const baselineKeys = new Set(baselineViolationsList.map(violationKey));
  newViolations = violationsForComparison.filter(violation => !baselineKeys.has(violationKey(violation)));

  const baselineSurfaces = baseline.surfaces || {};
  for (const [surface, stats] of Object.entries(report.surfaces)) {
    const base = baselineSurfaces[surface] || { score: 0, l3Count: 0, l4Count: 0 };
    const changes = [];
    if (stats.score > base.score) {
      changes.push(`score ${base.score} -> ${stats.score}`);
    }
    if (stats.l3Count > base.l3Count) {
      changes.push(`L3 ${base.l3Count} -> ${stats.l3Count}`);
    }
    if (stats.l4Count > base.l4Count) {
      changes.push(`L4 ${base.l4Count} -> ${stats.l4Count}`);
    }
    if (changes.length > 0) {
      surfaceIncreases.push({ surface, changes });
    }
  }

  console.log("NEW violations (runtime)");
  if (newViolations.length === 0) {
    console.log("None.");
  } else {
    for (const violation of newViolations) {
      const location = violation.file ? `${violation.file}:${violation.line || 1}` : "surface aggregate";
      console.log(`- [${violation.surface}] ${violation.message} (${location})`);
    }
  }

  if (surfaceIncreases.length > 0) {
    console.log("Surface budget increases (runtime)");
    for (const increase of surfaceIncreases) {
      console.log(`- ${increase.surface}: ${increase.changes.join(", ")}`);
    }
  }

}

const shouldFail = baseline
  ? newViolations.length > 0 || surfaceIncreases.length > 0
  : runtimeViolations.length > 0;

if (shouldFail) {
  process.exit(1);
}
