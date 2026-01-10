// scripts/rts/check.mjs
// Simple structural guardrails for inversion-next slides.

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const slidesDir = path.join(root, "src", "slides")
const regFile = path.join(root, "src", "app", "deck", "slideRegistry.ts")

function die(msg) {
  console.error(msg)
  process.exit(1)
}

if (!fs.existsSync(regFile)) die("Missing slideRegistry.ts at " + regFile)
if (!fs.existsSync(slidesDir)) die("Missing slides dir at " + slidesDir)

const reg = fs.readFileSync(regFile, "utf8")

const ids = Array.from(reg.matchAll(/id:\s*"([^"]+)"/g)).map((m) => m[1])
if (!ids.length) die("No slide ids found in slideRegistry.ts")

let ok = 0
let bad = 0

for (const id of ids) {
  const dir = path.join(slidesDir, id)
  const index = path.join(dir, "index.ts")
  if (!fs.existsSync(dir)) {
    console.error("Missing folder: " + id)
    bad++
    continue
  }
  if (!fs.existsSync(index)) {
    console.error("Missing index.ts: " + id)
    bad++
    continue
  }
  ok++
}

console.log("Slides OK: " + ok)
if (bad) {
  console.error("Slides BAD: " + bad)
  process.exit(2)
}
