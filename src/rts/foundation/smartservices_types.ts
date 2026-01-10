// src/rts/foundation/smartservices_types.ts
// SmartServices vocabulary (Block 3 only)
// Strategic Canon ID: HITECH_RTS_EXEC_CANON_V1

export type EvidenceState = "verified" | "pending" | "blocked";

export const EvidenceStateLabel: Record<EvidenceState, string> = {
  verified: "Verified",
  pending: "Pending",
  blocked: "Blocked",
};

export type HealthBand = "stable" | "watch" | "alert" | "critical";

export const HealthBandLabel: Record<HealthBand, string> = {
  stable: "Stable",
  watch: "Watch",
  alert: "Alert",
  critical: "Critical",
};

export type RiskCategory =
  | "continuity"
  | "operations"
  | "compliance"
  | "safety"
  | "procurement"
  | "traceability";

export const RiskCategoryLabel: Record<RiskCategory, string> = {
  continuity: "Continuity",
  operations: "Operations",
  compliance: "Compliance",
  safety: "Safety",
  procurement: "Procurement",
  traceability: "Traceability",
};

export type DecisionOutput = {
  owner: string;
  nextAction: string;
};

export type EvidenceRecord = {
  id: string;
  title: string;
  state: EvidenceState;
  custody: string;
  anchor: string;
  interpretation: string;
  decision: DecisionOutput;
};

export type RiskRecord = {
  id: string;
  category: RiskCategory;
  title: string;
  band: HealthBand;
  posture: string;
  requiredEvidence: Array<Pick<EvidenceRecord, "id" | "title" | "state" | "anchor">>;
  decision: DecisionOutput;
};
