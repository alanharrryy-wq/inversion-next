// src/rts/slides/flagships/FlagshipEvidenceTractionEngine.tsx
import React from "react";
import type { EvidenceRecord, EvidenceState, DecisionOutput } from "../../foundation/smartservices_types";
import { EvidenceStateLabel } from "../../foundation/smartservices_types";

type Mode = "presentation" | "explore" | "detail";

function cx(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useEsc(onEsc: ()=>void){
  React.useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if (e.key === "Escape") onEsc();
    }
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [onEsc]);
}

function Pill(props: { state: EvidenceState }){
  const { state } = props;
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide";
  const palette =
    state === "verified"
      ? "bg-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.86)] border border-[rgba(255,255,255,0.16)]"
      : state === "pending"
      ? "bg-[rgba(2,167,202,0.12)] text-[rgba(255,255,255,0.82)] border border-[rgba(2,167,202,0.22)]"
      : "bg-[rgba(171,123,38,0.10)] text-[rgba(255,255,255,0.82)] border border-[rgba(171,123,38,0.22)]";

  return <span className={cx([base, palette])}>{EvidenceStateLabel[state]}</span>;
}

function CardShell(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cx([
        "rounded-2xl border border-[rgba(255,255,255,0.10)] shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
        "bg-[rgba(5,8,12,0.92)]",
        props.className,
      ])}
    >
      {props.children}
    </div>
  );
}

function TitleLine(props: { kicker: string; title: string; right?: React.ReactNode }){
  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[13px] tracking-[0.30em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
            {props.kicker}
          </div>
          <div className="text-[46px] leading-[1.08] font-black text-[rgba(255,255,255,0.92)]">
            {props.title}
          </div>
        </div>
        {props.right ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.16)] bg-[rgba(7,11,16,0.82)] px-3 py-2">
            {props.right}
          </div>
        ) : null}
      </div>
      <div className="h-[2px] w-full mt-4 bg-[linear-gradient(90deg,rgba(2,167,202,1),rgba(255,255,255,0.10),transparent)] opacity-75" />
    </div>
  );
}

function DecisionPanel(props: { decision: DecisionOutput; state: EvidenceState }){
  const { decision, state } = props;
  const gate =
    state === "verified" ? "Decision Gate: Ready" :
    state === "pending" ? "Decision Gate: Pending" :
    "Decision Gate: Blocked";

  return (
    <CardShell className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
          Decision Output
        </div>
        <Pill state={state} />
      </div>

      <div className="text-[28px] leading-[1.18] font-extrabold text-[rgba(255,255,255,0.92)] mt-4">
        {gate}
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.82)] p-4">
          <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
            Owner
          </div>
          <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)] mt-2">
            {decision.owner}
          </div>
        </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.82)] p-4">
          <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
            Next action
          </div>
          <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)] mt-2">
            {decision.nextAction}
          </div>
        </div>
      </div>

      <div className="mt-6 text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)]">
        Evidence must be explicit. Pending or Blocked never yields false certainty.
      </div>
    </CardShell>
  );
}

function EvidenceRow(props: {
  rec: EvidenceRecord;
  selected: boolean;
  onSelect: ()=>void;
}){
  const { rec, selected, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx([
        "w-full text-left rounded-2xl border p-5 transition",
        selected
          ? "border-[rgba(2,167,202,0.35)] bg-[rgba(2,167,202,0.10)]"
          : "border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.72)] hover:bg-[rgba(7,11,16,0.82)]",
      ])}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)]">
            {rec.title}
          </div>
          <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)] mt-2">
            Custody: {rec.custody}
          </div>
          <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)] mt-1">
            Anchor: {rec.anchor}
          </div>
        </div>
        <Pill state={rec.state} />
      </div>
    </button>
  );
}

export function FlagshipEvidenceTractionEngine(){
  const records: EvidenceRecord[] = [
    {
      id: "EVIDENCE-A",
      title: "Traceable work order governance",
      state: "verified",
      custody: "Operations",
      anchor: "Controlled artifact chain",
      interpretation: "Evidence supports standardized execution and controlled change.",
      decision: { owner: "Plant Director", nextAction: "Freeze the governance pattern as the default for rollout." },
    },
    {
      id: "EVIDENCE-B",
      title: "Supplier onboarding readiness pack",
      state: "pending",
      custody: "Procurement",
      anchor: "Verification checklist and sign-off path",
      interpretation: "Key confirmations are still missing. Do not assume readiness.",
      decision: { owner: "Supplier Lead", nextAction: "Collect missing confirmations and attach them to the pack." },
    },
    {
      id: "EVIDENCE-C",
      title: "Quality containment escalation discipline",
      state: "blocked",
      custody: "Quality",
      anchor: "Escalation proof and closure record",
      interpretation: "A blocking gap exists. Containment discipline is not auditable yet.",
      decision: { owner: "Quality Manager", nextAction: "Resolve the blocker and publish an auditable closure record." },
    },
  ];

  const [mode, setMode] = React.useState<Mode>("presentation");
  const [selectedId, setSelectedId] = React.useState<string>(records[0].id);

  const selected = records.find(r => r.id === selectedId) || records[0];

  useEsc(()=>{
    setMode("presentation");
  });

  function select(recId: string){
    setSelectedId(recId);
    setMode("explore");
  }

  const modeBadge =
    mode === "presentation" ? "MODE: PRESENTATION" :
    mode === "explore" ? "MODE: EXPLORE" :
    "MODE: DETAIL";

  return (
    <div className="w-full h-full p-12">
      <TitleLine
        kicker="BLOCK 3"
        title="Evidence and Traction Engine"
        right={<div className="text-xs tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">{modeBadge}</div>}
      />

      <div className="grid grid-cols-12 gap-6 mt-10">
        <div className="col-span-4">
          <CardShell className="p-6">
            <div className="text-[13px] tracking-[0.30em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
              Governance Frame
            </div>
            <div className="text-[28px] leading-[1.18] font-extrabold text-[rgba(255,255,255,0.92)] mt-4">
              Evidence is the only entry key
            </div>
            <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.74)] mt-4">
              Select a record. Interpret what it means. Produce an owned decision. ESC returns to Presentation.
            </div>

            <div className="h-[1px] w-full bg-[rgba(255,255,255,0.10)] mt-6" />

            <div className="mt-6 space-y-3">
              <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                States
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill state="verified" />
                <Pill state="pending" />
                <Pill state="blocked" />
              </div>
              <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)]">
                Pending and Blocked force discipline. No false certainty.
              </div>
            </div>
          </CardShell>
        </div>

        <div className="col-span-4">
          <CardShell className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] tracking-[0.30em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                Evidence Ledger
              </div>
              <button
                type="button"
                onClick={()=> setMode(mode === "detail" ? "explore" : "detail")}
                className="rounded-xl border border-[rgba(255,255,255,0.16)] bg-[rgba(7,11,16,0.82)] px-3 py-2 text-xs font-bold tracking-wide text-[rgba(255,255,255,0.82)]"
              >
                Toggle detail
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {records.map(r => (
                <EvidenceRow
                  key={r.id}
                  rec={r}
                  selected={r.id === selectedId}
                  onSelect={()=> select(r.id)}
                />
              ))}
            </div>

            {mode !== "presentation" ? (
              <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.82)] p-5">
                <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                  Interpretation
                </div>
                <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.82)] mt-3">
                  {selected.interpretation}
                </div>
              </div>
            ) : null}
          </CardShell>
        </div>

        <div className="col-span-4">
          <DecisionPanel decision={selected.decision} state={selected.state} />
        </div>
      </div>
    </div>
  );
}
