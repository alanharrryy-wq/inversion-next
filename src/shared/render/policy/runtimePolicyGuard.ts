const isDev = (() => {
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return Boolean((import.meta as any).env.DEV)
  }
  const maybeProcess =
    typeof globalThis !== "undefined"
      ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
      : undefined
  if (maybeProcess?.env?.NODE_ENV) return maybeProcess.env.NODE_ENV !== "production"
  return true
})()

export type Surface = "stage" | "ui" | "overlay" | "inspector"
export type InspectorMode = "safe" | "unsafe"

export type GuardOptions = {
  root?: Document | Element
  surface?: Surface
  allowL3?: boolean
  inspectorMode?: InspectorMode
  schedule?: boolean
  quiet?: boolean
  failFast?: boolean
}

export type Budget = {
  maxLevel: "L2" | "L3"
  maxL3: number
  maxL4: number
  scoreBudget: number
}

const BUDGETS = {
  stage: { maxLevel: "L2", maxL3: 0, maxL4: 0, scoreBudget: 10 },
  overlay: { maxLevel: "L2", maxL3: 1, maxL4: 0, scoreBudget: 14 },
  ui: { maxLevel: "L3", maxL3: 2, maxL4: 0, scoreBudget: 22 },
  inspector: {
    maxLevel: "L3",
    maxL4: 0,
    safe: { maxL3: 0, scoreBudget: 10 },
    unsafe: { maxL3: 1, scoreBudget: 14 },
  },
} as const

const SCORES = {
  backdropFilter: 10,
  filter: 8,
  mixBlendMode: 6,
  largeBlurShadow: 6,
  animation: 12,
  transition: 6,
  willChange: 3,
  willChangeBlur: 8,
} as const

const LEVEL_RANK = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 } as const

type DetectedEffect = {
  element: Element
  label: string
  level: "L2" | "L3" | "L4"
  score: number
  kind: string
}

export type SerializableEffect = {
  label: string
  level: "L2" | "L3" | "L4"
  score: number
  kind: string
}

export type RuntimePolicyReport = {
  at: number
  surface: Surface
  allowL3ForSurface: boolean
  inspectorMode: InspectorMode
  budget: Budget
  maxLevelUsed: "L0" | "L2" | "L3" | "L4"
  l3Count: number
  l4Count: number
  backdropCount: number
  score: number
  errors: string[]
  warnings: string[]
  effects: SerializableEffect[]
}

function parseDurationMs(value: string): number[] {
  return value
    .split(",")
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      if (p.endsWith("ms")) return Number.parseFloat(p) || 0
      if (p.endsWith("s")) return (Number.parseFloat(p) || 0) * 1000
      return 0
    })
}

function parseLengthToken(token: string): number | null {
  const m = token.match(/^(-?\d*\.?\d+)(px|rem|em)$/i)
  if (!m) return null
  const value = Math.abs(Number.parseFloat(m[1]))
  const unit = m[2].toLowerCase()
  if (unit === "px") return value
  return value * 16
}

function isLargeBlurShadow(value: string): boolean {
  if (!value || value === "none") return false
  const shadows = value.split(",")
  for (const shadow of shadows) {
    const parts = shadow.trim().split(/\s+/).filter(Boolean)
    const lengths: number[] = []
    for (const part of parts) {
      const len = parseLengthToken(part)
      if (len !== null) lengths.push(len)
    }
    if (lengths.length >= 3 && lengths[2] >= 20) return true
  }
  return false
}

function getElementLabel(el: Element): string {
  const id = el.id ? `#${el.id}` : ""
  const cls =
    typeof (el as HTMLElement).className === "string" && (el as HTMLElement).className.trim()
      ? `.${(el as HTMLElement).className.trim().split(/\s+/).join(".")}`
      : ""
  return `${el.tagName.toLowerCase()}${id}${cls}`
}

function getBudget(surface: Surface, allowL3: boolean, inspectorMode: InspectorMode): Budget {
  if (surface === "inspector") {
    const mode = inspectorMode || "safe"
    const sel = (BUDGETS.inspector as any)[mode]
    return {
      maxLevel: BUDGETS.inspector.maxLevel,
      maxL3: sel.maxL3,
      maxL4: BUDGETS.inspector.maxL4,
      scoreBudget: sel.scoreBudget,
    }
  }
  const base = (BUDGETS as any)[surface] as Budget
  if (surface === "overlay" && allowL3) return { ...base, maxLevel: "L3" }
  return { ...base }
}

function canUseL3(surface: Surface, allowL3: boolean, inspectorMode: InspectorMode): boolean {
  if (surface === "stage") return false
  if (surface === "ui") return true
  if (surface === "overlay") return allowL3
  if (surface === "inspector") return inspectorMode === "unsafe"
  return false
}

const POLICY_IGNORE_SELECTOR = "[data-hi-policy-ignore='1']"

export function runtimePolicyGuard(options: GuardOptions = {}): () => RuntimePolicyReport {
  if (!isDev || typeof window === "undefined" || typeof document === "undefined") {
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
      effects: [],
    })
  }

  const root = options.root ?? document.body
  const surface = options.surface ?? "ui"
  const allowL3 = options.allowL3 === true
  const inspectorMode: InspectorMode = options.inspectorMode ?? (allowL3 ? "unsafe" : "safe")
  const budget = getBudget(surface, allowL3, inspectorMode)
  const allowL3ForSurface = canUseL3(surface, allowL3, inspectorMode)

  const quiet = options.quiet === true
  const failFast = options.failFast === true
  const shouldSchedule = options.schedule !== false

  const scan = (): RuntimePolicyReport => {
    const elements: Element[] = []
    if (root instanceof Element) {
      elements.push(root, ...Array.from(root.querySelectorAll("*")))
    } else {
      elements.push(...Array.from(root.querySelectorAll("*")))
    }

    const effects: DetectedEffect[] = []
    let maxLevelUsed: "L0" | "L2" | "L3" | "L4" = "L0"
    let l3Count = 0
    let l4Count = 0
    let score = 0
    let backdropCount = 0

    for (const el of elements) {
      if (el.closest(POLICY_IGNORE_SELECTOR)) continue

      const style = window.getComputedStyle(el)
      const label = getElementLabel(el)

      const add = (effect: DetectedEffect) => {
        effects.push(effect)
        score += effect.score
        if (LEVEL_RANK[effect.level] > LEVEL_RANK[maxLevelUsed]) maxLevelUsed = effect.level
        if (effect.level === "L3") l3Count++
        if (effect.level === "L4") l4Count++
      }

      const backdrop = style.getPropertyValue("backdrop-filter") || (style as any).backdropFilter
      const webkitBackdrop = style.getPropertyValue("-webkit-backdrop-filter")
      if ((backdrop && backdrop !== "none") || (webkitBackdrop && webkitBackdrop !== "none")) {
        backdropCount++
        add({ element: el, label, level: "L3", score: SCORES.backdropFilter, kind: "backdrop-filter" })
      }

      if (style.filter && style.filter !== "none") {
        add({ element: el, label, level: "L3", score: SCORES.filter, kind: "filter" })
      }

      if (style.mixBlendMode && style.mixBlendMode !== "normal") {
        add({ element: el, label, level: "L3", score: SCORES.mixBlendMode, kind: "mix-blend-mode" })
      }

      if (isLargeBlurShadow(style.boxShadow)) {
        add({ element: el, label, level: "L3", score: SCORES.largeBlurShadow, kind: "large-blurred-shadow" })
      }

      if (style.willChange && style.willChange !== "auto" && style.willChange !== "none") {
        const normalized = style.willChange.toLowerCase()
        const isL3 = normalized.includes("filter") || normalized.includes("backdrop-filter") || normalized.includes("blur")
        if (isL3) add({ element: el, label, level: "L3", score: SCORES.willChangeBlur, kind: "will-change" })
        else add({ element: el, label, level: "L2", score: SCORES.willChange, kind: "will-change" })
      }

      const animNames = style.animationName.split(",").map(s => s.trim())
      const animDur = parseDurationMs(style.animationDuration)
      const hasAnim = animNames.some((n, i) => n !== "none" && (animDur[i] ?? 0) > 0)
      if (hasAnim) add({ element: el, label, level: "L4", score: SCORES.animation, kind: "animation" })

      const transProps = style.transitionProperty.split(",").map(s => s.trim().toLowerCase())
      const transDur = parseDurationMs(style.transitionDuration)
      const hasTransDur = transDur.some(ms => ms > 0)
      const hasTracked = transProps.includes("all") || transProps.some(p => ["transform", "opacity", "filter"].includes(p))
      if (hasTransDur && hasTracked) add({ element: el, label, level: "L4", score: SCORES.transition, kind: "transition" })
    }

    const errors: string[] = []
    const warnings: string[] = []

    for (const e of effects) {
      if (e.level === "L4") errors.push(`L4 forbidden: ${e.kind} on ${e.label}.`)
      if (e.level === "L3" && !allowL3ForSurface) errors.push(`L3 forbidden for ${surface}: ${e.kind} on ${e.label}.`)
    }

    if (backdropCount > 1) errors.push(`Centralized Blur Rule violated: ${backdropCount} backdrop-filters on ${surface}.`)
    if (l3Count > budget.maxL3) warnings.push(`L3 count ${l3Count} exceeds budget ${budget.maxL3} on ${surface}.`)
    if (l4Count > budget.maxL4) errors.push(`L4 count ${l4Count} exceeds budget ${budget.maxL4} on ${surface}.`)
    if (score > budget.scoreBudget) warnings.push(`Score ${score} exceeds budget ${budget.scoreBudget} on ${surface}.`)
    if (LEVEL_RANK[maxLevelUsed] > LEVEL_RANK[budget.maxLevel]) errors.push(`Max level ${budget.maxLevel} exceeded on ${surface}.`)

    if (!quiet) {
      if (errors.length) console.error("[render-policy] violations", { surface, errors, warnings, budget, maxLevelUsed })
      else if (warnings.length) console.warn("[render-policy] budget warnings", { surface, warnings, budget, maxLevelUsed })
    }

    if (failFast && errors.length) throw new Error(`[render-policy] FAIL-FAST on ${surface}: ${errors[0] ?? "violations"}`)

    return {
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
      effects: effects.map(e => ({ label: e.label, level: e.level, score: e.score, kind: e.kind })),
    }
  }

  const schedule = () => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        void scan()
      }, 0)
    })
  }

  if (shouldSchedule) {
    if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", schedule, { once: true })
    else schedule()
  }

  return scan
}