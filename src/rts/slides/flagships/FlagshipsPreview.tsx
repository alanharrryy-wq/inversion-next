// src/rts/slides/flagships/FlagshipsPreview.tsx
import React from "react";
import { FlagshipEvidenceTractionEngine } from "./FlagshipEvidenceTractionEngine";
import { FlagshipRiskDecisionEngine } from "./FlagshipRiskDecisionEngine";

type View = "evidence" | "risk";

function cx(parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function FlagshipsPreview(){
  const [view, setView] = React.useState<View>("evidence");

  return (
    <div className="w-full h-full">
      <div className="fixed top-6 right-6 z-50 flex gap-2 rounded-2xl border border-[rgba(255,255,255,0.16)] bg-[rgba(7,11,16,0.82)] p-2">
        <button
          type="button"
          onClick={()=> setView("evidence")}
          className={cx([
            "px-3 py-2 rounded-xl text-xs font-bold tracking-wide",
            view === "evidence"
              ? "bg-[rgba(2,167,202,0.18)] text-[rgba(255,255,255,0.92)]"
              : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.74)]",
          ])}
        >
          Evidence
        </button>
        <button
          type="button"
          onClick={()=> setView("risk")}
          className={cx([
            "px-3 py-2 rounded-xl text-xs font-bold tracking-wide",
            view === "risk"
              ? "bg-[rgba(2,167,202,0.18)] text-[rgba(255,255,255,0.92)]"
              : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.74)]",
          ])}
        >
          Risk
        </button>
      </div>

      {view === "evidence" ? <FlagshipEvidenceTractionEngine /> : <FlagshipRiskDecisionEngine />}
    </div>
  );
}
