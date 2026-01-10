// src/ui/RiskCard.tsx
import type { RiskItem } from "../foundation/smartservices_types";
import { Panel } from "./Panel";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { StatusPill } from "./StatusPill";

export function RiskCard(props: { item: RiskItem }) {
  const { item } = props;
  const band = (x?: string) => x ?? "Unavailable";
  return (
    <Panel variant="soft" className="p-4">
      <Stack gap={8}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Text variant="kicker">Risk</Text>
          <StatusPill state={item.state} />
        </div>

        <Text variant="h2">{item.label}</Text>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Text variant="micro">
            <span className="vs-fg-2">Owner:</span> {item.owner}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Evidence:</span> {item.evidenceRef ?? "Pending"}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Probability band:</span> {band(item.probability)}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Impact band:</span> {band(item.impact)}
          </Text>
        </div>

        {item.mitigation ? (
          <Text variant="body">
            <span className="vs-fg-2">Next action:</span> {item.mitigation}
          </Text>
        ) : (
          <Text variant="body">
            <span className="vs-fg-2">Next action:</span> Pending
          </Text>
        )}
      </Stack>
    </Panel>
  );
}
