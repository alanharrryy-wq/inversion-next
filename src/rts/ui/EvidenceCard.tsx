// src/ui/EvidenceCard.tsx
import type { EvidenceArtifact } from "../foundation/smartservices_types";
import { Panel } from "./Panel";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { StatusPill } from "./StatusPill";

export function EvidenceCard(props: { item: EvidenceArtifact }) {
  const { item } = props;
  return (
    <Panel variant="soft" className="p-4">
      <Stack gap={8}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Text variant="kicker">Evidence</Text>
          <StatusPill state={item.state} />
        </div>

        <Text variant="h2">{item.label}</Text>

        {item.summary ? <Text variant="body">{item.summary}</Text> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Text variant="micro">
            <span className="vs-fg-2">Owner:</span> {item.owner}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Source:</span> {item.sourceRef ?? "Unavailable"}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Verification:</span> {item.verificationRef ?? "Pending"}
          </Text>
          <Text variant="micro">
            <span className="vs-fg-2">Trace:</span> {item.id}
          </Text>
        </div>
      </Stack>
    </Panel>
  );
}
