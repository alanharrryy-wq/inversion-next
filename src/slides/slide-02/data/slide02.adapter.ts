import type { Slide02DashboardData } from "./slide02.contract"
import { getSlide02Mock } from "./slide02.mock"

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

function isNum(v: any): v is number {
    return typeof v === "number" && Number.isFinite(v)
}

function deepMerge<T>(base: T, patch: any): T {
    if (!patch || typeof patch !== "object") return base
    const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) }

    for (const k of Object.keys(patch)) {
        const pv = patch[k]
        const bv = (base as any)[k]

        if (Array.isArray(pv)) out[k] = pv
        else if (pv && typeof pv === "object" && bv && typeof bv === "object" && !Array.isArray(bv)) out[k] = deepMerge(bv, pv)
        else out[k] = pv
    }
    return out as T
}

function normalizeRiskMix(mix: any) {
    if (!mix) return mix

    // Caso array: [{ label, pct }, ...]
    if (Array.isArray(mix)) {
        const rows = mix
            .map((x: any) => ({ ...x, pct: isNum(x?.pct) ? x.pct : 0 }))
            .slice(0, 12)

        const sum = rows.reduce((a: number, r: any) => a + r.pct, 0)
        if (sum <= 0) return rows

        const scaled = rows.map(r => ({ ...r, pct: (r.pct / sum) * 100 }))
        const rounded = scaled.map(r => ({ ...r, pct: Math.floor(r.pct) }))
        let diff = 100 - rounded.reduce((a, r) => a + r.pct, 0)

        let i = 0
        while (diff > 0 && rounded.length) {
            rounded[i % rounded.length].pct += 1
            diff -= 1
            i += 1
        }
        return rounded
    }

    // Caso objeto: { low: 60, medium: 25, high: 15 }
    if (typeof mix === "object") {
        const keys = Object.keys(mix)
        const vals = keys.map(k => (isNum(mix[k]) ? mix[k] : 0))
        const sum = vals.reduce((a, b) => a + b, 0)
        if (sum <= 0) return mix

        const scaled = vals.map(v => (v / sum) * 100)
        const flo = scaled.map(v => Math.floor(v))
        let diff = 100 - flo.reduce((a, b) => a + b, 0)

        let idx = 0
        while (diff > 0 && flo.length) {
            flo[idx % flo.length] += 1
            diff -= 1
            idx += 1
        }

        const out: any = {}
        keys.forEach((k, i2) => (out[k] = flo[i2]))
        return out
    }

    return mix
}

export function fromApi(dto: Partial<Slide02DashboardData> | null | undefined): Slide02DashboardData {
    // fallback determinista, útil para QA/CI y campos faltantes
    const base = getSlide02Mock("slide02-api-fallback")
    const merged = deepMerge(base, dto ?? {})

    const out: any = { ...(merged as any) }

    // Normaliza riskMix para que SIEMPRE sea coherente (suma 100)
    if ("riskMix" in out) out.riskMix = normalizeRiskMix(out.riskMix)

    // Clamps suaves si existen campos típicos (no truena si no existen)
    if (out?.kpi?.composite01 != null && isNum(out.kpi.composite01)) out.kpi.composite01 = clamp(out.kpi.composite01, 0, 1)
    if (out?.aiInsights?.confidence01 != null && isNum(out.aiInsights.confidence01)) out.aiInsights.confidence01 = clamp(out.aiInsights.confidence01, 0, 1)
    if (out?.aiBetter?.signal01 != null && isNum(out.aiBetter.signal01)) out.aiBetter.signal01 = clamp(out.aiBetter.signal01, 0, 1)

    return out as Slide02DashboardData
}
