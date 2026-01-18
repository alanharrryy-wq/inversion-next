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

async function main() {
  const targetRaw =
    (process.env.HI_URL_EXACT || "").trim() ||
    (process.env.HI_URL_CONTAINS || "").trim() ||
    DEFAULT_URL_CONTAINS;
  const targetUrl = normalizeTargetUrl(targetRaw);

  if (!targetUrl) {
    console.log("No target URL configured. Set HI_URL_EXACT or HI_URL_CONTAINS.");
    return;
  }

  const origin = getBrowserOrigin();
  const openUrl = `${origin}/json/new?${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetchWithTimeout(openUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await res.text();
    console.log(`Opened target via DevTools: ${targetUrl}`);
    if (body) {
      console.log(`DevTools response: ${body.trim()}`);
    }
  } catch (err) {
    console.error(
      `Unable to open target via DevTools (${err?.message || err}).`
    );
    console.log(`Open this URL in Chrome: ${targetUrl}`);
    console.log(
      "If Chrome remote debugging is not running, launch with --remote-debugging-port=9222."
    );
  }
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
