// src/rts/slides/flagships/FlagshipRiskDecisionEngine.tsx
import React from "react";
import type { RiskRecord, HealthBand, EvidenceState } from "../../foundation/smartservices_types";
import { HealthBandLabel, RiskCategoryLabel, EvidenceStateLabel } from "../../foundation/smartservices_types";

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

function BandPill(props: { band: HealthBand }){
  const { band } = props;
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide";
  const palette =
    band === "stable"
      ? "bg-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.86)] border border-[rgba(255,255,255,0.16)]"
      : band === "watch"
      ? "bg-[rgba(2,167,202,0.12)] text-[rgba(255,255,255,0.82)] border border-[rgba(2,167,202,0.22)]"
      : band === "alert"
      ? "bg-[rgba(171,123,38,0.12)] text-[rgba(255,255,255,0.82)] border border-[rgba(171,123,38,0.22)]"
      : "bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.82)] border border-[rgba(255,255,255,0.26)]";

  return <span className={cx([base, palette])}>{HealthBandLabel[band]}</span>;
}

function EvidencePill(props: { state: EvidenceState }){
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

function RiskRow(props: {
  rec: RiskRecord;
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
          <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
            {RiskCategoryLabel[rec.category]}
          </div>
          <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)] mt-2">
            {rec.title}
          </div>
          <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)] mt-2">
            Posture: {rec.posture}
          </div>
        </div>
        <BandPill band={rec.band} />
      </div>
    </button>
  );
}

export function FlagshipRiskDecisionEngine(){
  const risks: RiskRecord[] = [
    {
      id: "RISK-A",
      category: "continuity",
      title: "Escalation path not auditable end-to-end",
      band: "watch",
      posture: "Requires explicit custody and closure proof.",
      requiredEvidence: [
        { id: "EVIDENCE-A", title: "Traceable work order governance", state: "verified", anchor: "Controlled artifact chain" },
        { id: "EVIDENCE-C", title: "Quality containment escalation discipline", state: "blocked", anchor: "Escalation proof and closure record" },
      ],
      decision: { owner: "Operations Lead", nextAction: "Remove the blocker and publish a closure record." },
    },
    {
      id: "RISK-B",
      category: "compliance",
      title: "Policy enforcement not consistently verifiable",
      band: "alert",
      posture: "Rules exist, verification gaps remain.",
      requiredEvidence: [
        { id: "EVIDENCE-B", title: "Supplier onboarding readiness pack", state: "pending", anchor: "Verification checklist and sign-off path" },
      ],
      decision: { owner: "Compliance Owner", nextAction: "Bind sign-off evidence to policy gates and retest." },
    },
    {
      id: "RISK-C",
      category: "traceability",
      title: "Artifact chain breaks across handoffs",
      band: "critical",
      posture: "Cannot defend custody without complete anchors.",
      requiredEvidence: [
        { id: "EVIDENCE-A", title: "Traceable work order governance", state: "verified", anchor: "Controlled artifact chain" },
        { id: "EVIDENCE-B", title: "Supplier onboarding readiness pack", state: "pending", anchor: "Verification checklist and sign-off path" },
      ],
      decision: { owner: "Program Owner", nextAction: "Enforce anchor requirements across every handoff." },
    },
  ];

  const [mode, setMode] = React.useState<Mode>("presentation");
  const [selectedId, setSelectedId] = React.useState<string>(risks[0].id);
  const selected = risks.find(r => r.id === selectedId) || risks[0];

  useEsc(()=> setMode("presentation"));

  function select(riskId: string){
    setSelectedId(riskId);
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
        title="Risk and Decision Engine"
        right={<div className="text-xs tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">{modeBadge}</div>}
      />

      <div className="grid grid-cols-12 gap-6 mt-10">
        <div className="col-span-4">
          <CardShell className="p-6">
            <div className="text-[13px] tracking-[0.30em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
              Governance Frame
            </div>
            <div className="text-[28px] leading-[1.18] font-extrabold text-[rgba(255,255,255,0.92)] mt-4">
              Risks require owned decisions
            </div>
            <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.74)] mt-4">
              Select one risk. Validate evidence state. Produce an owned next action. ESC returns to Presentation.
            </div>

            <div className="h-[1px] w-full bg-[rgba(255,255,255,0.10)] mt-6" />

            <div className="mt-6 space-y-3">
              <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                Bands
              </div>
              <div className="flex flex-wrap gap-2">
                <BandPill band="stable" />
                <BandPill band="watch" />
                <BandPill band="alert" />
                <BandPill band="critical" />
              </div>
              <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)]">
                Categorical only. No numbers.
              </div>
            </div>
          </CardShell>
        </div>

        <div className="col-span-4">
          <CardShell className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-[13px] tracking-[0.30em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                Risk Register
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
              {risks.map(r => (
                <RiskRow
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
                  Required evidence
                </div>

                <div className="mt-4 space-y-3">
                  {selected.requiredEvidence.map(ev => (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(5,8,12,0.92)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)]">
                            {ev.title}
                          </div>
                          <div className="text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)] mt-2">
                            Anchor: {ev.anchor}
                          </div>
                        </div>
                        <EvidencePill state={ev.state} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardShell>
        </div>

        <div className="col-span-4">
          <CardShell className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                Decision Output
              </div>
              <BandPill band={selected.band} />
            </div>

            <div className="text-[28px] leading-[1.18] font-extrabold text-[rgba(255,255,255,0.92)] mt-4">
              Decision Gate: Owned
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.82)] p-4">
                <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                  Owner
                </div>
                <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)] mt-2">
                  {selected.decision.owner}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(7,11,16,0.82)] p-4">
                <div className="text-[13px] tracking-[0.24em] uppercase text-[rgba(255,255,255,0.56)] font-semibold">
                  Next action
                </div>
                <div className="text-[19px] leading-[1.45] font-semibold text-[rgba(255,255,255,0.86)] mt-2">
                  {selected.decision.nextAction}
                </div>
              </div>
            </div>

            <div className="mt-6 text-[13px] leading-[1.35] text-[rgba(255,255,255,0.56)]">
              Evidence state governs confidence. Decisions remain explicit and owned.
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}
