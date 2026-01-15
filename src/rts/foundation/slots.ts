// src/foundation/slots.ts
// Slide slot registry (Foundation Only)
// These slot IDs are stable integration points for future SmartServices consumption.

export const Slots = {
  narrative: "slot:narrative",
  evidence: "slot:evidence",
  risk: "slot:risk",
  decision: "slot:decision",
  kaizen: "slot:kaizen",
  footerTrace: "slot:footerTrace",
} as const;

export type SlotId = (typeof Slots)[keyof typeof Slots];
