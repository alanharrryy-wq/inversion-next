// src/rts/slides/templates/ProblemSolutionTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame"
import { ExecutiveHeader } from "../../ui/ExecutiveHeader"
import { Panel } from "../../ui/Panel"
import { Text } from "../../ui/Text"
import { Callout } from "../../ui/Callout"
import { logConsistency } from "../../system/consistency_enforcer"

export const slideSpec = {
  id: "TEMPLATE_PROBLEM_SOLUTION",
  archetype: "Problem/Solution Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  sectionCount: 2,
}

export function ProblemSolutionTemplate(props: {
  title: string
  breadcrumb?: string
  slideNum?: number
  problem: string
  solution: string
  risks?: string[]
}) {
  logConsistency({ ...slideSpec, bulletCount: (props.risks ?? []).length })

  return (
    <SlideFrame>
      <ExecutiveHeader title={props.title} breadcrumb={props.breadcrumb} slideNum={props.slideNum} />
      <SlideGrid className="mt-3">
        <div className="col-span-6">
          <Panel title="Problema">
            <Text variant="body">{props.problem}</Text>
            <div style={{ marginTop: 12 }}>
              <Callout title="Qué se rompe si no actuamos" body="Credibilidad, foco y velocidad de ejecución." tone="warn" />
            </div>
          </Panel>
        </div>
        <div className="col-span-6">
          <Panel title="Solución">
            <Text variant="body">{props.solution}</Text>
            {props.risks?.length ? (
              <div style={{ marginTop: 12 }}>
                <Text variant="micro" className="vs-muted">
                  Riesgos
                </Text>
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {props.risks.slice(0, 6).map((r, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                      <Text variant="body">{r}</Text>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>
        </div>
      </SlideGrid>
    </SlideFrame>
  )
}
