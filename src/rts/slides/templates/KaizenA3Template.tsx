// src/slides/templates/KaizenA3Template.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import type { KaizenA3 } from "../../foundation/smartservices_types";
import { StatusPill } from "../../ui/StatusPill";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_KAIZEN_A3",
  archetype: "Kaizen A3 Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Non-flagship template.", "A3 structure only. No performance claims."],
};

const sample: KaizenA3 = {
  id: "KZN-001",
  title: "Standardize evidence language to prevent executive drift",
  state: "Watch",
  owner: "Owner: Pending",
  sourceRef: "Pending",
  verificationRef: "Pending",
  problemStatement: "Multiple terms describe the same concept, creating ambiguity at audit and board level.",
  containment: "Freeze new label creation in slides until vocabulary is locked.",
  rootCause: "No controlled vocabulary boundary enforced at template level.",
  countermeasure: "Embed slot-based labels (Evidence/Risk/Decision) into primitives and templates.",
  nextAction: "Next action: adopt vocabulary lock; run consistency scan across templates.",
};

export function KaizenA3Template(props: {
  title?: string;
  breadcrumb?: string;
  slideNum?: string;
  a3?: KaizenA3;
  footer?: string;
}) {
  const {
    title = "Kaizen A3 (Foundation)",
    breadcrumb = "Block 2 • Template",
    slideNum = "T-KZN",
    a3 = sample,
    footer = "Kaizen is documented improvement logic. Claims require trace references.",
  } = props;

  logConsistency(slideSpec);

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <Panel variant="soft" className="p-5">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <Text variant="h2">{a3.title}</Text>
            <StatusPill state={a3.state} />
          </div>
          <Text variant="micro" style={{ marginTop: 10 }}>
            <span className="vs-fg-2">Owner:</span> {a3.owner} •{" "}
            <span className="vs-fg-2">Trace:</span> {a3.id}
          </Text>
        </Panel>

        <div style={{ marginTop: 18 }}>
          <SlideGrid>
            <div style={{ gridColumn: "span 6" }}>
              <Panel className="p-4">
                <Stack gap={8}>
                  <Text variant="kicker">Problem statement</Text>
                  <Text variant="body">{a3.problemStatement}</Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <Panel className="p-4">
                <Stack gap={8}>
                  <Text variant="kicker">Containment</Text>
                  <Text variant="body">{a3.containment ?? "Pending"}</Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <Panel className="p-4">
                <Stack gap={8}>
                  <Text variant="kicker">Root cause</Text>
                  <Text variant="body">{a3.rootCause ?? "Pending"}</Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 6" }}>
              <Panel className="p-4">
                <Stack gap={8}>
                  <Text variant="kicker">Countermeasure</Text>
                  <Text variant="body">{a3.countermeasure ?? "Pending"}</Text>
                </Stack>
              </Panel>
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <Panel variant="soft" className="p-4">
                <Stack gap={8}>
                  <Text variant="kicker">Next action</Text>
                  <Text variant="body">{a3.nextAction ?? "Pending"}</Text>
                  <Text variant="micro">
                    <span className="vs-fg-2">Source:</span> {a3.sourceRef ?? "Unavailable"} •{" "}
                    <span className="vs-fg-2">Verification:</span> {a3.verificationRef ?? "Pending"}
                  </Text>
                </Stack>
              </Panel>
            </div>
          </SlideGrid>
        </div>

        <div style={{ marginTop: 18 }}>
          <Text variant="micro">{footer}</Text>
        </div>
      </div>
    </SlideFrame>
  );
}

export default KaizenA3Template;
