export const APP = {
  name: "inversion-next",
  title: "Hitech Inversion Next",
  version: "0.1.0",
  timezoneHint: "America/Mexico_City",
} as const;

export const BRAND = {
  colors: {
    gold: "#AB7B26",
    teal900: "#026F86",
    teal600: "#02A7CA",
    brown: "#553E13",
  },
} as const;

export const DECK = {
  width: 1600,
  height: 900,
  route: "/deck",
  totalSlides: 12,
  keyboard: {
    next: ["ArrowRight", "PageDown", " "],
    prev: ["ArrowLeft", "PageUp"],
    first: ["Home"],
    last: ["End"],
  },
} as const;

export const UI = {
  headerHeight: 92,
  footerHeight: 64,
  safePadding: 56,
  maxContentWidth: 1480,
} as const;

export const TEXT = {
  coverTagline: "Interactive deck engine",
  footerRight: "Hitech",
} as const;