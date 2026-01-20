/*
  TOOL (PLANNED): visual-budget
  SUMMARY: Enforce a visual budget (blur/shadows/layers) and report violations

  CONTRACT:
    requires: [ "hi_eval" ]
    inputs (env): [ "HI_MCP_DIR", "HI_OUT_DIR" ]
    outputs: [ "budget.report.json" ]

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
    tool: "visual-budget",
    status: "planned",
    slideId: slideId || null,
    mcpDir: mcpDir || null,
    outDir,
    requires: [ "hi_eval" ],
    inputs: [ "HI_MCP_DIR", "HI_OUT_DIR" ],
    outputs: [ "budget.report.json" ],
    generatedAt: new Date().toISOString()
  };

  const outFile = path.join(outDir, "planned.stub.json");
  writeJson(outFile, stub);

  console.log(`[PLANNED] visual-budget => wrote ${outFile}`);
}

main().catch((err) => {
  console.error("[PLANNED] visual-budget failed:", err && err.message ? err.message : err);
  process.exitCode = 1;
});


