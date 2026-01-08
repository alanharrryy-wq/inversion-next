export const ENV = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? "",
  geminiKey: (import.meta.env.VITE_GEMINI_KEY as string | undefined) ?? "",
} as const
