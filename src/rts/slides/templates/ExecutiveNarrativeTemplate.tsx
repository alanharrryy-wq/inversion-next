// src/slides/templates/ExecutiveNarrativeTemplate.tsx
import { SlideFrame, SlideGrid } from "../../ui/SlideFrame";
import { ExecutiveHeader } from "../../ui/ExecutiveHeader";
import { ExecutiveNav } from "../../ui/ExecutiveNav";
import { Panel } from "../../ui/Panel";
import { Stack } from "../../ui/Stack";
import { Text } from "../../ui/Text";
import { logConsistency } from "../../system/consistency_enforcer";

export const slideSpec = {
  id: "TEMPLATE_EXEC_NARRATIVE",
  archetype: "Executive Narrative Template",
  usesVisualSystem: true,
  usesNumericKpis: false,
  notes: ["Non-flagship template. Strict density limits: title + <=3 bullets + <=1 callout."],
};

type Props = {
  title?: string;
  breadcrumb?: string;
  slideNum?: number;
  bullets?: string[];
  calloutTitle?: string;
  calloutBody?: string;
  prev?: () => void;
  next?: () => void;
};

export function ExecutiveNarrativeTemplate(props: Props) {
  logConsistency(slideSpec);

  const {
    title = "SYSTEM, NOT SERVICE",
    breadcrumb = "SYSTEM_BOOT",
    slideNum,
    bullets = [
      "Install operational control (process + traceability).",
      "Convert knowledge into documented evidence.",
      "Shift decisions to risk (Probability × Impact).",
    ],
    calloutTitle = "CEO Rule",
    calloutBody = "If it doesn’t improve Control, Evidence, Prevention, or Decision, it does not ship.",
    prev,
    next,
  } = props;

  const safeBullets = bullets.slice(0, 3);

  return (
    <SlideFrame>
      <ExecutiveHeader title={title} breadcrumb={breadcrumb} slideNum={slideNum} />

      <div style={{ marginTop: 28 }}>
        <SlideGrid>
          <div style={{ gridColumn: "1 / span 7" }}>
            <Stack gap={16}>
              <Text variant="h2">What changes immediately</Text>

              <Panel className="p-6">
                <ul className="list-disc pl-6" style={{ color: "var(--vs-fg-1)" }}>
                  {safeBullets.map((b, i) => (
                    <li key={i} style={{ marginBottom: 12 }}>
                      <Text as="span" variant="body">
                        {b}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Text variant="micro" style={{ opacity: 0.9 }}>
                Interactivity is optional: exploration reinforces trust, never replaces narrative.
              </Text>
            </Stack>
          </div>

          <div style={{ gridColumn: "8 / span 5" }}>
            <Panel variant="soft" className="p-6">
              <Stack gap={12}>
                <Text variant="kicker">{calloutTitle}</Text>
                <Text variant="body">{calloutBody}</Text>

                <div className="vs-panel--soft" style={{ padding: 14, borderRadius: "var(--vs-r-2)" }}>
                  <Text variant="micro" style={{ letterSpacing: "0.22em" }}>
                    Transnational • Tier-grade • Evidence-first
                  </Text>
                </div>
              </Stack>
            </Panel>
          </div>
        </SlideGrid>
      </div>

      {(prev || next) ? <ExecutiveNav prev={prev} next={next} /> : null}
    </SlideFrame>
  );
}

export default ExecutiveNarrativeTemplate;
