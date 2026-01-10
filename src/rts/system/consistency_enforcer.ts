// src/system/consistency_enforcer.ts
import { RULES, RuleResult, SlideSpec } from "./consistency_rules";

export function runConsistencyEnforcer(spec: SlideSpec): RuleResult[] {
  const results: RuleResult[] = [];
  for (const r of RULES) {
    const hit = r.check(spec);
    if (hit) results.push(hit);
  }
  return results;
}

/**
 * Dev-only helper: log consistency results in console.
 * Future blocks can elevate this into UI overlays and CI checks.
 */
export function logConsistency(
  spec: SlideSpec,
  opts?: { force?: boolean; quiet?: boolean; capture?: boolean }
): RuleResult[] {
  const isDev = typeof import.meta !== "undefined" && (import.meta as any).env ? (import.meta as any).env.DEV : false
  if (!isDev && !opts?.force) return []

  const res = runConsistencyEnforcer(spec)

  // Capture last results for debug overlays
  if (opts?.capture !== false) {
    ;(globalThis as any).__rts_vs_last = { spec, results: res, ts: Date.now() }
  }

  if (opts?.quiet || !res.length) return res

  // Group output for fast debugging without polluting production
  // eslint-disable-next-line no-console
  console.groupCollapsed("[VS] Consistency warnings for " + spec.id + " (" + spec.archetype + ")")
  for (const r of res) {
    const tag = r.severity.toUpperCase()
    // eslint-disable-next-line no-console
    console.log(tag + " " + r.ruleId + ": " + r.message)
  }
  // eslint-disable-next-line no-console
  console.groupEnd()

  return res
}
