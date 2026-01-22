import type { RuntimePolicyReport, Surface } from "./runtimePolicyGuard";

export type PolicyHudSnapshot = {
  updatedAt: number;
  reports: Partial<Record<Surface, RuntimePolicyReport>>;
};

let snapshot: PolicyHudSnapshot = { updatedAt: 0, reports: {} };
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function recordRuntimePolicyReport(report: RuntimePolicyReport) {
  snapshot = {
    updatedAt: Date.now(),
    reports: { ...snapshot.reports, [report.surface]: report }
  };
  emit();
}

export function clearRuntimePolicyReports() {
  snapshot = { updatedAt: Date.now(), reports: {} };
  emit();
}

export function getRuntimePolicySnapshot(): PolicyHudSnapshot {
  return snapshot;
}

export function subscribeRuntimePolicySnapshot(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}