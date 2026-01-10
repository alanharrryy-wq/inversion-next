// src/slides/templates/DecisionGateTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { DecisionCard } from "../../ui/DecisionCard";
import type { DecisionRecord } from "../../foundation/smartservices_types";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_DECISION_GATE",
  archetype: "Decision Gate Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Non-flagship template.", "Decision must follow evidence and interpretation."],
};

const sample: DecisionRecord = {
  id: "DEC-001",
  question: "Approve governance path for evidence validation before executive presentation export?",
  state: "Pending",
  owner: "Owner: Pending",
  sourceRef: "Unavailable",
  verificationRef: "Pending",
  options: [
    {
      id: "OPT-A",
      label: "Option A: minimal validation path (fast, higher uncertainty)",
      tradeoffs: "Tradeoff: lower confidence without clear verification record.",
      evidenceRef: "Pending",
    },
    {
      id: "OPT-B",
      label: "Option B: audited validation path (slower, higher confidence)",
      tradeoffs: "Tradeoff: requires ownership and trace references to exist.",
      evidenceRef: "Pending",
    },
  ],
  recommendation: "Pending",
  nextAction: "Next action: assign owner + confirm validation artifact format.",
};

export function DecisionGateTemplate(props: {
  title?: string;
  breadcrumb?: string;
  slideNum?: string;
  record?: DecisionRecord;
  footer?: string;
}) {
  const {
    title = "Decision Gate (Foundation)",
    breadcrumb = "Block 2 • Template",
    slideNum = "T-DEC",
    record = sample,
    footer = "If decision cannot be supported with traceable evidence, it remains Pending or Blocked.",
  } = props;

  logConsistency(slideSpec);

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <SlideGrid>
          <div style={{ gridColumn: "span 12" }}>
            <DecisionCard record={record} />
          </div>
        </SlideGrid>

        <div style={{ marginTop: 18 }}>
          <Text variant="micro">{footer}</Text>
        </div>
      </div>
    </SlideFrame>
  );
}

export default DecisionGateTemplate;
