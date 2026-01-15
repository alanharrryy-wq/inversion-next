// src/rts/ui/Callout.tsx
import { Text } from "./Text"

export function Callout(props: { title: string; body: string; tone?: "info" | "warn" | "critical" }) {
  const tone = props.tone ?? "info"
  const border =
    tone === "critical"
      ? "rgba(140,58,58,0.70)"
      : tone === "warn"
        ? "rgba(171,123,38,0.70)"
        : "rgba(2,167,202,0.70)"

  const bg =
    tone === "critical"
      ? "rgba(140,58,58,0.18)"
      : tone === "warn"
        ? "rgba(171,123,38,0.18)"
        : "rgba(2,167,202,0.16)"

  return (
    <div style={{ borderRadius: 16, border: "1px solid " + border, background: bg, padding: 14 }}>
      <Text variant="micro" className="vs-muted">
        {props.title}
      </Text>
      <div style={{ marginTop: 8 }}>
        <Text variant="body">{props.body}</Text>
      </div>
    </div>
  )
}
