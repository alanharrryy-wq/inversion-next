/*
  TOOL (PLANNED): visual-gate-ci
  SUMMARY: CI gate: fail if visual diff score exceeds threshold

  CONTRACT:
    requires: [ "hi_screenshot" ]
    inputs (env): [ "HI_MCP_DIR", "HI_OUT_DIR", "HI_REF_PNG" ]
    outputs: [ "gate.result.json" ]

  NOTE:
    This is a skeleton. It MUST remain slide-agnostic.
    Write outputs ONLY inside HI_OUT_DIR.
*/

import fs from "node:fs";
import path from "node:path";

function mustEnv(name) {
  const v = (process.env[name] || "").trim();
  if (!v) throw new Error(`Missing required env var: `);
  return v;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

async function main() {
  // Mandatory env
  const outDir = mustEnv("HI_OUT_DIR");
  ensureDir(outDir);

  // Optional but common env
  const mcpDir = (process.env.HI_MCP_DIR || "").trim();
  const slideId = (process.env.HI_SLIDE_ID || "").trim();

  const stub = {
    tool: "visual-gate-ci",
    status: "planned",
    slideId: slideId || null,
    mcpDir: mcpDir || null,
    outDir,
    requires: [ "hi_screenshot" ],
    inputs: [ "HI_MCP_DIR", "HI_OUT_DIR", "HI_REF_PNG" ],
    outputs: [ "gate.result.json" ],
    generatedAt: new Date().toISOString()
  };

  const outFile = path.join(outDir, "planned.stub.json");
  writeJson(outFile, stub);

  console.log(`[PLANNED] visual-gate-ci => wrote ${outFile}`);
}

main().catch((err) => {
  console.error("[PLANNED] visual-gate-ci failed:", err && err.message ? err.message : err);
  process.exitCode = 1;
});


