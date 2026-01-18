import React, { memo, useCallback, useLayoutEffect, useRef, useState } from "react";

type Inventory = any;

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

type InspectorState = {
  inv: Inventory | null;
  ts: string;
};

const emptyList: any[] = [];

export const RenderInspectorPanel = memo(function RenderInspectorPanel({ safe }: RenderInspectorPanelProps) {
  const [state, setState] = useState<InspectorState>({ inv: null, ts: "" });
  const [open, setOpen] = useState(true);
  const lastSigRef = useRef<string>("");
  const inFlightRef = useRef(false);
  const aliveRef = useRef(true);

  useLayoutEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(async (force: boolean) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await fetchInventory();
      if (!aliveRef.current) return;
      const sig = JSON.stringify(data);
      if (force || sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setState({ inv: data, ts: new Date().toLocaleString() });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useLayoutEffect(() => {
    void load(true);
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const onToggleOpen = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const slideFiles = state.inv?.slide02?.files ?? emptyList;
  const problems = state.inv?.problems ?? emptyList;
  const dataAttrs = state.inv?.slide02?.domSignals?.dataAttrsUsed ?? emptyList;
  const hiClasses = state.inv?.slide02?.domSignals?.hiClassesUsed ?? emptyList;
  const tokens = state.inv?.slide02?.domSignals?.tokensMentioned ?? emptyList;

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
                onClick={onRefresh}
              >
                Refresh
              </button>
              <button
                type="button"
                className="hi-inspector__btn"
                onClick={onToggleOpen}
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
            <code>{state.ts || "-"}</code>
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
});
