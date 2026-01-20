import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_BROWSER_URL = "http://127.0.0.1:9222";
const DEFAULT_URL_CONTAINS = "localhost:5177/#/deck?s=2";

function normalizeTargetUrl(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function getBrowserOrigin() {
  const browserUrl = (process.env.HI_BROWSER_URL || DEFAULT_BROWSER_URL).trim();
  try {
    return new URL(browserUrl).origin;
  } catch {
    return DEFAULT_BROWSER_URL;
  }
}

async function fetchWithTimeout(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForDevtoolsJson({ attempts = 6, delayMs = 600 } = {}) {
  const origin = getBrowserOrigin();
  const url = `${origin}/json`;
  let lastError = null;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        await res.text();
        return { ok: true, url };
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { ok: false, url, error: lastError };
}

function runTestClient(timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      ["tools/mcp/test-mcp-client.mjs", "--json"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("test client timed out"));
    }, timeoutMs);

    proc.stdout.on("data", (buf) => {
      stdout += buf.toString("utf8");
    });
    proc.stderr.on("data", (buf) => {
      stderr += buf.toString("utf8");
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      if (code && code !== 0) {
        reject(new Error(`test client exited with code ${code}\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
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

function extractHiListPages(result) {
  const text =
    result?.hiListPages?.content?.find((c) => c.type === "text")?.text || "";
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function checkSelectedPage(pages, { urlExact, urlContains }) {
  const selected = pages.find((p) => p.selected);
  if (!selected) {
    return { ok: false, selected: null, reason: "No selected page." };
  }
  if (urlExact) {
    return {
      ok: selected.url === urlExact,
      selected,
      reason: selected.url === urlExact ? null : "Selected URL != HI_URL_EXACT."
    };
  }
  if (urlContains) {
    return {
      ok: (selected.url || "").includes(urlContains),
      selected,
      reason:
        (selected.url || "").includes(urlContains) ? null : "Selected URL mismatch."
    };
  }
  return { ok: true, selected, reason: null };
}

async function main() {
  const urlExact = (process.env.HI_URL_EXACT || "").trim();
  const urlContains =
    (process.env.HI_URL_CONTAINS || "").trim() || DEFAULT_URL_CONTAINS;
  const target = urlExact || urlContains;
  const targetUrl = normalizeTargetUrl(target);

  console.log("MCP Doctor");
  console.log(`Target hint: ${target}`);

  const devtools = await waitForDevtoolsJson();
  if (!devtools.ok) {
    console.error(
      `DevTools not reachable at ${devtools.url} (${devtools.error?.message || devtools.error}).`
    );
    console.log("Next steps:");
    console.log("- Launch Chrome with --remote-debugging-port=9222.");
    console.log("- Or run tools/mcp/Start-HitechOperator.ps1.");
    return;
  }
  console.log(`DevTools reachable: ${devtools.url}`);

  let testOutput;
  try {
    testOutput = await runTestClient();
  } catch (err) {
    console.error(`Test client failed: ${err?.message || err}`);
    console.log("Next steps:");
    console.log("- Ensure npm dependencies are installed.");
    console.log("- Run: npm run mcp:test-client");
    return;
  }

  const parsed = parseTestClientJson(testOutput.stdout);
  if (!parsed) {
    console.error("Unable to parse test client output.");
    console.log("Raw output:");
    console.log(testOutput.stdout.trim());
    return;
  }

  const toolNames = parsed.tools || [];
  console.log("Tools:", toolNames.join(", "));

  const hiListPages = extractHiListPages(parsed);
  if (!hiListPages || !Array.isArray(hiListPages.pages)) {
    console.error("hi_list_pages did not return a parsable page list.");
    console.log("Next steps:");
    console.log("- Ensure Chrome has at least one open tab.");
    console.log("- Run: npm run mcp:test-client");
    return;
  }

  const pages = hiListPages.pages;
  const selectedCheck = checkSelectedPage(pages, { urlExact, urlContains });

  if (selectedCheck.ok) {
    console.log("Selected page OK:", selectedCheck.selected?.url || "none");
    return;
  }

  console.error("Selected page mismatch.");
  console.error(`Selected: ${selectedCheck.selected?.url || "none"}`);
  console.error(`Expected: ${target}`);
  console.log("Next steps:");
  console.log(`- Open target URL: ${targetUrl}`);
  console.log("- Or run: npm run mcp:open-target");
  console.log("- Then re-run: npm run mcp:doctor");
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
