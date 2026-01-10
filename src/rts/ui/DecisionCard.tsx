// src/ui/DecisionCard.tsx
import type { DecisionRecord } from "../foundation/smartservices_types";
import { Panel } from "./Panel";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { StatusPill } from "./StatusPill";

export function DecisionCard(props: { record: DecisionRecord }) {
  const { record } = props;
  return (
    <Panel variant="soft" className="p-4">
      <Stack gap={10}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Text variant="kicker">Decision</Text>
          <StatusPill state={record.state} />
        </div>

        <Text variant="h2">{record.question}</Text>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Text variant="micro">
            <span className="vs-fg-2">Owner:</span> {record.owner}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Source:</span> {record.sourceRef ?? "Unavailable"}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Verification:</span> {record.verificationRef ?? "Pending"}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Trace:</span> {record.id}
          </Text>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {record.options.map((o) => (
            <Panel key={o.id} className="p-3">
              <Text variant="body">{o.label}</Text>
              {o.tradeoffs ? <Text variant="micro">{o.tradeoffs}</Text> : null}
              <Text variant="micro">
                <span className="vs-fg-2">Evidence:</span> {o.evidenceRef ?? "Pending"}
              </Text>
            </Panel>
          ))}
        </div>

        <Text variant="body">
          <span className="vs-fg-2">Recommendation:</span> {record.recommendation ?? "Pending"}
        </Text>

        <Text variant="body">
          <span className="vs-fg-2">Next action:</span> {record.nextAction ?? "Pending"}
        </Text>
      </Stack>
    </Panel>
  );
}
