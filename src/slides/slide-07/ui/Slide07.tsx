import { RiskRegisterTemplate } from "@/rts/slides/templates"
import type { RiskItem } from "@/rts/foundation/smartservices_types"

const risks: RiskItem[] = [
  {
    id: "RISK-101",
    label: "Evidence ownership unclear for priority decisions",
    state: "Watch",
    owner: "Owner: Program Lead",
    probability: "Medium",
    impact: "High",
    mitigation: "Assign owners per domain and publish evidence map",
    evidenceRef: "Pending",
  },
  {
    id: "RISK-102",
    label: "Inconsistent definitions across ops and exec reviews",
    state: "Alert",
    owner: "Owner: Ops Lead",
    probability: "High",
    impact: "Medium",
    mitigation: "Lock vocabulary and enforce review checklist",
    evidenceRef: "Draft",
  },
  {
    id: "RISK-103",
    label: "Dashboard signals drift without validation cycle",
    state: "Watch",
    owner: "Owner: Data Lead",
    probability: "Medium",
    impact: "Medium",
    mitigation: "Run weekly validation and log evidence exceptions",
    evidenceRef: "Planned",
  },
  {
    id: "RISK-104",
    label: "Decision cadence stalls during handoff",
    state: "Watch",
    owner: "Owner: PMO",
    probability: "Low",
    impact: "Medium",
    mitigation: "Set escalation path and publish calendar",
    evidenceRef: "Pending",
  },
]

export function Slide07() {
  return (
    <RiskRegisterTemplate
      title="Risks and Next Steps"
      breadcrumb="RTS BLOCK 2"
      slideNum="07"
      intro="Risks are tracked as categorical bands with clear owners and next actions. Mitigations focus on evidence integrity and decision flow."
      risks={risks}
      footer="Next steps: confirm owners, validate evidence sources, and lock the review cadence for the pilot window."
    />
  )
}

export default Slide07
