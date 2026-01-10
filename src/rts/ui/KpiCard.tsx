// src/rts/ui/KpiCard.tsx
import { Text } from "./Text"

export function KpiCard(props: {
  label: string
  value: string
  hint?: string
  state?: "stable" | "watch" | "alert" | "critical" | "muted"
}) {
  const { label, value, hint, state = "muted" } = props
  const bgVar =
    state === "stable"
      ? "var(--vs-state-stable)"
      : state === "watch"
        ? "var(--vs-state-watch)"
        : state === "alert"
          ? "var(--vs-state-alert)"
          : state === "critical"
            ? "var(--vs-state-critical)"
            : "var(--vs-state-muted)"

  return (
    <div style={{ background: bgVar, borderRadius: 16, padding: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
      <Text variant="micro" className="vs-muted">
        {label}
      </Text>
      <div style={{ marginTop: 6 }}>
        <Text variant="h2" className="vs-kpi">
          {value}
        </Text>
      </div>
      {hint ? (
        <div style={{ marginTop: 6 }}>
          <Text variant="micro" className="vs-muted">
            {hint}
          </Text>
        </div>
      ) : null}
    </div>
  )
}
