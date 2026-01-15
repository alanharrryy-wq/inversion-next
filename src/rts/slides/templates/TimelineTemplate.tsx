// src/rts/slides/templates/TimelineTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame"
import { ExecutiveHeader } from "../../ui/ExecutiveHeader"
import { Panel } from "../../ui/Panel"
import { Text } from "../../ui/Text"
import { logConsistency } from "../../system/consistency_enforcer"

export const slideSpec = {
  id: "TEMPLATE_TIMELINE",
  archetype: "Timeline Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  sectionCount: 1,
}

export function TimelineTemplate(props: {
  title: string
  breadcrumb?: string
  slideNum?: number
  items: Array<{ when: string; what: string; owner?: string }>
}) {
  logConsistency({ ...slideSpec, bulletCount: props.items.length, hasDates: true, notes: ["As-of: CDMX"] })

  return (
    <SlideFrame>
      <ExecutiveHeader title={props.title} breadcrumb={props.breadcrumb} slideNum={props.slideNum} />
      <SlideGrid className="mt-3">
        <div className="col-span-12">
          <Panel title="Timeline">
            <div style={{ display: "grid", gap: 10 }}>
              {props.items.map((it, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 160px", gap: 12, alignItems: "baseline" }}>
                  <Text variant="micro" className="vs-muted">
                    {it.when}
                  </Text>
                  <Text variant="body">{it.what}</Text>
                  <Text variant="micro" className="vs-muted" style={{ textAlign: "right" }}>
                    {it.owner ?? ""}
                  </Text>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </SlideGrid>
    </SlideFrame>
  )
}
