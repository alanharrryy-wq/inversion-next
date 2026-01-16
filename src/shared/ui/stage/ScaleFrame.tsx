import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

export function ScaleFrame(props: {
    width: number
    height: number
    children: ReactNode
    mode?: "fit" | "fill"
    safety?: number // 0.82 – 0.9 recomendado
}) {
    const {
        width,
        height,
        children,
        mode = "fit",
        safety = 0.90, // ⭐ AQUÍ está la magia
    } = props

    const hostRef = useRef<HTMLDivElement | null>(null)
    const [size, setSize] = useState({ w: 0, h: 0 })

    useEffect(() => {
        const el = hostRef.current
        if (!el) return

        const measure = () => {
            const r = el.getBoundingClientRect()
            setSize({ w: r.width, h: r.height })
        }

        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const scale = useMemo(() => {
        if (!size.w || !size.h) return 1

        const sx = size.w / width
        const sy = size.h / height
        const base =
            mode === "fill" ? Math.max(sx, sy) : Math.min(sx, sy)

        // 👇 safety es el UNDERSCAN real
        return clamp(base * safety, 0.4, 2)
    }, [size, width, height, mode, safety])

    return (
        <div
            ref={hostRef}
            className="absolute inset-0 flex items-center justify-center"
        >
            <div
                style={{
                    width,
                    height,
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                }}
            >
                {children}
            </div>
        </div>
    )
}



