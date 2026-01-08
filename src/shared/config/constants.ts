export const APP = {
  name: (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Inversion Next",
  org: "Hitech",
  year: 2026,
} as const

export const BRAND = {
  gold: "#AB7B26",
  tealDark: "#026F86",
  teal: "#02A7CA",
  brown: "#553E13",
} as const

export const DECK = {
  appName: APP.name,
  slideWidth: 1600,
  slideHeight: 900,
  safePadding: 56,
} as const
