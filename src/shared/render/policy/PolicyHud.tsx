import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { runtimePolicyGuard, type RuntimePolicyReport, type Surface } from "./runtimePolicyGuard";
import {
  clearRuntimePolicyReports,
  getRuntimePolicySnapshot,
  recordRuntimePolicyReport,
  subscribeRuntimePolicySnapshot
} from "./policyHudStore";

function truthy(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function readParam(name: string): string | null {
  try {
    const sp = new URLSearchParams(window.location.search);
    const direct = sp.get(name);
    if (direct !== null) return direct;

    // Support hash-router URLs: "#/route?x=1&y=2"
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex >= 0) {
      const hashQuery = hash.slice(qIndex + 1);
      const hp = new URLSearchParams(hashQuery);
      return hp.get(name);
    }
  } catch {
    // ignore
  }
  return null;
}

function pickRoot(surface: Surface): Element | null {
  if (surface === "stage") {
    return document.querySelector(".hi-stage");
  }
  if (surface === "ui") {
    return document.querySelector(".hi-shell") ?? document.getElementById("root") ?? document.body;
  }
  if (surface === "overlay") {
    return (
      document.querySelector("[data-radix-portal]") ??
      document.getElementById("radix-portal") ??
      document.getElementById("headlessui-portal-root") ??
      null
    );
  }
  if (surface === "inspector") {
    return document.querySelector(".hi-inspector__panel") ?? document.querySelector(".hi-inspector") ?? null;
  }
  return null;
}

function severity(report: RuntimePolicyReport | undefined): "OK" | "WARN" | "FAIL" | "MISS" {
  if (!report) return "MISS";
  if (report.errors.length > 0) return "FAIL";
  if (report.warnings.length > 0) return "WARN";
  return "OK";
}

function topViolations(report: RuntimePolicyReport | undefined, limit: number): string[] {
  if (!report) return [];
  const sorted = [...report.effects]
    .filter(e => e.level === "L3" || e.level === "L4")
    .sort((a, b) => b.score - a.score);
  return sorted.slice(0, limit).map(e => `${e.level} ${e.kind} (+${e.score}) on ${e.label}`);
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-10000px";
      el.style.top = "-10000px";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PolicyHud() {
  const isDev = Boolean(import.meta.env?.DEV);
  const [paused, setPaused] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const enabled = useMemo(() => {
    if (!isDev) return false;
    const qp = truthy(readParam("hiPolicy")) || truthy(readParam("hiPolicyHud"));
    const ls = truthy(localStorage.getItem("hiPolicyHud"));
    const ff = truthy(readParam("hiPolicyFail"));
    return qp || ls || ff;
  }, [isDev]);

  const failFast = useMemo(() => {
    if (!isDev) return false;
    return truthy(readParam("hiPolicyFail"));
  }, [isDev]);

  const snapshot = useSyncExternalStore(
    subscribeRuntimePolicySnapshot,
    getRuntimePolicySnapshot,
    getRuntimePolicySnapshot
  );

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void import("./policyHud.css");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      clearRuntimePolicyReports();
      return;
    }

    const runOnce = () => {
      const surfaces: Surface[] = ["stage", "ui", "overlay", "inspector"];
      for (const surface of surfaces) {
        const root = pickRoot(surface);
        if (!root) continue;

        const inspectorMode = surface === "inspector" ? "unsafe" : "safe";

        // schedule=false: do NOT attach DOMContentLoaded listeners (HUD polls manually)
        const scan = runtimePolicyGuard({
          root,
          surface,
          allowL3: false,
          inspectorMode,
          schedule: false,
          quiet: true,
          failFast
        });

        const report = scan();
        recordRuntimePolicyReport(report);
      }
    };

    runOnce();

    if (timerRef.current) window.clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = window.setInterval(runOnce, 1200);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, paused, failFast]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1200);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!enabled) return null;

  const reports = snapshot.reports;
  const stage = reports.stage;
  const ui = reports.ui;
  const overlay = reports.overlay;
  const inspector = reports.inspector;

  const allJson = {
    at: new Date().toISOString(),
    url: window.location.href,
    failFast,
    reports
  };

  const onCopy = async () => {
    const ok = await writeClipboard(JSON.stringify(allJson, null, 2));
    setToast(ok ? "✅ Copiado" : "❌ No se pudo copiar");
  };

  const onHide = () => {
    localStorage.setItem("hiPolicyHud", "0");
    setToast("Oculto (recarga para limpiar)");
    setCollapsed(true);
  };

  const onRescan = () => {
    setToast("🔁 Rescan");
    // quick trick: toggle pause twice to retrigger effect fast
    setPaused(true);
    window.setTimeout(() => setPaused(false), 30);
  };

  const renderRow = (label: string, report: RuntimePolicyReport | undefined) => {
    const sev = severity(report);
    const badge =
      sev === "FAIL" ? "FAIL" : sev === "WARN" ? "WARN" : sev === "OK" ? "OK" : "MISS";

    const top = topViolations(report, 6);

    return (
      <div className="hi-policy-hud__row">
        <div className="hi-policy-hud__rowHeader">
          <div><strong>{label}</strong></div>
          <div className="hi-policy-hud__badge">{badge}</div>
        </div>

        {!report ? (
          <div className="hi-policy-hud__small">Root no encontrado (aún). Abre la UI/inspector y vuelve a escanear.</div>
        ) : (
          <>
            <div className="hi-policy-hud__kv">
              <div className="hi-policy-hud__kvLine">score: <strong>{report.score}</strong> / {report.budget.scoreBudget}</div>
              <div className="hi-policy-hud__kvLine">maxLevel: <strong>{report.maxLevelUsed}</strong> / {report.budget.maxLevel}</div>
              <div className="hi-policy-hud__kvLine">L3: <strong>{report.l3Count}</strong> / {report.budget.maxL3}</div>
              <div className="hi-policy-hud__kvLine">L4: <strong>{report.l4Count}</strong> / {report.budget.maxL4}</div>
              <div className="hi-policy-hud__kvLine">backdrops: <strong>{report.backdropCount}</strong></div>
              <div className="hi-policy-hud__kvLine">allowL3: <strong>{String(report.allowL3ForSurface)}</strong></div>
            </div>

            {report.errors.length > 0 && (
              <div className="hi-policy-hud__small">
                <div><strong>Errors</strong></div>
                <ul className="hi-policy-hud__list">
                  {report.errors.slice(0, 4).map((e, idx) => <li key={idx}>{e}</li>)}
                </ul>
              </div>
            )}

            {report.warnings.length > 0 && (
              <div className="hi-policy-hud__small">
                <div><strong>Warnings</strong></div>
                <ul className="hi-policy-hud__list">
                  {report.warnings.slice(0, 4).map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
            )}

            {top.length > 0 && (
              <div className="hi-policy-hud__small">
                <div><strong>Top violations</strong></div>
                <ul className="hi-policy-hud__list">
                  {top.map((t, idx) => <li key={idx}>{t}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const hud = (
    <div className="hi-policy-hud" data-hi-policy-ignore="1">
      <div className="hi-policy-hud__header">
        <div>
          <div className="hi-policy-hud__title">🦖 hiPolicy HUD</div>
          <div className="hi-policy-hud__small">
            {failFast ? "FAIL-FAST ON" : "fail-fast off"} • {paused ? "paused" : "polling"} • updatedAt: {snapshot.updatedAt ? new Date(snapshot.updatedAt).toLocaleTimeString() : "--"}
          </div>
        </div>

        <div className="hi-policy-hud__btns">
          <button className="hi-policy-hud__btn" onClick={() => setCollapsed(v => !v)}>{collapsed ? "Expand" : "Collapse"}</button>
          <button className="hi-policy-hud__btn" onClick={() => setPaused(v => !v)}>{paused ? "Resume" : "Pause"}</button>
          <button className="hi-policy-hud__btn" onClick={onRescan}>Rescan</button>
          <button className="hi-policy-hud__btn" onClick={onCopy}>Copy report</button>
          <button className="hi-policy-hud__btn" onClick={onHide}>Hide</button>
        </div>
      </div>

      {!collapsed && (
        <div className="hi-policy-hud__body">
          <div className="hi-policy-hud__grid">
            {renderRow("stage", stage)}
            {renderRow("ui", ui)}
            {renderRow("overlay", overlay)}
            {renderRow("inspector", inspector)}
          </div>

          <div className="hi-policy-hud__small">
            Tip: <strong>?hiPolicy=1</strong> / <strong>localStorage.hiPolicyHud="1"</strong> / <strong>?hiPolicyFail=1</strong>
          </div>
        </div>
      )}

      {toast && (
        <div className="hi-policy-hud__body">
          <div className="hi-policy-hud__row">{toast}</div>
        </div>
      )}
    </div>
  );

  return createPortal(hud, document.body);
}