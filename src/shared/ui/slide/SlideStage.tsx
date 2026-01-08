import { Suspense, useEffect, useMemo } from "react"
import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export function SlideStage(props: { width: number; height: number; children: ReactNode }) {
  const ratio = props.width / props.height

  const onKey = useMemo(() => {
    return (ev: KeyboardEvent) => {
      const nextBtn = document.querySelector<HTMLButtonElement>("[data-deck-next]")
      const prevBtn = document.querySelector<HTMLButtonElement>("[data-deck-prev]")
      if (!nextBtn || !prevBtn) return

      switch (ev.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          ev.preventDefault()
          nextBtn.click()
          break
        case "ArrowLeft":
        case "PageUp":
          ev.preventDefault()
          prevBtn.click()
          break
        default:
          break
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", onKey, { passive: false })
    return () => window.removeEventListener("keydown", onKey as any)
  }, [onKey])

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl",
        "bg-[radial-gradient(1200px_600px_at_15%_0%,rgba(2,167,202,0.22),transparent_55%),radial-gradient(900px_500px_at_100%_30%,rgba(171,123,38,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]",
      )}
      style={{ aspectRatio: `${ratio}` }}
    >
      <ScaleToFit width={props.width} height={props.height}>
        <Suspense fallback={<div className="grid h-full w-full place-items-center opacity-80">Cargando slide…</div>}>
          {props.children}
        </Suspense>
      </ScaleToFit>
    </div>
  )
}

function ScaleToFit(props: { width: number; height: number; children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="origin-top-left" style={{ width: props.width, height: props.height, transform: "scale(var(--_s))" }}>
        <AutoScale baseW={props.width} baseH={props.height} />
        {props.children}
      </div>
    </div>
  )
}

function AutoScale(props: { baseW: number; baseH: number }) {
  useEffect(() => {
    function apply() {
      const host = document.querySelector<HTMLElement>("[data-slide-host]") ?? document.documentElement
      const w = host.clientWidth || window.innerWidth
      const h = host.clientHeight || window.innerHeight
      const s = Math.min(w / props.baseW, h / props.baseH)
      document.documentElement.style.setProperty("--_s", String(s))
    }

    apply()
    window.addEventListener("resize", apply)
    return () => window.removeEventListener("resize", apply)
  }, [props.baseW, props.baseH])

  return <div data-slide-host className="absolute inset-0" />
}
