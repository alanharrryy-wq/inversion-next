// src/rts/slides/templates/ComparisonTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame"
import { ExecutiveHeader } from "../../ui/ExecutiveHeader"
import { Panel } from "../../ui/Panel"
import { Text } from "../../ui/Text"
import { logConsistency } from "../../system/consistency_enforcer"

export const slideSpec = {
  id: "TEMPLATE_COMPARISON",
  archetype: "Comparison Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  sectionCount: 2,
}

export function ComparisonTemplate(props: {
  title: string
  breadcrumb?: string
  slideNum?: number
  leftTitle: string
  left: string[]
  rightTitle: string
  right: string[]
}) {
  logConsistency({ ...slideSpec, bulletCount: props.left.length + props.right.length })

  return (
    <SlideFrame>
      <ExecutiveHeader title={props.title} breadcrumb={props.breadcrumb} slideNum={props.slideNum} />
      <SlideGrid className="mt-3">
        <div className="col-span-6">
          <Panel title={props.leftTitle}>
            <div style={{ display: "grid", gap: 10 }}>
              {props.left.slice(0, 7).map((t, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.06)" }}>
                  <Text variant="body">{t}</Text>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="col-span-6">
          <Panel title={props.rightTitle}>
            <div style={{ display: "grid", gap: 10 }}>
              {props.right.slice(0, 7).map((t, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.06)" }}>
                  <Text variant="body">{t}</Text>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </SlideGrid>
    </SlideFrame>
  )
}
