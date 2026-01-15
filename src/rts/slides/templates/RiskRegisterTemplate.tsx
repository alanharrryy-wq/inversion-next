// src/slides/templates/RiskRegisterTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { RiskCard } from "../../ui/RiskCard";
import type { RiskItem } from "../../foundation/smartservices_types";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_RISK_REGISTER",
  archetype: "Risk Register Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: [
    "Non-flagship template.",
    "Hard limit: 4 risks above fold.",
    "No numeric scoring; categorical bands only.",
  ],
};

const sample: RiskItem[] = [
  {
    id: "RISK-001",
    label: "Traceability gap in incoming evidence for a critical claim",
    state: "Watch",
    owner: "Owner: Pending",
    probability: "Medium",
    impact: "High",
    mitigation: "Next action: define evidence owner + verification path",
    evidenceRef: "Pending",
  },
  {
    id: "RISK-002",
    label: "Decision ambiguity due to mixed vocabulary across teams",
    state: "Alert",
    owner: "Owner: Pending",
    probability: "High",
    impact: "Medium",
    mitigation: "Next action: enforce controlled labels (Evidence/Risk/Decision)",
    evidenceRef: "Unavailable",
  },
  {
    id: "RISK-003",
    label: "Visual drift creates authority regression during board review",
    state: "Watch",
    owner: "Owner: Pending",
    probability: "Medium",
    impact: "Medium",
    mitigation: "Next action: run visual regression guardrails before export",
    evidenceRef: "Pending",
  },
];

export function RiskRegisterTemplate(props: {
  title?: string;
  breadcrumb?: string;
  slideNum?: string;
  intro?: string;
  risks?: RiskItem[];
  footer?: string;
}) {
  const {
    title = "Risk Register (Foundation)",
    breadcrumb = "Block 2 • Template",
    slideNum = "T-RISK",
    intro = "Risk exists to enable prevention. This template frames risk categorically and binds it to ownership and next action.",
    risks = sample,
    footer = "Foundation template. Populate only with traceable items. If an item has no source, it must be Unavailable.",
  } = props;

  logConsistency(slideSpec);

  const shown = risks.slice(0, 4);

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <Panel variant="soft" className="p-5">
          <Stack gap={10}>
            <Text variant="kicker">Interpretation frame</Text>
            <Text variant="body">{intro}</Text>
          </Stack>
        </Panel>

        <div style={{ marginTop: 22 }}>
          <SlideGrid>
            {shown.map((r) => (
              <div key={r.id} style={{ gridColumn: "span 6" }}>
                <RiskCard item={r} />
              </div>
            ))}
          </SlideGrid>
        </div>

        <div style={{ marginTop: 18 }}>
          <Text variant="micro">{footer}</Text>
        </div>
      </div>
    </SlideFrame>
  );
}

export default RiskRegisterTemplate;
