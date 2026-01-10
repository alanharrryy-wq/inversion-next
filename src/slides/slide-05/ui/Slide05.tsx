import { KpiGridTemplate } from "@/rts/slides/templates"
import { Stack } from "@/rts/ui/Stack"
import { Text } from "@/rts/ui/Text"

const kpis = [
  { label: "Decision readiness", value: "Baseline", hint: "Evidence mapped", state: "watch" },
  { label: "Review cycle", value: "In progress", hint: "Ops to exec", state: "stable" },
  { label: "Risk coverage", value: "Target set", hint: "Core domains", state: "muted" },
  { label: "Signal quality", value: "Watch", hint: "Noise reduced", state: "watch" },
  { label: "Control adoption", value: "Pilot", hint: "Active squads", state: "stable" },
  { label: "Audit trail", value: "Planned", hint: "Source tags", state: "muted" },
]

export function Slide05() {
  return (
    <KpiGridTemplate
      title="KPI Dashboard"
      breadcrumb="RTS BLOCK 2"
      slideNum={5}
      kpis={kpis}
      left={
        <Stack gap={16}>
          <Text variant="body">
            This dashboard tracks readiness, speed, and adoption without exposing final numbers yet. Each card is a placeholder tied
            to an evidence source.
          </Text>

          <div className="vs-surface" style={{ padding: 16, borderRadius: 16 }}>
            <Text variant="micro" className="vs-muted">
              Status logic
            </Text>
            <Text variant="body">Stable means monitored, Watch means attention needed, Alert means action required.</Text>
          </div>

          <details className="vs-surface" style={{ padding: 16, borderRadius: 16 }}>
            <summary className="vs-micro vs-muted cursor-pointer">Assumptions</summary>
            <div style={{ marginTop: 8 }}>
              <Text variant="body">KPIs stay directional until evidence owners confirm definitions and sources.</Text>
            </div>
          </details>
        </Stack>
      }
    />
  )
}

export default Slide05
