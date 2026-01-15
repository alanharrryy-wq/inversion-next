// src/rts/utils/hashQuery.ts
export function getHashSearchParams(): URLSearchParams {
  const h = typeof window !== "undefined" ? window.location.hash : ""
  const qIndex = h.indexOf("?")
  if (qIndex === -1) return new URLSearchParams("")
  return new URLSearchParams(h.slice(qIndex + 1))
}
