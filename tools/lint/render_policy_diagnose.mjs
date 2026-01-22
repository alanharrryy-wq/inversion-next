#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const reportPath = path.join(ROOT, "tools", "lint", "render_policy_report.json");

if (!fs.existsSync(reportPath)) {
  console.error("Missing report:", reportPath);
  console.error("Run: npm run lint:render");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

function collectEffects(input) {
  const out = [];
  const surfaces = input?.effects && typeof input.effects === "object" ? input.effects : {};
  for (const surface of Object.values(surfaces)) {
    if (surface && Array.isArray(surface.effects)) {
      for (const effect of surface.effects) {
        if (effect && typeof effect === "object") {
          out.push(effect);
        }
      }
    }
  }
  return out;
}

function numberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sumScore(effects) {
  return effects.reduce((sum, effect) => sum + numberOrZero(effect.score), 0);
}

function countLevel(effects, level) {
  return effects.reduce((sum, effect) => sum + (effect.level === level ? 1 : 0), 0);
}

function topByScore(effects, key, limit = 10) {
  const map = new Map();
  for (const effect of effects) {
    const k = String(effect?.[key] ?? "(unknown)");
    const score = numberOrZero(effect?.score);
    if (!map.has(k)) map.set(k, { score: 0, count: 0 });
    const entry = map.get(k);
    entry.score += score;
    entry.count += 1;
  }
  return [...map.entries()]
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);
}

const effects = collectEffects(report);
const runtimeEffects = effects.filter((effect) => (effect.scope ?? "runtime") !== "artifact");
const artifactEffects = effects.filter((effect) => (effect.scope ?? "runtime") === "artifact");

console.log("Render Policy Diagnostics");
console.log("Report:", reportPath);

const runtimeScore = sumScore(runtimeEffects);
const artifactScore = sumScore(artifactEffects);
const runtimeL3 = countLevel(runtimeEffects, "L3");
const runtimeL4 = countLevel(runtimeEffects, "L4");
const artifactL3 = countLevel(artifactEffects, "L3");
const artifactL4 = countLevel(artifactEffects, "L4");

console.log("");
console.log("Totals");
console.log(`- Runtime: score ${runtimeScore} | L3 ${runtimeL3} | L4 ${runtimeL4} | effects ${runtimeEffects.length}`);
console.log(`- Artifacts: score ${artifactScore} | L3 ${artifactL3} | L4 ${artifactL4} | effects ${artifactEffects.length}`);

if (report?.surfaces && typeof report.surfaces === "object") {
  console.log("");
  console.log("Surface Totals");
  for (const [surface, stats] of Object.entries(report.surfaces)) {
    const rScore = numberOrZero(stats?.score);
    const rL3 = numberOrZero(stats?.l3Count);
    const rL4 = numberOrZero(stats?.l4Count);
    const aScore = numberOrZero(stats?.artifactScore);
    const aL3 = numberOrZero(stats?.artifactL3Count);
    const aL4 = numberOrZero(stats?.artifactL4Count);
    console.log(`- ${surface}: runtime score ${rScore} | L3 ${rL3} | L4 ${rL4} | artifacts score ${aScore} | L3 ${aL3} | L4 ${aL4}`);
  }
}

function printTop(title, rows) {
  console.log("");
  console.log(title);
  if (!rows.length) {
    console.log("(none)");
    return;
  }
  for (const [key, data] of rows) {
    console.log(`- ${data.score} | ${data.count} | ${key}`);
  }
}

printTop("Top runtime files by score", topByScore(runtimeEffects, "file", 12));
printTop("Top runtime kinds by score", topByScore(runtimeEffects, "kind", 12));
printTop("Top artifact files by score", topByScore(artifactEffects, "file", 12));

