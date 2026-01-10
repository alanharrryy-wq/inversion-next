// src/system/consistency_rules.ts
// Visual Consistency Rules (Foundation)
// NOTE: This is a baseline registry; enforcement is expanded in future blocks.

export type Severity = "info" | "warn" | "error";

export type SlideSpec = {
  id: string;
  archetype: string;
  usesVisualSystem?: boolean;
  usesNumericKpis?: boolean; // must be false in canon
  notes?: string[];
  bulletCount?: number;
  sectionCount?: number;
  hasCharts?: boolean;
  hasTables?: boolean;
  hasDates?: boolean;
};

export type RuleResult = { ruleId: string; severity: Severity; message: string };

export type Rule = {
  id: string;
  severity: Severity;
  description: string;
  check: (spec: SlideSpec) => RuleResult | null;
};

export const RULES: Rule[] = [
  {
    id: "VS_REQUIRED",
    severity: "warn",
    description: "Slide should declare it uses the Visual System (tokens + primitives).",
    check: (spec) =>
      spec.usesVisualSystem ? null : { ruleId: "VS_REQUIRED", severity: "warn", message: "Slide does not declare usesVisualSystem=true." },
  },
  {
    id: "NO_NUMERIC_KPIS",
    severity: "error",
    description: "Numeric KPI values are forbidden in this phase/canon.",
    check: (spec) =>
      spec.usesNumericKpis ? { ruleId: "NO_NUMERIC_KPIS", severity: "error", message: "usesNumericKpis=true is forbidden." } : null,
  },

  {
    id: "MAX_BULLETS",
    severity: "warn",
    description: "Keep bullets under control (default 7).",
    check: (spec) =>
      typeof spec.bulletCount === "number" && spec.bulletCount > 7
        ? { ruleId: "MAX_BULLETS", severity: "warn", message: "bulletCount=" + spec.bulletCount + " (recommended ≤ 7)." }
        : null,
  },
  {
    id: "SECTION_SANITY",
    severity: "info",
    description: "Too many sections tends to fragment executive scanning.",
    check: (spec) =>
      typeof spec.sectionCount === "number" && spec.sectionCount > 4
        ? { ruleId: "SECTION_SANITY", severity: "info", message: "sectionCount=" + spec.sectionCount + " (recommended ≤ 4)." }
        : null,
  },
  {
    id: "CHART_DISCLOSURE",
    severity: "warn",
    description: "If a slide has charts/tables, include a source note.",
    check: (spec) => {
      const needs = !!(spec.hasCharts || spec.hasTables)
      if (!needs) return null
      const notes = spec.notes ?? []
      const hasSource = notes.some((n) => /source|fuente|data/i.test(n))
      return hasSource
        ? null
        : { ruleId: "CHART_DISCLOSURE", severity: "warn", message: "Charts/Tables present but no data source note found." }
    },
  },
  {
    id: "DATES_NEED_CONTEXT",
    severity: "info",
    description: "If a slide references dates, add context in notes (timezone, as-of).",
    check: (spec) => {
      if (!spec.hasDates) return null
      const notes = spec.notes ?? []
      const ok = notes.some((n) => /as[- ]of|al\s+\d{1,2}|timezone|tz|CDMX/i.test(n))
      return ok
        ? null
        : { ruleId: "DATES_NEED_CONTEXT", severity: "info", message: "Dates referenced but no as-of/timezone context in notes." }
    },
  },
];
