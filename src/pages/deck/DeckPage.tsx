import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { DECK } from "@/shared/config/constants"
import { SlideStage } from "@/shared/ui/slide/SlideStage"
import { slideRegistry } from "@/app/deck/slideRegistry"
import { SlideNav } from "@/widgets/slide-nav/ui/SlideNav"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function useQueryParam(name: string) {
  const loc = useLocation()
  return useMemo(() => new URLSearchParams(loc.search).get(name), [loc.search, name])
}

export function DeckPage() {
  const navigate = useNavigate()
  const loc = useLocation()
  const sParam = useQueryParam("s")
  const total = slideRegistry.length

  const idxFromUrl = sParam ? Number(sParam) : 0
  const index = Number.isFinite(idxFromUrl) ? clamp(idxFromUrl, 0, total - 1) : 0

  const entry = slideRegistry[index]
  const Slide = entry.Component

  function go(nextIndex: number) {
    const safe = clamp(nextIndex, 0, total - 1)
    const qs = new URLSearchParams(loc.search)
    qs.set("s", String(safe))
    navigate({ pathname: loc.pathname, search: qs.toString() }, { replace: true })
  }

  function next() {
    go(index + 1)
  }

  function prev() {
    go(index - 1)
  }

  return (
    <div className="min-h-svh w-full">
      <div className="mx-auto w-full max-w-[1920px] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="text-sm opacity-80">{DECK.appName}</div>
            <div className="text-lg font-semibold">
              {entry.meta.title}
              <span className="ml-2 text-sm opacity-70">
                ({index + 1}/{total})
              </span>
            </div>
          </div>

          <SlideNav index={index} total={total} onPrev={prev} onNext={next} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_12px_50px_rgba(0,0,0,0.35)]">
          <SlideStage width={DECK.slideWidth} height={DECK.slideHeight}>
            <Slide index={index} total={total} />
          </SlideStage>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs opacity-75">
          <div>Atajos: ← →, PageUp/PageDown, Home</div>
          <div>
            Deep link: <span className="font-mono">?s={index}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
