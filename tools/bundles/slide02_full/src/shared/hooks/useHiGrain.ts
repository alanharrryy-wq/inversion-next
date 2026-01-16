import { useEffect } from "react"
import { createNoise2D } from "simplex-noise"

/**
 * Grain realista sin assets:
 * - Genera noise fino en canvas
 * - Inyecta a :root como --hi-grain-url (data-uri)
 *
 * Acepta seed number o string (string se hashea).
 */
export function useHiGrain(opts?: {
    size?: number
    alpha?: number
    seed?: number | string
}) {
    useEffect(() => {
        const size = opts?.size ?? 256
        const alpha = opts?.alpha ?? 0.18
        const seedIn = opts?.seed ?? 1337

        // Hash determinista para strings (FNV-1a-ish)
        const seed =
            typeof seedIn === "number"
                ? seedIn >>> 0
                : hashToUint32(seedIn)

        try {
            const canvas = document.createElement("canvas")
            canvas.width = size
            canvas.height = size

            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (!ctx) return

            const img = ctx.createImageData(size, size)

            // createNoise2D acepta función random; hacemos pseudo-random determinista
            let s = seed >>> 0
            const rand = () => {
                // xorshift32
                s ^= s << 13
                s ^= s >>> 17
                s ^= s << 5
                return ((s >>> 0) % 1000000) / 1000000
            }

            const noise2D = createNoise2D(rand)

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const i = (y * size + x) * 4

                    const nx = x / size
                    const ny = y / size

                    const n1 = noise2D(nx * 6, ny * 6)        // -1..1
                    const n2 = noise2D(nx * 22, ny * 22) * 0.35
                    const n = (n1 + n2) * 0.5

                    const v = Math.max(0, Math.min(255, Math.floor((n * 0.5 + 0.5) * 255)))

                    // “salt & pepper” MUY sutil
                    const pepper = (x * 13 + y * 7) % 97 === 0 ? 255 : 0
                    const val = Math.min(255, v + pepper * 0.12)

                    img.data[i + 0] = val
                    img.data[i + 1] = val
                    img.data[i + 2] = val
                    img.data[i + 3] = Math.floor(255 * alpha)
                }
            }

            ctx.putImageData(img, 0, 0)

            const url = canvas.toDataURL("image/png")
            document.documentElement.style.setProperty("--hi-grain-url", `url("${url}")`)
        } catch (e) {
            console.warn("[useHiGrain] failed to generate grain:", e)
        }
    }, [opts?.size, opts?.alpha, opts?.seed])
}

function hashToUint32(str: string) {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}
