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
  },
]
