import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { DECK } from "@/shared/config/constants"
import { slideRegistry } from "@/app/deck/slideRegistry"
import { SlideNav } from "@/widgets/slide-nav/ui/SlideNav"
import { RtsDebugOverlay } from "@/rts/devtools/RtsDebugOverlay"

import { CosmicStage } from "@/shared/ui/stage/CosmicStage"
import { ScaleFrame } from "@/shared/ui/stage/ScaleFrame"
import { BoardFrame } from "@/shared/ui/stage/BoardFrame"

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
  const gradeParam = useQueryParam("grade")
  const grade = gradeParam === "soft" ? "soft" : "contrast"
  const total = slideRegistry.length
  const printMode = useQueryParam("print") === "1"

  const [hudOpen, setHudOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [notes, setNotes] = useState("")

  const idxFromUrl = sParam ? Number(sParam) : 0
  const index = Number.isFinite(idxFromUrl) ? clamp(idxFromUrl, 0, total - 1) : 0

  // zoom safety (default 0.92 para que no se vea gigante)
  const zoomParam = useQueryParam("zoom")
  const zoomRaw = zoomParam ? Number(zoomParam) : 0.92
  const zoom = Number.isFinite(zoomRaw) ? clamp(zoomRaw, 0.75, 1) : 0.92

  const entry = slideRegistry[index]
  const Slide = entry.Component
  const notesKey = useMemo(() => `deck:notes:${entry.meta.id}`, [entry.meta.id])

  const hudVisible = hudOpen && !presentation && !printMode
  const notesVisible = notesOpen && !presentation && !printMode

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
  function first() {
    go(0)
  }
  function last() {
    go(total - 1)
  }

  function toggleParam(name: string) {
    const qs = new URLSearchParams(loc.search)
    if (qs.get(name) === "1") qs.delete(name)
    else qs.set(name, "1")
    navigate({ pathname: loc.pathname, search: qs.toString() }, { replace: true })
  }

  // Events from CMDK
  useEffect(() => {
    const onPrev = () => prev()
    const onNext = () => next()
    const onFirst = () => first()
    const onLast = () => last()

    window.addEventListener("hitech:deck:prev", onPrev)
    window.addEventListener("hitech:deck:next", onNext)
    window.addEventListener("hitech:deck:first", onFirst)
    window.addEventListener("hitech:deck:last", onLast)

    return () => {
      window.removeEventListener("hitech:deck:prev", onPrev)
      window.removeEventListener("hitech:deck:next", onNext)
      window.removeEventListener("hitech:deck:first", onFirst)
      window.removeEventListener("hitech:deck:last", onLast)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, loc.search, loc.pathname])

  // Keyboard shortcuts
  useEffect(() => {
    function isTyping(el: EventTarget | null) {
      const t = el as HTMLElement | null
      if (!t) return false
      const tag = t.tagName?.toLowerCase()
      return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable
    }

    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      const key = e.key.toLowerCase()

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault()
        next()
        return
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault()
        prev()
        return
      }
      if (e.key === "Home") {
        e.preventDefault()
        first()
        return
      }
      if (e.key === "End") {
        e.preventDefault()
        last()
        return
      }
      if (e.key === " " || e.code === "Space") {
        e.preventDefault()
        next()
        return
      }
      if (key === "h") {
        e.preventDefault()
        setHudOpen((v) => !v)
        return
      }
      if (key === "n") {
        e.preventDefault()
        setNotesOpen((v) => !v)
        return
      }
      if (key === "p") {
        e.preventDefault()
        setPresentation((v) => !v)
        return
      }
      if (key === "v") {
        e.preventDefault()
        toggleParam("vs")
        return
      }
      if (key === "t") {
        e.preventDefault()
        toggleParam("print")
        return
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, loc.search, loc.pathname])

  useEffect(() => {
    const body = document.body
    body.classList.toggle("deck-present", presentation)
    body.classList.toggle("deck-print", printMode)
    return () => {
      body.classList.remove("deck-present", "deck-print")
    }
  }, [presentation, printMode])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(notesKey)
    setNotes(stored ?? "")
  }, [notesKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(notesKey, notes)
  }, [notesKey, notes])

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* 1) UNIVERSO (NO escala, NO se recorta) */}
      <CosmicStage grade={grade}>
        {/* 2) SCALER (solo escala el board 1600x900) */}
        <ScaleFrame
          width={DECK.width}
          height={DECK.height}
          mode="fit"
          safety={zoom}
        >
          {/* 3) BOARD FRAME (shadow + glass plane + reflection) */}
          <BoardFrame>
            <Slide index={index} total={total} />
          </BoardFrame>
        </ScaleFrame>
      </CosmicStage>

      {/* HUD (encima del universo) */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div
          className={[
            "mx-auto w-full max-w-[1920px]",
            presentation || printMode ? "px-0 py-0" : "px-4 py-4",
          ].join(" ")}
        >
          {hudVisible ? (
            <div className="pointer-events-auto flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <div className="text-sm opacity-80">Deck</div>
                <div className="text-lg font-semibold">
                  {entry.meta.title}
                  <span className="ml-2 text-sm opacity-70">
                    ({index + 1}/{total})
                  </span>
                </div>
              </div>

              <SlideNav index={index} total={total} onPrev={prev} onNext={next} />
            </div>
          ) : null}

          {hudVisible ? (
            <div className="pointer-events-auto mt-3 flex items-center justify-between text-xs opacity-75">
              <div>Shortcuts: Left/Right, PageUp/PageDown, Space, Home/End, H, N, P, V, T, Ctrl+K</div>
              <div>
                Deep link: <span className="font-mono">?s={index}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* NOTES (encima) */}
      {notesVisible ? (
        <aside className="fixed right-6 top-24 z-50 w-[320px]">
          <div className="rounded-2xl border border-white/10 bg-black/70 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] opacity-70">Notes</div>
              <button
                type="button"
                className="text-xs opacity-70 hover:opacity-100"
                onClick={() => setNotesOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-2 text-sm opacity-80">{entry.meta.title}</div>
            <textarea
              className="mt-3 h-40 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/90 outline-none"
              placeholder="Notes for this slide..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-2 text-[11px] opacity-60">Stored locally per slide.</div>
          </div>
        </aside>
      ) : null}

      <RtsDebugOverlay />
    </div>
  )
}
