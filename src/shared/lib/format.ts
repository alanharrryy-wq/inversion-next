export function pct(n: number, digits = 0) {
  const v = Number.isFinite(n) ? n : 0
  return `${(v * 100).toFixed(digits)}%`
}
