const isDev = (() => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return Boolean(import.meta.env.DEV);
  }
  const maybeProcess =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
      : undefined;
  if (maybeProcess?.env?.NODE_ENV) {
    return maybeProcess.env.NODE_ENV !== "production";
  }
  return true;
})();

export type Surface = "stage" | "ui" | "overlay" | "inspector";

export type InspectorMode = "safe" | "unsafe";

export type GuardOptions = {
  root?: Document | Element;
  surface?: Surface;
  allowL3?: boolean;
  inspectorMode?: InspectorMode;

  /**
   * If true, don't schedule automatically (you call the returned scan fn yourself).
   * Default: true
   */
  schedule?: boolean;

  /**
   * If true, suppress console.warn/error spam (useful for HUD polling).
   * Default: false
   */
  quiet?: boolean;

  /**
   * If true, throws an Error when violations (errors) exist.
   * DEV-only. Great for "?hiPolicyFail=1".
   * Default: false
   */
  failFast?: boolean;
};

export type Budget = {
  maxLevel: "L2" | "L3";
  maxL3: number;
  maxL4: number;
  scoreBudget: number;
};

const BUDGETS = {
  stage: { maxLevel: "L2", maxL3: 0, maxL4: 0, scoreBudget: 10 },
  overlay: { maxLevel: "L2", maxL3: 1, maxL4: 0, scoreBudget: 14 },
  ui: { maxLevel: "L3", maxL3: 2, maxL4: 0, scoreBudget: 22 },
  inspector: {
    maxLevel: "L3",
    maxL4: 0,
    safe: { maxL3: 0, scoreBudget: 10 },
    unsafe: { maxL3: 1, scoreBudget: 14 }
  }
} as const;

const SCORES = {
  backdropFilter: 10,
  filter: 8,
  mixBlendMode: 6,
  largeBlurShadow: 6,

const LEVEL_RANK = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 } as const;

type DetectedEffect = {
  element: Element;
  label: string;
  level: "L2" | "L3" | "L4";
  score: number;
  kind: string;
};

export type SerializableEffect = {
  label: string;
  level: "L2" | "L3" | "L4";
  score: number;
  kind: string;
};

export type RuntimePolicyReport = {
  at: number;
  surface: Surface;
  allowL3ForSurface: boolean;
  inspectorMode: InspectorMode;
  budget: Budget;

  maxLevelUsed: "L0" | "L2" | "L3" | "L4";
  l3Count: number;
  l4Count: number;
  backdropCount: number;
  score: number;

  errors: string[];
  warnings: string[];
  effects: SerializableEffect[];
};

function parseDurationMs(value: string): number[] {
  return value
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      if (part.endsWith("ms")) {
        return Number.parseFloat(part) || 0;
      }
      if (part.endsWith("s")) {
        return (Number.parseFloat(part) || 0) * 1000;
      }
      return 0;
    });
}

function parseLengthToken(token: string): number | null {
  const match = token.match(/^(-?\d*\.?\d+)(px|rem|em)$/i);
  if (!match) return null;
  const value = Math.abs(Number.parseFloat(match[1]));
  const unit = match[2].toLowerCase();
  if (unit === "px") return value;
  return value * 16;
}

function isLargeBlurShadow(value: string): boolean {
  if (!value || value === "none") return false;
  const shadows = value.split(",");
  for (const shadow of shadows) {
    const parts = shadow.trim().split(/\s+/).filter(Boolean);
    const lengths: number[] = [];
    for (const part of parts) {
      const len = parseLengthToken(part);
      if (len !== null) lengths.push(len);
    }
    if (lengths.length >= 3 && lengths[2] >= 20) {
      return true;
    }
  }
  return false;
}

function getElementLabel(element: Element): string {
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof (element as HTMLElement).className === "string" && (element as HTMLElement).className.trim()
      ? `.${(element as HTMLElement).className.trim().split(/\s+/).join(".")}`
      : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

function getBudget(surface: Surface, allowL3: boolean, inspectorMode: InspectorMode): Budget {
  if (surface === "inspector") {
    const mode = inspectorMode || "safe";
    const selection = BUDGETS.inspector[mode];
    return {
      maxLevel: BUDGETS.inspector.maxLevel,
      maxL3: selection.maxL3,
      maxL4: BUDGETS.inspector.maxL4,
      scoreBudget: selection.scoreBudget
    };
  }
  const base = BUDGETS[surface];
  if (surface === "overlay" && allowL3) {
    return { ...base, maxLevel: "L3" };
  }
  return { ...base };
}

function canUseL3(surface: Surface, allowL3: boolean, inspectorMode: InspectorMode): boolean {
  if (surface === "stage") return false;
  if (surface === "ui") return true;
  if (surface === "overlay") return allowL3;
  if (surface === "inspector") return inspectorMode === "unsafe";
  return false;
}

const POLICY_IGNORE_SELECTOR = "[data-hi-policy-ignore='1']";

export function runtimePolicyGuard(options: GuardOptions = {}): () => RuntimePolicyReport {
  if (!isDev) {
    return () => ({
      at: Date.now(),
      surface: options.surface ?? "ui",
      allowL3ForSurface: false,
      inspectorMode: "safe",
      budget: { maxLevel: "L2", maxL3: 0, maxL4: 0, scoreBudget: 0 },
      maxLevelUsed: "L0",
      l3Count: 0,
      l4Count: 0,
      backdropCount: 0,
      score: 0,
      errors: [],
      warnings: [],
      effects: []
    });
  }
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => ({
      at: Date.now(),
      surface: options.surface ?? "ui",
      allowL3ForSurface: false,
      inspectorMode: "safe",
      budget: { maxLevel: "L2", maxL3: 0, maxL4: 0, scoreBudget: 0 },
      maxLevelUsed: "L0",
      l3Count: 0,
      l4Count: 0,
      backdropCount: 0,
      score: 0,
      errors: [],
      warnings: [],
      effects: []
    });
  }

  const root = options.root ?? document.body;
  const surface = options.surface ?? "ui";
  const allowL3 = options.allowL3 === true;
  const inspectorMode: InspectorMode = options.inspectorMode ?? (allowL3 ? "unsafe" : "safe");
  const budget = getBudget(surface, allowL3, inspectorMode);
  const allowL3ForSurface = canUseL3(surface, allowL3, inspectorMode);

  const quiet = options.quiet === true;
  const failFast = options.failFast === true;
  const shouldSchedule = options.schedule !== false;

  const scan = (): RuntimePolicyReport => {
    const elements: Element[] = [];
    if (root instanceof Element) {
      elements.push(root);
      elements.push(...Array.from(root.querySelectorAll("*")));
    } else {
      elements.push(...Array.from(root.querySelectorAll("*")));
    }

    const effects: DetectedEffect[] = [];
    let maxLevelUsed: "L0" | "L2" | "L3" | "L4" = "L0";
    let l3Count = 0;
    let l4Count = 0;
    let score = 0;
    let backdropCount = 0;

    for (const element of elements) {
      if (element.closest(POLICY_IGNORE_SELECTOR)) {
        continue;
      }

      const style = window.getComputedStyle(element);
      const label = getElementLabel(element);
      const isIsolated = style.isolation === "isolate";
      const contain = style.contain || "";
      const hasContain = contain.includes("paint") || contain.includes("layout");
      const discount = isIsolated && hasContain ? 2 : 0;

      const addEffect = (effect: DetectedEffect) => {
        effects.push(effect);
        score += effect.score;
        if (LEVEL_RANK[effect.level] > LEVEL_RANK[maxLevelUsed]) {
          maxLevelUsed = effect.level;
        }
        if (effect.level === "L3") l3Count += 1;
        if (effect.level === "L4") l4Count += 1;
      };

      const backdrop =
        style.getPropertyValue("backdrop-filter") || (style as CSSStyleDeclaration).backdropFilter;
      const webkitBackdrop = style.getPropertyValue("-webkit-backdrop-filter");
      if (
        (backdrop && backdrop !== "none") ||
        (webkitBackdrop && webkitBackdrop !== "none")
      ) {
        backdropCount += 1;
        const baseScore = SCORES.backdropFilter;
        const adjustedScore = Math.max(6, baseScore - discount);
        addEffect({ element, label, level: "L3", score: adjustedScore, kind: "backdrop-filter" });
      }

      if (style.filter && style.filter !== "none") {
        const baseScore = SCORES.filter;
        const adjustedScore = Math.max(6, baseScore - discount);
        addEffect({ element, label, level: "L3", score: adjustedScore, kind: "filter" });
      }

      if (style.mixBlendMode && style.mixBlendMode !== "normal") {
        const baseScore = SCORES.mixBlendMode;
        const adjustedScore = Math.max(6, baseScore - discount);
        addEffect({ element, label, level: "L3", score: adjustedScore, kind: "mix-blend-mode" });
      }

      if (isLargeBlurShadow(style.boxShadow)) {
        const baseScore = SCORES.largeBlurShadow;
        const adjustedScore = Math.max(6, baseScore - discount);
        addEffect({ element, label, level: "L3", score: adjustedScore, kind: "large-blurred-shadow" });
      }

      if (style.willChange && style.willChange !== "auto" && style.willChange !== "none") {
        const normalized = style.willChange.toLowerCase();
        const isL3 =
          normalized.includes("filter") ||
          normalized.includes("backdrop-filter") ||
          normalized.includes("blur");
        if (isL3) {
          const baseScore = SCORES.willChangeBlur;
          const adjustedScore = Math.max(6, baseScore - discount);
          addEffect({ element, label, level: "L3", score: adjustedScore, kind: "will-change" });
        } else {
          addEffect({ element, label, level: "L2", score: SCORES.willChange, kind: "will-change" });
        }
      }

      const animationNames = style.animationName.split(",").map(item => item.trim());
      const animationDurations = parseDurationMs(style.animationDuration);
      const hasAnimation = animationNames.some((name, idx) => {
        const duration = animationDurations[idx] ?? 0;
        return name !== "none" && duration > 0;
      });
      if (hasAnimation) {
        addEffect({ element, label, level: "L4", score: SCORES.animation, kind: "animation" });
      }

      const transitionProps = style.transitionProperty
        .split(",")
        .map(item => item.trim().toLowerCase());
      const transitionDurations = parseDurationMs(style.transitionDuration);
      const hasTransitionDuration = transitionDurations.some(duration => duration > 0);
      const hasTrackedTransition =
        transitionProps.includes("all") ||
        transitionProps.some(prop => ["transform", "opacity", "filter"].includes(prop));
      if (hasTransitionDuration && hasTrackedTransition) {
        addEffect({ element, label, level: "L4", score: SCORES.transition, kind: "transition" });
      }

      if (element.classList.contains("hi-panel") || element.classList.contains("board-glass")) {
        if (
          style.getPropertyValue("backdrop-filter") &&
          style.getPropertyValue("backdrop-filter") !== "none"
        ) {
          addEffect({ element, label, level: "L3", score: SCORES.backdropFilter, kind: "panel-blur" });
        }
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const effect of effects) {
      if (effect.level === "L4") {
        errors.push(`L4 forbidden: ${effect.kind} on ${effect.label}.`);
      }
      if (effect.level === "L3" && !allowL3ForSurface) {
        errors.push(`L3 forbidden for ${surface}: ${effect.kind} on ${effect.label}.`);
      }
    }

    if (backdropCount > 1) {
      errors.push(`Centralized Blur Rule violated: ${backdropCount} backdrop-filters on ${surface}.`);
    }

    if (l3Count > budget.maxL3) {
      warnings.push(`L3 count ${l3Count} exceeds budget ${budget.maxL3} on ${surface}.`);
    }

    if (l4Count > budget.maxL4) {
      errors.push(`L4 count ${l4Count} exceeds budget ${budget.maxL4} on ${surface}.`);
    }

    if (score > budget.scoreBudget) {
      warnings.push(`Score ${score} exceeds budget ${budget.scoreBudget} on ${surface}.`);
    }

    if (LEVEL_RANK[maxLevelUsed] > LEVEL_RANK[budget.maxLevel]) {
      errors.push(`Max level ${budget.maxLevel} exceeded on ${surface}.`);
    }

    const report: RuntimePolicyReport = {
      at: Date.now(),
      surface,
      allowL3ForSurface,
      inspectorMode,
      budget,
      maxLevelUsed,
      l3Count,
      l4Count,
      backdropCount,
      score,
      errors,
      warnings,
      effects: effects.map(e => ({ label: e.label, level: e.level, score: e.score, kind: e.kind }))
    };

    if (!quiet) {
      if (errors.length > 0) {
        console.error("[render-policy] violations", {
          surface,
          errors,
          warnings,
          budget,
          maxLevelUsed
        });
      } else if (warnings.length > 0) {
        console.warn("[render-policy] budget warnings", {
          surface,
          warnings,
          budget,
          maxLevelUsed
        });
      }
    }

    if (failFast && errors.length > 0) {
      throw new Error(`[render-policy] FAIL-FAST on ${surface}: ${errors[0] ?? "violations"}`);
    }

    return report;
  };

  const schedule = () => {
    setTimeout((, 16) => {
      window.setTimeout(() => {
        void scan();
      }, 0);
    });
  };

  if (shouldSchedule) {
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", schedule, { once: true });
    } else {
      schedule();
    }
  }

  return scan;
}