#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
const reportPath = path.join(ROOT, "tools", "lint", "render_policy_report.json");
const indexPath = path.join(ROOT, "docs", "INDEX.md");
const HEALTH_START = "<!-- HEALTH:START -->";
const HEALTH_END = "<!-- HEALTH:END -->";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function assert(condition, message) {
  if (!condition) {
    console.error("[smoke] FAIL:", message);
    process.exit(1);
  }
}

console.log("[smoke] lint:render");
run("npm run lint:render");

assert(fs.existsSync(reportPath), `missing report: ${reportPath}`);
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

const requiredTop = ["policyVersion", "generatedAt", "repoRoot", "summary", "surfaces", "violations"];
for (const key of requiredTop) {
  assert(report[key] !== undefined, `report missing ${key}`);
}

const surfaceKeys = ["ui", "inspector", "stage"];
for (const key of surfaceKeys) {
  assert(report.surfaces?.[key], `report missing surface: ${key}`);
  const surf = report.surfaces[key];
  assert(Number.isFinite(Number(surf.score)), `${key}.score missing or invalid`);
  assert(Number.isFinite(Number(surf.l3Count)), `${key}.l3Count missing or invalid`);
  assert(Number.isFinite(Number(surf.l4Count)), `${key}.l4Count missing or invalid`);
  assert(Number.isFinite(Number(surf.scoreBudget)), `${key}.scoreBudget missing or invalid`);
}

console.log("[smoke] docs:index");
run("npm run docs:index");

assert(fs.existsSync(indexPath), `missing docs index: ${indexPath}`);
const indexText = fs.readFileSync(indexPath, "utf8");
assert(indexText.includes(HEALTH_START), "INDEX.md missing HEALTH:START");
assert(indexText.includes(HEALTH_END), "INDEX.md missing HEALTH:END");

console.log("[smoke] OK");

