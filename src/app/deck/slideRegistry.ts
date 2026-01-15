import { lazy } from "react"
import type { SlideEntry } from "@/app/deck/deck.types"

export const slideRegistry: SlideEntry[] = [
  {
    meta: { id: "slide-00", title: "Portada", tags: ["intro"] },
    Component: lazy(() => import("@/slides/slide-00").then(m => ({ default: m.default }))),
  },
  {
    meta: { id: "slide-01", title: "Agenda", tags: ["overview"] },
    Component: lazy(() => import("@/slides/slide-01").then(m => ({ default: m.default }))),
  },  {
    meta: { id: "slide-02", title: "RTS: Executive Narrative", tags: ["rts", "executive"] },
    Component: lazy(() => import("@/slides/slide-02").then(m => ({ default: m.default }))),
  },

  {
    meta: { id: "slide-03", title: "RTS: Problem / Context", tags: ["rts", "context"] },
    Component: lazy(() => import("@/slides/slide-03").then(m => ({ default: m.default }))),
  },
  {
    meta: { id: "slide-04", title: "RTS: Solution / System Overview", tags: ["rts", "solution"] },
    Component: lazy(() => import("@/slides/slide-04").then(m => ({ default: m.default }))),
  },
  {
    meta: { id: "slide-05", title: "RTS: KPI Dashboard", tags: ["rts", "kpi"] },
    Component: lazy(() => import("@/slides/slide-05").then(m => ({ default: m.default }))),
  },
  {
    meta: { id: "slide-06", title: "RTS: Timeline / Roadmap", tags: ["rts", "roadmap"] },
    Component: lazy(() => import("@/slides/slide-06").then(m => ({ default: m.default }))),
  },
  {
    meta: { id: "slide-07", title: "RTS: Risks and Next Steps", tags: ["rts", "risks"] },
    Component: lazy(() => import("@/slides/slide-07").then(m => ({ default: m.default }))),
  },
]

