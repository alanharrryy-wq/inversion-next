// src/rts/devtools/RtsDebugOverlay.tsx
import { useEffect, useMemo, useState } from "react"
import { getHashSearchParams } from "../utils/hashQuery"

type Last = {
  spec: { id: string; archetype: string }
  results: Array<{ ruleId: string; severity: "info" | "warn" | "error"; message: string }>
  ts: number
}

function isEnabled() {
  const qs = getHashSearchParams()
  return qs.get("rts") === "1" || qs.get("vs") === "1" || qs.get("rtsDebug") === "1"
}

export function RtsDebugOverlay() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isEnabled()) return
    const id = window.setInterval(() => setTick((t) => t + 1), 600)
    return () => window.clearInterval(id)
  }, [])

  const last = useMemo(() => {
    void tick
    return (globalThis as any).__rts_vs_last as Last | undefined
  }, [tick])

  if (typeof window === "undefined") return null
  if (!isEnabled()) return null
  if (!last) return null

  const worst = last.results.some((r) => r.severity === "error")
    ? "error"
    : last.results.some((r) => r.severity === "warn")
      ? "warn"
      : "info"

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        width: 420,
        zIndex: 50_000,
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(10px)",
        color: "rgba(255,255,255,0.92)",
        fontFamily: "ui-sans-serif, system-ui",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          VS Debug <span style={{ opacity: 0.75 }}>({worst})</span>
        </div>
        <div style={{ opacity: 0.65, fontSize: 12 }}>
          {last.spec.id} · {last.spec.archetype}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 260, overflow: "auto" }}>
        {last.results.length ? (
          last.results.map((r, i) => (
            <div key={i} style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>
                  {r.severity.toUpperCase()} · {r.ruleId}
                </div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>VS</div>
              </div>
              <div style={{ marginTop: 6, opacity: 0.9, fontSize: 12, lineHeight: 1.35 }}>{r.message}</div>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.85, fontSize: 12 }}>Sin warnings. Todo chulo ✅</div>
        )}
      </div>

      <div style={{ marginTop: 10, opacity: 0.65, fontSize: 11 }}>
        Tip: agrega <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>?vs=1</span> al hash.
      </div>
    </div>
  )
}
