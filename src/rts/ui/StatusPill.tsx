// src/ui/StatusPill.tsx
import type { CanonState } from "../foundation/smartservices_types";

function stateClass(state: CanonState) {
  switch (state) {
    case "Stable":
      return "vs-state vs-state--stable";
    case "Watch":
      return "vs-state vs-state--watch";
    case "Alert":
      return "vs-state vs-state--alert";
    case "Critical":
      return "vs-state vs-state--critical";
    default:
      return "vs-state vs-state--muted";
  }
}

export function StatusPill(props: { state: CanonState; className?: string }) {
  const { state, className = "" } = props;
  return (
    <span className={[stateClass(state), className].join(" ").trim()}>
      {state}
    </span>
  );
}
