import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { cn } from "@/shared/lib/cn"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function SlideStage(props: {
  width: number
  height: number
  children: ReactNode
  rig?: "night-studio"
  grade?: "contrast" | "soft"
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [hostSize, setHostSize] = useState({ w: 0, h: 0 })
  const { children, width, height } = props

  useEffect(() => {
    function measure() {
      const el = hostRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setHostSize({ w: Math.round(r.width), h: Math.round(r.height) })
    }

    measure()

    const el = hostRef.current
    if (!el) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)

    return () => {
      ro.disconnect()
    }
  }, [])

  const scale = useMemo(() => {
    const { w, h } = hostSize
    if (!w || !h) return 1
    const sx = w / width
    const sy = h / height
    return clamp(Math.min(sx, sy), 0.05, 3)
  }, [hostSize, width, height])

  // Renderizamos en tamaño original y escalamos visualmente
  return (
    <div
      ref={hostRef}
      className={cn("hi-stage relative w-full overflow-hidden rounded-xl")}
      data-hi-rig={props.rig ?? "night-studio"}
      data-hi-grade={props.grade ?? "contrast"}
      style={{
        minHeight: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  )
}
