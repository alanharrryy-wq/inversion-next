// src/rts/ui/KeyValue.tsx
import React from "react"
import { Text } from "./Text"

export function KeyValue(props: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "baseline" }}>
      <Text variant="micro" className="vs-muted">
        {props.k}
      </Text>
      <div>
        <Text variant="body">{props.v}</Text>
      </div>
    </div>
  )
}
