import { useMemo } from "react"
import { useLocation } from "react-router-dom"

function cleanSeed(v: string | null | undefined) {
    const s = (v ?? "").trim()
    if (!s) return null
    // evita seeds gigantes o caracteres raros
    const safe = s.slice(0, 64).replace(/[^\w\-.:]/g, "")
    return safe || null
}

export function useSlide02Seed(fallback = "slide02-v4") {
    const loc = useLocation()

    return useMemo(() => {
        const qs = new URLSearchParams(loc.search)
        return cleanSeed(qs.get("seed")) ?? fallback
    }, [loc.search, fallback])
}
