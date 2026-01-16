import React, { useCallback, useEffect, useRef, useState } from "react";
import { getHashSearchParams } from "@/rts/utils/hashQuery";

type Inventory = any;

function isEnabled(): boolean {
  try {
    const qs = getHashSearchParams();
    return qs.get("hiInspector") === "1";
  } catch {
    return false;
  }
}

async function fetchInventory(): Promise<Inventory | null> {
  try {
    const res = await fetch("/hi/Slide02.inventory.json", { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

type RenderInspectorPanelProps = {
  safe: boolean;
};

export function RenderInspectorPanel({ safe }: RenderInspectorPanelProps) {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [ts, setTs] = useState<string>("");
  const [open, setOpen] = useState(true);
  const lastSigRef = useRef<string>("");
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const enabled = isEnabled();

  const load = useCallback(async (force: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await fetchInventory();
      if (!aliveRef.current) return;
      const sig = JSON.stringify(data);
      if (force || sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setInv(data);
        setTs(new Date().toLocaleString());
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load(true);
  }, [enabled, load]);

  if (!enabled) return null;

  const slideFiles = inv?.slide02?.files ?? [];
  const problems = inv?.problems ?? [];
  const dataAttrs = inv?.slide02?.domSignals?.dataAttrsUsed ?? [];
  const hiClasses = inv?.slide02?.domSignals?.hiClassesUsed ?? [];
  const tokens = inv?.slide02?.domSignals?.tokensMentioned ?? [];

  return (
    <div
      className={safe ? "hi-inspector hi-inspector--safe" : "hi-inspector"}
      role="dialog"
      aria-label="Render Inspector"
    >
      <div className="hi-inspector__panel">
        <div className="hi-inspector__header">
          <div className="hi-inspector__row" style={{ justifyContent: "space-between", marginBottom: 0 }}>
            <div className="hi-inspector__title">Render Inspector - Slide02</div>
            <div className="hi-inspector__actions">
              <button
                type="button"
                className="hi-inspector__btn"
                onClick={() => void load(true)}
              >
                Refresh
              </button>
              <button
                type="button"
                className="hi-inspector__btn"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div className="hi-inspector__meta">
            <span>DEV</span>
          </div>
        </div>

        <div className="hi-inspector__body">
          <div className="hi-inspector__row">
            <span>inventory:</span>
            <code>/hi/Slide02.inventory.json</code>
          </div>
          <div className="hi-inspector__row">
            <span>refreshed:</span>
            <code>{ts || "-"}</code>
          </div>

          {open && (
            <>
              <div className="hi-inspector__row">
                <span>files:</span>
                <code>{slideFiles.length}</code>
                <span>problems:</span>
                <code>{problems.length}</code>
              </div>

              <div className="hi-inspector__row">
                <span>data-attrs:</span>
                <code>{dataAttrs.length}</code>
              </div>
              <div className="hi-inspector__row">
                <code>{dataAttrs.slice(0, 24).join(", ") || "-"}</code>
              </div>

              <div className="hi-inspector__row">
                <span>hi-classes:</span>
                <code>{hiClasses.length}</code>
              </div>
              <div className="hi-inspector__row">
                <code>{hiClasses.slice(0, 24).join(", ") || "-"}</code>
              </div>

              <div className="hi-inspector__row">
                <span>tokens:</span>
                <code>{tokens.length}</code>
              </div>
              <div className="hi-inspector__row">
                <code>{tokens.slice(0, 24).join(", ") || "-"}</code>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
