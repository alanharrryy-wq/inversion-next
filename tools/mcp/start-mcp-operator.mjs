import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const IS_WIN = process.platform === "win32";
const NPM_CMD = IS_WIN ? "cmd.exe" : "npm";
const NPM_ARGS_PREFIX = IS_WIN ? ["/d", "/s", "/c", "npm"] : [];
const RUN_TESTS =
  process.argv.includes("--run-tests") || process.env.HI_RUN_TESTS === "1";
const SHUTDOWN_ON_EXIT = process.env.HI_SHUTDOWN_ON_EXIT === "1";

const DEFAULT_USER_DATA_DIR = "C:\\tmp\\hi-chrome";
const DEFAULT_DEV_TIMEOUT_MS = 120000;
const DEFAULT_INSTALL_TIMEOUT_MS = 300000;
const DEFAULT_DEVTOOLS_TIMEOUT_MS = 30000;
const DEFAULT_TEST_TIMEOUT_MS = 60000;
const DEFAULT_HTTP_TIMEOUT_MS = 4000;
const DEFAULT_RETRY_DELAY_MS = 700;
const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const DEFAULT_URL_CONTAINS = "localhost:5177/#/deck?s=2";

const STEP_PREFIX = "::STEP";
const STATUS_PREFIX = "::STATUS_JSON";

function log(msg) {
  console.log(`[mcp-start] ${msg}`);
}

function warn(msg) {
  console.warn(`[mcp-start] ${msg}`);
}

function err(msg) {
  console.error(`[mcp-start] ${msg}`);
}

function step(percent, label, message) {
  console.log(`${STEP_PREFIX} ${percent} ${label} ${message}`);
  log(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeLineReader(prefix, onLine) {
  let buffer = "";
  return (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed) continue;
      console.log(`${prefix} ${trimmed}`);
      if (onLine) onLine(trimmed);
    }
  };
}

function normalizeCommandArgs(command, args = []) {
  if (IS_WIN && command === NPM_CMD) {
    return { command, args: [...NPM_ARGS_PREFIX, ...args] };
  }
  return { command, args };
}

function runShell(command, args, options = {}) {
  const resolved = normalizeCommandArgs(command, args);
  return spawn(resolved.command, resolved.args, { ...options });
}

async function fetchWithTimeout(url, timeoutMs = DEFAULT_HTTP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHttpOk(url, timeoutMs, label) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetchWithTimeout(url, 2500);
      if (res.ok) {
        await res.text();
        return { ok: true };
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(DEFAULT_RETRY_DELAY_MS);
  }
  return { ok: false, error: lastError, label };
}

async function waitForViteReady(viteUrl, timeoutMs) {
  if (!viteUrl) {
    return { ok: false, error: new Error("Missing Vite URL") };
  }
  const probe = stripHash(viteUrl);
  return await waitForHttpOk(probe, timeoutMs, "Vite");
}

function getRepoRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8"
  });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }
  return process.cwd();
}

function normalizeUrl(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function stripHash(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function getDefaultContainsSuffix() {
  const slashIndex = DEFAULT_URL_CONTAINS.indexOf("/");
  if (slashIndex !== -1) return DEFAULT_URL_CONTAINS.slice(slashIndex);
  const hashIndex = DEFAULT_URL_CONTAINS.indexOf("#");
  if (hashIndex !== -1) return DEFAULT_URL_CONTAINS.slice(hashIndex);
  return "";
}

function buildDefaultUrlContains(viteUrl) {
  if (!viteUrl) return DEFAULT_URL_CONTAINS;
  try {
    const host = new URL(viteUrl).host;
    return `${host}${getDefaultContainsSuffix()}`;
  } catch {
    return DEFAULT_URL_CONTAINS;
  }
}

function resolveUrlConfig(viteUrl) {
  const envExact = (process.env.HI_URL_EXACT || "").trim();
  const envContains = (process.env.HI_URL_CONTAINS || "").trim();
  const hasExact = Boolean(envExact);
  const hasContains = Boolean(envContains);
  const urlExact = normalizeUrl(envExact);
  const urlContains =
    envContains || (viteUrl ? buildDefaultUrlContains(viteUrl) : DEFAULT_URL_CONTAINS);
  const urlContainsNormalized = normalizeUrl(urlContains);
  let host = "";
  try {
    if (urlExact) {
      host = new URL(urlExact).host;
    } else if (urlContainsNormalized) {
      host = new URL(urlContainsNormalized).host;
    }
  } catch {
    host = "";
  }
  const targetRaw = urlExact || urlContains || viteUrl || "";
  const targetUrl = normalizeUrl(targetRaw);
  return {
    urlExact,
    urlContains,
    urlContainsNormalized,
    host,
    hasExact,
    hasContains,
    targetUrl
  };
}

async function ensureDependencies(root) {
  const nodeModules = path.join(root, "node_modules");
  if (fs.existsSync(nodeModules)) {
    log("Dependencies already installed.");
    return;
  }
  step(10, "deps", "node_modules missing; running npm install.");
  await runCommand(NPM_CMD, ["install"], {
    cwd: root,
    timeoutMs: DEFAULT_INSTALL_TIMEOUT_MS,
    label: "npm install"
  });
}

function extractLocalUrl(line) {
  const match = line.match(
    /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+(?:\/\S*)?/i
  );
  return match ? match[0] : null;
}

async function startDevServer(root) {
  step(20, "vite", "Starting Vite dev server...");
  const proc = runShell(NPM_CMD, ["run", "dev"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true
  });

  const state = { url: null, resolved: false };

  const urlPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!state.resolved) {
        reject(new Error("Timed out waiting for Vite URL."));
      }
    }, DEFAULT_DEV_TIMEOUT_MS);

    const onLine = (line) => {
      const url = extractLocalUrl(line);
      if (url && !state.resolved) {
        state.url = url;
        state.resolved = true;
        clearTimeout(timeout);
        resolve(url);
      }
    };

    proc.stdout.on("data", makeLineReader("[vite]", onLine));
    proc.stderr.on("data", makeLineReader("[vite:err]"));

    proc.on("exit", (code) => {
      if (!state.resolved) {
        clearTimeout(timeout);
        reject(new Error(`Vite exited before URL (code ${code}).`));
      }
    });
  });

  return { proc, urlPromise };
}

async function detectExistingViteUrl(extraCandidates = [], probeTimeoutMs = 8000) {
  const candidates = [
    ...extraCandidates,
    process.env.HI_URL_EXACT || "",
    process.env.HI_URL_CONTAINS || "",
    DEFAULT_URL_CONTAINS
  ]
    .map((candidate) => normalizeUrl(candidate))
    .filter(Boolean);

  for (const candidate of candidates) {
    const probe = stripHash(candidate);
    const check = await waitForHttpOk(probe, probeTimeoutMs, "Vite");
    if (check.ok) {
      return candidate;
    }
  }

  return null;
}

async function waitForViteUrl(urlPromise, timeoutMs) {
  const started = Date.now();
  let pendingError = null;
  const trackedPromise = urlPromise
    .then((url) => ({ type: "url", url }))
    .catch((error) => ({ type: "error", error }));

  while (Date.now() - started < timeoutMs) {
    const result = await Promise.race([
      trackedPromise,
      sleep(DEFAULT_RETRY_DELAY_MS).then(() => ({ type: "tick" }))
    ]);

    if (result.type === "url") return result.url;
    if (result.type === "error") {
      pendingError = result.error;
      break;
    }

    const existing = await detectExistingViteUrl([], 1500);
    if (existing) return existing;
  }

  if (pendingError) {
    throw pendingError;
  }
  throw new Error("Timed out waiting for Vite URL.");
}

function findPlaywrightChromium() {
  const local = process.env.LOCALAPPDATA || "";
  const root = local ? path.join(local, "ms-playwright") : null;
  if (!root || !fs.existsSync(root)) return null;

  const candidates = [];
  const walk = (dir, depth) => {
    if (depth < 0) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth - 1);
      } else if (entry.isFile() && entry.name.toLowerCase() === "chrome.exe") {
        candidates.push(full);
      }
    }
  };

  walk(root, 6);
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    try {
      return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
    } catch {
      return 0;
    }
  });

  return candidates[0];
}

function findSystemChrome() {
  const candidates = [
    process.env.PROGRAMFILES &&
      path.join(
        process.env.PROGRAMFILES,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
    process.env["PROGRAMFILES(X86)"] &&
      path.join(
        process.env["PROGRAMFILES(X86)"],
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
    process.env.LOCALAPPDATA &&
      path.join(
        process.env.LOCALAPPDATA,
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      )
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function startChromium() {
  step(40, "chromium", "Starting Chromium with remote debugging...");
  const chromiumPath = findPlaywrightChromium() || findSystemChrome();
  if (!chromiumPath) {
    throw new Error("Chrome/Chromium not found. Install Chrome or Playwright.");
  }

  const userDataDir = process.env.HI_CHROME_USER_DATA || DEFAULT_USER_DATA_DIR;
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = ["--remote-debugging-port=9222", `--user-data-dir=${userDataDir}`];
  const proc = spawn(chromiumPath, args, {
    detached: true,
    stdio: "ignore"
  });
  proc.unref();

  log(`Chromium launched: ${chromiumPath}`);
  return { chromiumPath, userDataDir, pid: proc.pid };
}

function getDevtoolsOrigin() {
  const raw = (process.env.HI_BROWSER_URL || DEFAULT_BROWSER_URL).trim();
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_BROWSER_URL;
  }
}

function openTargetViaLaunch(chromiumPath, userDataDir, targetUrl) {
  if (!chromiumPath || !targetUrl) return false;
  const args = [`--user-data-dir=${userDataDir}`, targetUrl];
  const proc = spawn(chromiumPath, args, { detached: true, stdio: "ignore" });
  proc.unref();
  log(`Opened target via Chromium launch: ${targetUrl}`);
  return true;
}

async function openTargetInChromium(targetUrl, chromiumInfo, attempts = 2) {
  if (!targetUrl) return false;
  const origin = getDevtoolsOrigin();
  const openUrl = `${origin}/json/new?${encodeURIComponent(targetUrl)}`;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetchWithTimeout(openUrl, 4000);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      await res.text();
      log(`Opened target in Chromium: ${targetUrl}`);
      return true;
    } catch (error) {
      warn(`Open target attempt ${i} failed: ${error?.message || error}`);
      await sleep(DEFAULT_RETRY_DELAY_MS);
    }
  }

  if (openTargetViaLaunch(chromiumInfo?.chromiumPath, chromiumInfo?.userDataDir, targetUrl)) {
    return true;
  }

  warn(`Unable to open target via DevTools. Open manually: ${targetUrl}`);
  return false;
}

async function listDevtoolsPages() {
  const origin = getDevtoolsOrigin();
  const res = await fetchWithTimeout(`${origin}/json`, 4000);
  if (!res.ok) {
    throw new Error(`DevTools /json failed: HTTP ${res.status}`);
  }
  return await res.json();
}

async function activateDevtoolsPage(criteria, attempts = 2) {
  for (let i = 1; i <= attempts; i += 1) {
    const pages = await listDevtoolsPages();
    if (!Array.isArray(pages)) return null;

    const match = matchTargetPage(pages, criteria);
    if (!match || !match.id) return null;

    const origin = getDevtoolsOrigin();
    const res = await fetchWithTimeout(
      `${origin}/json/activate/${match.id}`,
      4000
    );
    if (res.ok) {
      await res.text();
      return match.url || null;
    }
    await sleep(DEFAULT_RETRY_DELAY_MS);
  }

  return null;
}

async function runCommand(command, args, { cwd, timeoutMs, label, env } = {}) {
  return new Promise((resolve, reject) => {
    const resolved = normalizeCommandArgs(command, args);
    const proc = spawn(resolved.command, resolved.args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: env || process.env
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`${label || command} timed out.`));
    }, timeoutMs || 30000);

    proc.stdout.on("data", (buf) => {
      stdout += buf.toString("utf8");
    });
    proc.stderr.on("data", (buf) => {
      stderr += buf.toString("utf8");
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (code && code !== 0) {
        reject(
          new Error(
            `${label || command} exited with code ${code}.\n${stderr.trim()}`
          )
        );
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function parseTestClientJson(output) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith("{")) continue;
    try {
      return JSON.parse(lines[i]);
    } catch {
      continue;
    }
  }
  return null;
}

function parseHiListPages(result) {
  const text =
    result?.hiListPages?.content?.find((c) => c.type === "text")?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findSelectedPage(pages) {
  return pages.find((page) => page.selected) || null;
}

function pageMatchesCriteria(pageUrl, criteria) {
  if (!pageUrl) return false;
  if (criteria.urlExact && pageUrl === criteria.urlExact) return true;
  if (criteria.urlContains && pageUrl.includes(criteria.urlContains)) return true;
  if (
    criteria.urlContainsNormalized &&
    pageUrl.includes(criteria.urlContainsNormalized)
  ) {
    return true;
  }
  if (!criteria.hasExact && !criteria.hasContains && criteria.host) {
    return pageUrl.includes(criteria.host);
  }
  return false;
}

function matchTargetPage(pages, criteria) {
  return pages.find((page) => pageMatchesCriteria(page.url, criteria)) || null;
}

async function runTestClient(root, env) {
  const result = await runCommand(
    NPM_CMD,
    ["run", "mcp:test-client", "--", "--json"],
    {
      cwd: root,
      timeoutMs: DEFAULT_TEST_TIMEOUT_MS,
      label: "mcp:test-client",
      env
    }
  );
  return parseTestClientJson(result.stdout);
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // ignore
  }
}

function closeDetached(proc) {
  if (!proc) return;
  try {
    proc.stdout?.destroy();
    proc.stderr?.destroy();
  } catch {
    // ignore
  }
  try {
    proc.unref();
  } catch {
    // ignore
  }
}

async function run() {
  const root = getRepoRoot();
  process.chdir(root);

  const children = [];
  const addChild = (name, pid) => {
    if (pid) children.push({ name, pid });
  };

  const cleanupChildren = (reason) => {
    for (const child of children) {
      log(`Stopping ${child.name} (pid ${child.pid})${reason ? `: ${reason}` : ""}`);
      killProcessTree(child.pid);
    }
  };

  const cleanupOnFailure = () => {
    cleanupChildren("failure");
  };

  process.on("SIGINT", () => {
    cleanupOnFailure();
    process.exit(1);
  });
  process.on("SIGTERM", () => {
    cleanupOnFailure();
    process.exit(1);
  });

  try {
    step(5, "repo", `Repo root: ${root}`);
    await ensureDependencies(root);

    let devProc = null;
    let viteUrl = null;
    let viteReady = null;

    try {
      const dev = await startDevServer(root);
      devProc = dev.proc;
      addChild("vite", devProc.pid);
      viteUrl = await waitForViteUrl(dev.urlPromise, DEFAULT_DEV_TIMEOUT_MS);
      log(`Vite running at ${viteUrl}`);
    } catch (error) {
      warn(`Vite failed to start: ${error?.message || error}`);
      step(25, "vite", "Looking for existing Vite server...");
      const existing = await detectExistingViteUrl();
      if (!existing) {
        throw new Error("Vite failed to start and no existing server was found.");
      }
      viteUrl = existing;
      log(`Using existing Vite server at ${viteUrl}`);
    }

    step(30, "vite", "Waiting for Vite to respond...");
    viteReady = await waitForViteReady(viteUrl, DEFAULT_DEV_TIMEOUT_MS);
    if (!viteReady.ok) {
      throw new Error(
        `Vite not reachable. ${viteReady.error?.message || ""}`.trim()
      );
    }
    log("Vite ready.");

    const urlConfig = resolveUrlConfig(viteUrl);
    if (!urlConfig.targetUrl) {
      throw new Error("Target URL could not be determined.");
    }
    log(`Target URL: ${urlConfig.targetUrl}`);

    const chromium = startChromium();
    addChild("chromium", chromium.pid);

    const devtoolsJsonUrl = `${getDevtoolsOrigin()}/json`;
    step(55, "devtools", `Waiting for DevTools: ${devtoolsJsonUrl}`);
    const devtoolsCheck = await waitForHttpOk(
      devtoolsJsonUrl,
      DEFAULT_DEVTOOLS_TIMEOUT_MS,
      "DevTools"
    );
    const devtoolsOk = Boolean(devtoolsCheck.ok);
    if (!devtoolsOk) {
      throw new Error(
        `DevTools not reachable. ${devtoolsCheck.error?.message || ""}`.trim()
      );
    }
    log("DevTools reachable.");

    step(60, "target", "Opening target URL in Chromium...");
    await openTargetInChromium(urlConfig.targetUrl, chromium, 3);

    let activatedUrl = null;
    try {
      activatedUrl = await activateDevtoolsPage(urlConfig, 3);
      if (activatedUrl) {
        log(`Activated target page: ${activatedUrl}`);
      }
    } catch (error) {
      warn(`Unable to activate target page: ${error?.message || error}`);
    }

    const childEnv = { ...process.env };
    if (!childEnv.HI_BROWSER_URL) {
      childEnv.HI_BROWSER_URL = DEFAULT_BROWSER_URL;
    }
    if (!childEnv.HI_URL_EXACT && urlConfig.urlExact) {
      childEnv.HI_URL_EXACT = urlConfig.urlExact;
    }
    if (!childEnv.HI_URL_CONTAINS && urlConfig.urlContains) {
      childEnv.HI_URL_CONTAINS = urlConfig.urlContains;
    }

    step(70, "operator", "Starting MCP operator...");
    const mcpProc = runShell(NPM_CMD, ["run", "mcp:operator"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      env: childEnv
    });
    addChild("operator", mcpProc.pid);
    mcpProc.stdout.on("data", makeLineReader("[mcp]"));
    mcpProc.stderr.on("data", makeLineReader("[mcp:err]"));

    await sleep(800);

    step(80, "health", "Running MCP test client...");
    let testResult = null;
    try {
      testResult = await runTestClient(root, childEnv);
    } catch (error) {
      warn(`Test client failed: ${error?.message || error}`);
      log("Retrying test client once...");
      testResult = await runTestClient(root, childEnv);
    }

    if (!testResult) {
      throw new Error("Test client output could not be parsed.");
    }

    let hiList = parseHiListPages(testResult);
    if (!hiList || !Array.isArray(hiList.pages)) {
      throw new Error("hi_list_pages did not return a page list.");
    }

    let selected = findSelectedPage(hiList.pages);
    let targetPage = matchTargetPage(hiList.pages, urlConfig);
    let selectionOk =
      selected && pageMatchesCriteria(selected.url, urlConfig);

    if (!targetPage || !selectionOk) {
      warn("Selected page does not match expected target. Retrying open/select...");
      await openTargetInChromium(urlConfig.targetUrl, chromium, 2);
      try {
        activatedUrl = await activateDevtoolsPage(urlConfig, 2);
        if (activatedUrl) {
          log(`Activated target page: ${activatedUrl}`);
        }
      } catch (error) {
        warn(`Activate retry failed: ${error?.message || error}`);
      }

      const retryResult = await runTestClient(root, childEnv);
      hiList = parseHiListPages(retryResult);
      if (!hiList || !Array.isArray(hiList.pages)) {
        throw new Error("hi_list_pages did not return a page list (retry).");
      }
      selected = findSelectedPage(hiList.pages);
      targetPage = matchTargetPage(hiList.pages, urlConfig);
      selectionOk = selected && pageMatchesCriteria(selected.url, urlConfig);
    }

    if (!targetPage) {
      throw new Error("Target URL not found in hi_list_pages.");
    }

    if (!selectionOk) {
      throw new Error("Selected page does not match expected target after retry.");
    }

    let testClientResult = RUN_TESTS ? "PASS" : "SKIPPED";
    if (RUN_TESTS) {
      step(90, "tests", "Running verification checks...");
      const viteCheck = await waitForViteReady(viteUrl, 15000);
      if (!viteCheck.ok) {
        testClientResult = "FAIL";
        warn(`Vite health check failed: ${viteCheck.error?.message || ""}`);
      }
      const extra = await runTestClient(root, childEnv);
      if (!extra) {
        testClientResult = "FAIL";
        warn("Test client failed during verification run.");
      }
    }

    const summary = {
      viteUrl,
      devtoolsJson: devtoolsJsonUrl,
      devtoolsOk,
      operatorPid: mcpProc.pid || null,
      operatorRunning: isPidAlive(mcpProc.pid),
      tools: testResult.tools || [],
      selectedPageUrl: selected?.url || "unknown",
      testClient: testClientResult
    };

    console.log("STATUS SUMMARY");
    console.log(`Vite URL: ${summary.viteUrl}`);
    console.log(
      `DevTools JSON: ${summary.devtoolsOk ? "OK" : "FAIL"} (${summary.devtoolsJson})`
    );
    console.log(`Selected page URL: ${summary.selectedPageUrl}`);
    console.log(
      `Operator server running: ${summary.operatorRunning ? "yes" : "no"}`
    );
    console.log(`Operator PID: ${summary.operatorPid ?? "unknown"}`);
    console.log(`Test client: ${summary.testClient}`);
    console.log(`Operator tools: ${summary.tools.join(", ") || "none"}`);
    console.log("END STATUS SUMMARY");
    console.log(`${STATUS_PREFIX} ${JSON.stringify(summary)}`);

    if (RUN_TESTS && summary.testClient !== "PASS") {
      throw new Error("Verification failed.");
    }

    step(100, "done", "Startup complete.");

    closeDetached(devProc);
    closeDetached(mcpProc);

    if (SHUTDOWN_ON_EXIT) {
      log("HI_SHUTDOWN_ON_EXIT=1; stopping started processes.");
      cleanupChildren("shutdown");
    }
  } catch (error) {
    cleanupOnFailure();
    throw error;
  }
}

run().catch((error) => {
  err(error?.message || error);
  process.exitCode = 1;
});
