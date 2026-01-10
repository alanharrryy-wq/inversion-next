// scripts/rts/gen-slide.mjs
// Usage:
//   node scripts/rts/gen-slide.mjs --id 03 --title "Mi slide" --template exec
//
// Notes:
// - This generator follows inversion-next conventions: src/slides/slide-XX/{index.ts,ui/SlideXX.tsx}
// - It does NOT auto-edit slideRegistry.ts (on purpose). Use the patcher or do it once manually.

import fs from "node:fs"
import path from "node:path"

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  if (i === -1) return fallback
  const v = process.argv[i + 1]
  return v ?? fallback
}

const idRaw = arg("--id")
if (!idRaw) {
  console.error("Missing --id (example: 03)")
  process.exit(1)
}

const id = String(idRaw).padStart(2, "0")
const title = arg("--title", "Slide " + id)
const template = String(arg("--template", "exec") || "exec").toLowerCase()

const slideFolder = "slide-" + id
const root = process.cwd()
const base = path.join(root, "src", "slides", slideFolder)
const uiDir = path.join(base, "ui")
fs.mkdirSync(uiDir, { recursive: true })

const compName = "Slide" + id

function joinLines(lines) {
  return lines.join("\n") + "\n"
}

const tsxExec = joinLines([
  'import type { SlideProps } from "@/entities/slide/model/slide.types"',
  'import { ExecutiveNarrativeTemplate } from "@/rts/slides/templates/ExecutiveNarrativeTemplate"',
  "",
  "export default function " + compName + "(_props: SlideProps) {",
  "  return (",
  "    <ExecutiveNarrativeTemplate",
  "      title=" + JSON.stringify(title),
  '      breadcrumb="Deck"',
  "      slideNum=" + Number(id),
  '      bullets={["Punto 1", "Punto 2", "Punto 3"]}',
  "    />",
  "  )",
  "}",
])

const tsxKpi = joinLines([
  'import type { SlideProps } from "@/entities/slide/model/slide.types"',
  'import { KpiGridTemplate } from "@/rts/slides/templates/KpiGridTemplate"',
  "",
  "export default function " + compName + "(_props: SlideProps) {",
  "  return (",
  "    <KpiGridTemplate",
  "      title=" + JSON.stringify(title),
  '      breadcrumb="Deck"',
  "      slideNum=" + Number(id),
  "      kpis={[",
  '        { label: "Calidad", value: "Placeholder", state: "stable" },',
  '        { label: "Velocidad", value: "Placeholder", state: "watch" },',
  '        { label: "Costo", value: "Placeholder", state: "alert" },',
  '        { label: "Riesgo", value: "Placeholder", state: "muted" },',
  "      ]}",
  "    />",
  "  )",
  "}",
])

const tsxTimeline = joinLines([
  'import type { SlideProps } from "@/entities/slide/model/slide.types"',
  'import { TimelineTemplate } from "@/rts/slides/templates/TimelineTemplate"',
  "",
  "export default function " + compName + "(_props: SlideProps) {",
  "  return (",
  "    <TimelineTemplate",
  "      title=" + JSON.stringify(title),
  '      breadcrumb="Deck"',
  "      slideNum=" + Number(id),
  "      items={[",
  '        { when: "Ene 2026", what: "Kickoff", owner: "Ops" },',
  '        { when: "Feb 2026", what: "Implementación", owner: "Eng" },',
  '        { when: "Mar 2026", what: "Go-live", owner: "All" },',
  "      ]}",
  "    />",
  "  )",
  "}",
])

const tsx = template === "kpi" ? tsxKpi : template === "timeline" ? tsxTimeline : tsxExec

const indexTs = joinLines([
  "import " + compName + ' from "./ui/' + compName + '"',
  "",
  "export const meta = {",
  '  id: ' + JSON.stringify(slideFolder) + ",",
  '  title: ' + JSON.stringify(title) + ",",
  '  tags: ["rts"],',
  "}",
  "",
  "export default " + compName,
])

fs.writeFileSync(path.join(uiDir, compName + ".tsx"), tsx, "utf8")
fs.writeFileSync(path.join(base, "index.ts"), indexTs, "utf8")

console.log("Created " + slideFolder)
console.log("Next: register in src/app/deck/slideRegistry.ts")
