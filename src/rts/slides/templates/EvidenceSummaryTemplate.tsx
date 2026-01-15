// src/slides/templates/EvidenceSummaryTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_EVIDENCE_SUMMARY",
  archetype: "Evidence Summary Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Non-flagship template. Hard limit: 3 evidence cards above fold."],
};

type EvidenceCard = {
  label: string;
  description: string;
  artifacts: string[];
};

type Props = {
  title?: string;
  breadcrumb?: string;
  slideNum?: number;
  cards?: EvidenceCard[];
  footer?: string;
};

export function EvidenceSummaryTemplate(props: Props) {
  logConsistency(slideSpec);

  const {
    title = "EVIDENCE, NOT PROMISES",
    breadcrumb = "VAULT",
    slideNum,
    cards = [
      { label: "Work Orders", description: "Execution trails and approvals.", artifacts: ["PO / WO", "Sign-off", "Scope revisions"] },
      { label: "Technical Logs", description: "Traceable diagnostics and actions.", artifacts: ["Bitácoras", "Fotos", "Checklists"] },
      { label: "Preventive Control", description: "Risk-driven prevention cycles.", artifacts: ["Plans", "Procedures", "Change history"] },
    ],
    footer = "Vault stores auditable artifacts: one place, traceable, reviewable.",
  } = props;

  const safeCards = cards.slice(0, 3);

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <SlideGrid>
          {safeCards.map((c, idx) => (
            <div key={idx} style={{ gridColumn: "span 4" }}>
              <Panel className="p-6 h-full">
                <Stack gap={12}>
                  <Text variant="kicker" className="vs-accent-cyan">
                    {c.label}
                  </Text>
                  <Text variant="h2">{c.description}</Text>

                  <div className="vs-panel--soft" style={{ padding: 14, borderRadius: "var(--vs-r-2)" }}>
                    <Text variant="micro" style={{ letterSpacing: "0.22em" }}>
                      ARTIFACTS
                    </Text>
                    <ul style={{ marginTop: 10, color: "var(--vs-fg-1)" }}>
                      {c.artifacts.slice(0, 4).map((a, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>
                          <Text as="span" variant="body" style={{ fontSize: 17 }}>
                            {a}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Stack>
              </Panel>
            </div>
          ))}
        </SlideGrid>

        <div style={{ marginTop: 18 }}>
          <Text variant="micro">{footer}</Text>
        </div>
      </div>
    </SlideFrame>
  );
}

export default EvidenceSummaryTemplate;
