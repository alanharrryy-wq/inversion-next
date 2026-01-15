// src/rts/index.ts
export * from "./ui/Text"
export * from "./ui/Panel"
export * from "./ui/SlideFrame"
export * from "./ui/StatusPill"
export * from "./ui/EvidenceCard"
export * from "./ui/RiskCard"
export * from "./ui/DecisionCard"
export * from "./ui/ExecutiveHeader"
export * from "./ui/ExecutiveNav"

export * from "./system/consistency_enforcer"
export * from "./system/consistency_rules"
export * from "./system/motion"

export { ExecutiveNarrativeTemplate } from "./slides/templates/ExecutiveNarrativeTemplate"
export { EvidenceSummaryTemplate } from "./slides/templates/EvidenceSummaryTemplate"
export { SystemOverviewStaticTemplate } from "./slides/templates/SystemOverviewStaticTemplate"
export { DecisionGateTemplate } from "./slides/templates/DecisionGateTemplate"
export { RiskRegisterTemplate } from "./slides/templates/RiskRegisterTemplate"
export { KaizenA3Template } from "./slides/templates/KaizenA3Template"

export * from "./devtools/RtsDebugOverlay"
