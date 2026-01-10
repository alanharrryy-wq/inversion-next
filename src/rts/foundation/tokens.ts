// src/foundation/tokens.ts
// HITECH RTS — Visual System Tokens (TS mirror)
// Strategic Canon ID: HITECH_RTS_EXEC_CANON_V1

export type VSCssVar =
  | "--vs-gold"
  | "--vs-cyan"
  | "--vs-blue"
  | "--vs-brown"
  | "--vs-bg-0"
  | "--vs-bg-1"
  | "--vs-bg-2"
  | "--vs-fg-0"
  | "--vs-fg-1"
  | "--vs-fg-2"
  | "--vs-fg-3"
  | "--vs-line-0"
  | "--vs-line-1"
  | "--vs-line-2"
  | "--vs-energy"
  | "--vs-r-1"
  | "--vs-r-2"
  | "--vs-r-3"
  | "--vs-s-1"
  | "--vs-s-2"
  | "--vs-s-3"
  | "--vs-s-4"
  | "--vs-s-5"
  | "--vs-s-6"
  | "--vs-s-7"
  | "--vs-s-8"
  | "--vs-fast"
  | "--vs-base"
  | "--vs-slow"
  | "--vs-ease"
  | "--vs-h1"
  | "--vs-h2"
  | "--vs-body"
  | "--vs-micro";

export const cssVar = (name: VSCssVar) => ("var(" + name + ")") as const;

export const VS = {
  brand: {
    gold: cssVar("--vs-gold"),
    cyan: cssVar("--vs-cyan"),
    blue: cssVar("--vs-blue"),
    brown: cssVar("--vs-brown"),
    energy: cssVar("--vs-energy"),
  },
  bg: {
    base: cssVar("--vs-bg-0"),
    panel: cssVar("--vs-bg-1"),
    soft: cssVar("--vs-bg-2"),
  },
  fg: {
    strong: cssVar("--vs-fg-0"),
    body: cssVar("--vs-fg-1"),
    muted: cssVar("--vs-fg-2"),
    faint: cssVar("--vs-fg-3"),
  },
  line: {
    subtle: cssVar("--vs-line-0"),
    base: cssVar("--vs-line-1"),
    strong: cssVar("--vs-line-2"),
  },
  radius: {
    sm: cssVar("--vs-r-1"),
    md: cssVar("--vs-r-2"),
    lg: cssVar("--vs-r-3"),
  },
  space: {
    xs: cssVar("--vs-s-1"),
    sm: cssVar("--vs-s-2"),
    md: cssVar("--vs-s-4"),
    lg: cssVar("--vs-s-6"),
    xl: cssVar("--vs-s-7"),
  },
  motion: {
    ease: cssVar("--vs-ease"),
    fast: cssVar("--vs-fast"),
    base: cssVar("--vs-base"),
    slow: cssVar("--vs-slow"),
  },
} as const;
