import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEFAULT_URL_CONTAINS = "localhost:5177/#/deck?s=2";
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 20000;
const MIN_RUN_TIMEOUT_MS = 60000;

function resolveRepoRoot() {
  const fileDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(fileDir, "../../..");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

function tryReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function formatPct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${value.toFixed(2)}%`;
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function listFilesRecursive(dir, rootDir = dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(full, rootDir));
    } else {
      const rel = path.relative(rootDir, full).replace(/\\/g, "/");
      files.push(rel);
    }
  }
  return files.sort();
}

function isSubpath(parent, child) {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function parseArgs(argv) {
  const options = {
    retries: DEFAULT_RETRIES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    profile: "info",
    dryRun: false,
    list: false,
    confirm: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--slide":
        options.slide = argv[++i];
        break;
      case "--tool":
        options.tool = argv[++i];
        break;
      case "--retries":
        options.retries = Number(argv[++i]);
        break;
      case "--timeoutMs":
        options.timeoutMs = Number(argv[++i]);
        break;
      case "--profile":
        options.profile = argv[++i];
        break;
      case "--dryRun":
        options.dryRun = true;
        break;
      case "--yes":
      case "--confirm":
      case "--force":
        options.confirm = true;
        break;
      case "--list":
        options.list = true;
        break;
      default:
        if (arg?.startsWith("--")) {
          options.unknown = options.unknown || [];
          options.unknown.push(arg);
        }
        break;
    }
  }

  return options;
}

function normalizeRetries(value, fallback) {
  if (Number.isFinite(value) && value >= 0) return Math.floor(value);
  return fallback;
}

function normalizeTimeout(value, fallback) {
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return fallback;
}

function killProcessTree(proc) {
  if (!proc || !proc.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    return;
  }
  try {
    proc.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function runNodeScript(scriptPath, { timeoutMs = 45000 } = {}) {
  const absPath = path.resolve(resolveRepoRoot(), scriptPath);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [absPath], {
      stdio: "inherit",
      cwd: resolveRepoRoot(),
      env: { ...process.env }
    });

    const timer = setTimeout(() => {
      killProcessTree(child);
      resolve({ ok: false, timeout: true });
    }, timeoutMs);

    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, timeout: false, code });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, timeout: false, error: err });
    });
  });
}

async function runToolOnce({ toolPath, env, cwd, timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [toolPath], {
      cwd,
      env,
      stdio: "inherit"
    });

    const timer = setTimeout(() => {
      killProcessTree(child);
      resolve({ ok: false, timeout: true });
    }, timeoutMs);

    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, timeout: false, code, signal });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, timeout: false, error: err });
    });
  });
}

async function runToolWithRetries({
  toolPath,
  env,
  cwd,
  timeoutMs,
  retries
}) {
  let lastResult = null;
  let doctorRan = false;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    console.log(`[runner] tool attempt ${attempt}/${retries + 1}`);
    const result = await runToolOnce({ toolPath, env, cwd, timeoutMs });
    lastResult = result;
    if (result.ok) {
      return result;
    }

    if (result.timeout) {
      console.warn("[runner] tool timed out, killed process tree");
      if (attempt >= 2 && !doctorRan) {
        console.warn("[runner] running mcp-doctor before retry");
        await runNodeScript("tools/mcp/mcp-doctor.mjs", { timeoutMs: 45000 });
        doctorRan = true;
      }
    } else if (result.code) {
      console.warn(`[runner] tool exited with code ${result.code}`);
    }

    if (attempt <= retries) {
      const delay = Math.min(2000, 300 * Math.pow(2, attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult;
}

function buildTriageSummary({
  slideId,
  runName,
  steps,
  baseOutDir
}) {
  const refDir = path.join(baseOutDir, "reference-diff");
  const mapDir = path.join(baseOutDir, "element-map");
  const measureDir = path.join(baseOutDir, "auto-measure");

  const score = tryReadJson(path.join(refDir, "diff.score.json"));
  const passLabel = score?.passed ? "PASS" : "FAIL";
  const diffPct = Number.isFinite(score?.diffPct)
    ? `${score.diffPct.toFixed(2)}%`
    : "n/a";
  const threshold = Number.isFinite(score?.thresholdPct)
    ? `${score.thresholdPct.toFixed(2)}%`
    : "n/a";

  const map = tryReadJson(path.join(mapDir, "elements.map.json"));
  const measure = tryReadJson(path.join(measureDir, "measurements.json"));
  const mapSelectorMismatch = Boolean(map?.selectorMismatch);
  const mapFallbackUsed = Boolean(map?.fallbackUsed);
  const mapBlocks = Array.isArray(map?.elements) ? map.elements.length : 0;

  const measureSelectorMismatch = Boolean(measure?.selectorMismatch);
  const measureFallbackUsed = Boolean(measure?.fallbackUsed);
  const measureBlocks = Array.isArray(measure?.fallback) && measure.fallback.length
    ? measure.fallback.length
    : Array.isArray(measure?.elements)
        ? measure.elements.filter((el) => el?.found).length
        : 0;

  const lines = [
    "# TRIAGE SUMMARY",
    "",
    `Slide: ${slideId}`,
    `Run: ${runName}`,
    "",
    "reference-diff:",
    `- status: ${passLabel}`,
    `- diffPct: ${diffPct}`,
    `- threshold: ${threshold}`,
    "- report: reference-diff/report.html",
    "- heatmap: reference-diff/heatmap.png",
    "- groups: reference-diff/diff.groups.json",
    "- masks: reference-diff/mask.suggest.json",
    "",
    "element-map:",
    "- annotated: element-map/annotated.png",
    "- map: element-map/elements.map.json",
    `- selectorMismatch: ${mapSelectorMismatch}`,
    `- fallbackUsed: ${mapFallbackUsed}`,
    `- blocks: ${mapBlocks}`,
    "",
    "auto-measure:",
    "- measurements: auto-measure/measurements.json",
    "- pretty: auto-measure/measurements.pretty.txt",
    `- selectorMismatch: ${measureSelectorMismatch}`,
    `- fallbackUsed: ${measureFallbackUsed}`,
    `- blocks: ${measureBlocks}`,
    ""
  ];

  if (steps?.length) {
    lines.push("steps:");
    for (const step of steps) {
      lines.push(`- ${step.toolId}: ${step.ok ? "ok" : "failed"}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolveRepoRoot();
  const manifestPath = path.join(repoRoot, "tools/mcp/catalog/manifest.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);

  if (options.list) {
    const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
    if (!tools.length) {
      console.log("[runner] No tools in manifest.");
      return;
    }
    console.log("[runner] Catalog tools:");
    for (const tool of tools) {
      console.log(
        `- ${tool.id} (${tool.status || "active"}) -> ${tool.entry || "n/a"}`
      );
    }
    console.log("- triage (alias) -> reference-diff + element-map + auto-measure");
    return;
  }

  if (!options.slide || !options.tool) {
    throw new Error("Usage: node tools/mcp/runner/run.mjs --slide <id> --tool <id>");
  }

  const toolId = options.tool.trim();
  const slideId = options.slide.trim();
  const isTriage = toolId === "triage";
  const retries = normalizeRetries(options.retries, DEFAULT_RETRIES);
  const timeoutMs = normalizeTimeout(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const runTimeoutMs = Math.max(MIN_RUN_TIMEOUT_MS, timeoutMs * 4);

  const toolEntry = isTriage
    ? null
    : (manifest.tools || []).find((t) => t.id === toolId);
  if (!isTriage && (!toolEntry || !toolEntry.entry)) {
    throw new Error(`Tool not found in manifest: ${toolId}`);
  }

  const toolPath = !isTriage
    ? path.resolve(repoRoot, toolEntry.entry)
    : null;
  if (!isTriage && !fs.existsSync(toolPath)) {
    throw new Error(`Tool entry missing: ${toolPath}`);
  }

  const slideDir = path.join(repoRoot, "src/slides", slideId);
  if (!fs.existsSync(slideDir)) {
    throw new Error(`Slide directory not found: ${slideDir}`);
  }

  const toolsDir = path.join(slideDir, "tools");
  const mcpDir = path.join(toolsDir, "mcp");
  const configPath = path.join(mcpDir, "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing slide MCP config: ${configPath}`);
  }

  const config = readJson(configPath);
  const refRel = config?.reference?.png || "ref/reference.png";

  const outRoot = path.join(mcpDir, "out");
  const baseRun = `run_${formatTimestamp(new Date())}`;
  let outDir = path.join(outRoot, baseRun);
  if (fs.existsSync(outDir)) {
    let suffix = 1;
    while (fs.existsSync(outDir)) {
      outDir = path.join(outRoot, `${baseRun}_${suffix}`);
      suffix += 1;
    }
  }

  ensureDir(outDir);
  if (!isSubpath(outRoot, outDir)) {
    throw new Error("Output dir must be inside HI_OUT_ROOT.");
  }

  const urlExact =
    (process.env.HI_URL_EXACT || "").trim() ||
    (config?.slide?.urlExact || "").trim();
  const urlContains =
    (process.env.HI_URL_CONTAINS || "").trim() ||
    (config?.slide?.urlContains || "").trim() ||
    DEFAULT_URL_CONTAINS;

  const env = {
    ...process.env,
    HI_SLIDE_ID: slideId,
    HI_SLIDE_DIR: slideDir,
    HI_TOOLS_DIR: toolsDir,
    HI_MCP_DIR: mcpDir,
    HI_REF_PNG: path.resolve(mcpDir, refRel),
    HI_REF_DIR: path.dirname(path.resolve(mcpDir, refRel)),
    HI_OUT_ROOT: outRoot,
    HI_OUT_DIR: outDir,
    HI_URL_EXACT: urlExact,
    HI_URL_CONTAINS: urlContains,
    HI_BROWSER_URL: (process.env.HI_BROWSER_URL || DEFAULT_BROWSER_URL).trim(),
    HI_TIMEOUT_MS: String(timeoutMs),
    HI_RETRIES: String(retries),
    HI_PROFILE: options.profile || "info",
    HI_CONFIRM: options.confirm ? "true" : ""
  };

  const startedAt = new Date();
  const status = {
    toolId,
    slideId,
    outDir,
    ok: false,
    startedAt: startedAt.toISOString(),
    finishedAt: "",
    durationMs: 0,
    artifacts: [],
    warnings: [],
    errors: []
  };

  if (options.dryRun) {
    status.ok = true;
    status.warnings.push("dryRun: tool execution skipped");
    status.finishedAt = new Date().toISOString();
    status.durationMs = Date.now() - startedAt.getTime();
    status.artifacts = listFilesRecursive(outDir);
    writeJson(path.join(outDir, "status.json"), status);
    console.log(`[runner] dryRun complete. outDir: ${outDir}`);
    return;
  }

  if (toolId === "capture-reference" && !options.confirm) {
    status.ok = false;
    status.errors.push(
      "Confirmation required: pass --yes, --confirm, or --force"
    );
    status.finishedAt = new Date().toISOString();
    status.durationMs = Date.now() - startedAt.getTime();
    const artifacts = listFilesRecursive(outDir);
    if (!artifacts.includes("status.json")) artifacts.push("status.json");
    artifacts.sort();
    status.artifacts = artifacts;
    writeJson(path.join(outDir, "status.json"), status);
    console.log("[runner] capture-reference blocked: confirmation required");
    console.log(`[runner] status.json: ${path.join(outDir, "status.json")}`);
    return;
  }

  if (isTriage) {
    console.log(`[runner] Running triage for ${slideId}`);
    console.log(`[runner] outDir: ${outDir}`);
    const toolsToRun = ["reference-diff", "element-map", "auto-measure"];
    const steps = [];

    for (const stepId of toolsToRun) {
      const entry = (manifest.tools || []).find((t) => t.id === stepId);
      if (!entry || !entry.entry) {
        throw new Error(`Tool not found in manifest: ${stepId}`);
      }
      const stepPath = path.resolve(repoRoot, entry.entry);
      if (!fs.existsSync(stepPath)) {
        throw new Error(`Tool entry missing: ${stepPath}`);
      }

      const stepOutDir = path.join(outDir, stepId);
      ensureDir(stepOutDir);
      if (!isSubpath(outDir, stepOutDir)) {
        throw new Error("Triage outDir must be inside run outDir.");
      }

      const stepEnv = {
        ...env,
        HI_OUT_DIR: stepOutDir
      };

      console.log(`[runner] Running ${stepId}...`);
      const result = await runToolWithRetries({
        toolPath: stepPath,
        env: stepEnv,
        cwd: repoRoot,
        timeoutMs: runTimeoutMs,
        retries
      });

      const stepRecord = {
        toolId: stepId,
        ok: Boolean(result?.ok),
        outDir: stepOutDir,
        timeout: Boolean(result?.timeout),
        exitCode: result?.code ?? null
      };
      steps.push(stepRecord);

      if (!result?.ok) {
        status.errors.push(
          result?.timeout
            ? `${stepId}: timed out`
            : `${stepId}: failed`
        );
      }
    }

    status.ok = steps.every((step) => step.ok);
    status.steps = steps;
    status.finishedAt = new Date().toISOString();
    status.durationMs = Date.now() - startedAt.getTime();

    const triageSummary = buildTriageSummary({
      slideId,
      runName: path.basename(outDir),
      steps,
      baseOutDir: outDir
    });
    fs.writeFileSync(path.join(outDir, "TRIAGE_SUMMARY.md"), triageSummary, "utf8");
    status.artifacts = listFilesRecursive(outDir);

    writeJson(path.join(outDir, "status.json"), status);

    console.log(`[runner] triage ok=${status.ok} durationMs=${status.durationMs}`);
    console.log(`[runner] artifacts: ${status.artifacts.join(", ") || "none"}`);
    console.log(`[runner] status.json: ${path.join(outDir, "status.json")}`);
    return;
  }

  console.log(`[runner] Running ${toolId} for ${slideId}`);
  console.log(`[runner] outDir: ${outDir}`);

  const result = await runToolWithRetries({
    toolPath,
    env,
    cwd: repoRoot,
    timeoutMs: runTimeoutMs,
    retries
  });

  if (!result || !result.ok) {
    status.errors.push(
      result?.timeout ? "Tool timed out." : "Tool failed."
    );
    if (result?.code) {
      status.errors.push(`Exit code: ${result.code}`);
    }
  } else {
    status.ok = true;
  }

  status.finishedAt = new Date().toISOString();
  status.durationMs = Date.now() - startedAt.getTime();
  status.artifacts = listFilesRecursive(outDir);

  let diffSummary = null;
  if (toolId === "reference-diff") {
    const score = tryReadJson(path.join(outDir, "diff.score.json"));
    const meta = tryReadJson(path.join(outDir, "diff.meta.json"));
    if (score && typeof score === "object") {
      status.metrics = {
        diffPct: score.diffPct ?? null,
        passed: score.passed ?? false,
        thresholdPct: score.thresholdPct ?? null,
        timeMs: score.timeMs ?? null,
        regionsCount: score.regionsCount ?? null
      };
      const passLabel = score.passed ? "PASS" : "FAIL";
      diffSummary = `reference-diff: diffPct=${formatPct(score.diffPct)} threshold=${formatPct(score.thresholdPct)} ${passLabel} outDir=${outDir}`;
    }
    if (meta && typeof meta === "object") {
      if (meta.capture) status.capture = meta.capture;
      if (meta.normalization) status.normalization = meta.normalization;
      if (meta.reference) status.reference = meta.reference;
      if (meta.current) status.current = meta.current;
    }
  }

  if (toolId === "capture-reference") {
    const toolStatus = tryReadJson(path.join(outDir, "status.json"));
    if (toolStatus && typeof toolStatus === "object") {
      if (toolStatus.ok === false) {
        status.ok = false;
      }
      if (Array.isArray(toolStatus.warnings)) {
        status.warnings.push(...toolStatus.warnings);
      }
      if (Array.isArray(toolStatus.errors)) {
        status.errors.push(...toolStatus.errors);
      }
      status.captureReference = {
        url: toolStatus.url ?? null,
        reference: toolStatus.reference ?? null,
        viewport: toolStatus.viewport ?? null,
        durationMs: toolStatus.durationMs ?? null
      };
    }
  }

  if (toolId === "auto-measure") {
    const measures = tryReadJson(path.join(outDir, "measurements.json"));
    if (measures && typeof measures === "object") {
      const selectorMismatch = Boolean(measures.selectorMismatch);
      const fallbackUsed = Boolean(measures.fallbackUsed);
      status.measurements = {
        selectorMismatch,
        fallbackUsed,
        foundCount: measures.foundCount ?? null,
        fallbackCount: Array.isArray(measures.fallback)
          ? measures.fallback.length
          : null,
        missingCount: Array.isArray(measures.missing)
          ? measures.missing.length
          : null
      };
      if (selectorMismatch) {
        status.warnings.push("selectorMismatch=true");
      }
      if (fallbackUsed) {
        status.warnings.push("fallbackUsed=true");
      }
    }
  }

  writeJson(path.join(outDir, "status.json"), status);

  console.log(`[runner] done ok=${status.ok} durationMs=${status.durationMs}`);
  console.log(`[runner] artifacts: ${status.artifacts.join(", ") || "none"}`);
  console.log(`[runner] status.json: ${path.join(outDir, "status.json")}`);
  if (diffSummary) {
    console.log(diffSummary);
  }
}

main().catch((err) => {
  console.error(`[runner] failed: ${err?.message || err}`);
  process.exitCode = 1;
});
