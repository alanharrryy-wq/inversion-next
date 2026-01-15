// src/rts/slides/templates/KpiGridTemplate.tsx
import React from "react"
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame"
import { ExecutiveHeader } from "../../ui/ExecutiveHeader"
import { Panel } from "../../ui/Panel"
import { Stack } from "../../ui/Stack"
import { KpiCard } from "../../ui/KpiCard"
import { logConsistency } from "../../system/consistency_enforcer"

export const slideSpec = {
  id: "TEMPLATE_KPI_GRID",
  archetype: "KPI Grid Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Placeholders only: avoid real numbers until approved."],
  sectionCount: 2,
}

export function KpiGridTemplate(props: {
  title: string
  breadcrumb?: string
  slideNum?: number
  kpis: Array<{ label: string; value: string; hint?: string; state?: "stable" | "watch" | "alert" | "critical" | "muted" }>
  left?: React.ReactNode
}) {
  logConsistency({ ...slideSpec, bulletCount: 0 })

  const { title, breadcrumb = "HITECH", slideNum, kpis, left } = props

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />
      <SlideGrid className="mt-3">
        <div className="col-span-5">
          <Panel title="Contexto" rightBadge="Executive">
            <Stack gap={10}>
              {left ?? (
                <div style={{ opacity: 0.85, lineHeight: 1.35 }}>
                  Usa este bloque para el resumen. Si necesitas datos, mete la fuente en notas.
                </div>
              )}
            </Stack>
          </Panel>
        </div>

        <div className="col-span-7">
          <Panel title="Indicadores (placeholder)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {kpis.map((k, i) => (
                <KpiCard key={i} label={k.label} value={k.value} hint={k.hint} state={k.state} />
              ))}
            </div>
          </Panel>
        </div>
      </SlideGrid>
    </SlideFrame>
  )
}
