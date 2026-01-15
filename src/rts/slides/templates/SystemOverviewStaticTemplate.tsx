// src/slides/templates/SystemOverviewStaticTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_SYSTEM_OVERVIEW_STATIC",
  archetype: "System Overview (Static) Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Non-flagship template. Hard limit: 3 columns + 1 risk banner. No charts."],
};

type Props = {
  title?: string;
  breadcrumb?: string;
  slideNum?: number;
};

export function SystemOverviewStaticTemplate(props: Props) {
  logConsistency(slideSpec);

  const { title = "THE SYSTEM MODEL", breadcrumb = "HITECH_CORE", slideNum } = props;

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <Panel variant="soft" className="p-5">
          <Text variant="kicker">Decision frame</Text>
          <Text variant="body">
            Prevention is prioritized by <span className="vs-accent-gold">Risk</span> (Probability × Impact). No single-person rescue narratives, only governance.
          </Text>
        </Panel>

        <div style={{ marginTop: 22 }}>
          <SlideGrid>
            <div style={{ gridColumn: "span 4" }}>
              <Panel className="p-6 h-full">
                <Stack gap={12}>
                  <Text variant="kicker">Inputs</Text>
                  <Text variant="h2">Data + History</Text>
                  <Text variant="body">
                    Work orders, logs, evidence artifacts, and operational context. Nothing depends on memory.
                  </Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <Panel className="p-6 h-full">
                <Stack gap={12}>
                  <Text variant="kicker" className="vs-accent-cyan">
                    Core
                  </Text>
                  <Text variant="h2">Control Model</Text>
                  <Text variant="body">
                    Processes + traceability produce auditable evidence, enabling consistent operation and scalable governance.
                  </Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <Panel className="p-6 h-full">
                <Stack gap={12}>
                  <Text variant="kicker">Outputs</Text>
                  <Text variant="h2">Prevention + Decision</Text>
                  <Text variant="body">
                    Risk-driven prevention cycles, clear prioritization, and evidence-backed decisions.
                  </Text>
                </Stack>
              </Panel>
            </div>
          </SlideGrid>
        </div>

        <div style={{ marginTop: 18 }}>
          <Text variant="micro">
            Interactivity may reveal deeper evidence trails, but the system remains understandable in one pass.
          </Text>
        </div>
      </div>
    </SlideFrame>
  );
}

export default SystemOverviewStaticTemplate;
