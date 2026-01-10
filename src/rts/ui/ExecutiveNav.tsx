// src/ui/ExecutiveNav.tsx
import React from "react";
import { Text } from "./Text";

export function ExecutiveNav(props: {
  prev?: () => void;
  next?: () => void;
  labelPrev?: string;
  labelNext?: string;
}) {
  const { prev, next, labelPrev = "PREV", labelNext = "NEXT" } = props;

  const btnBase =
    "vs-motion px-5 py-3 rounded-xl border bg-black/35 text-white/70 hover:text-white hover:bg-black/45";
  const btnBorder = { borderColor: "var(--vs-line-1)" } as React.CSSProperties;

  return (
    <div className="absolute bottom-8 left-0 right-0 z-30 px-12">
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          className={[btnBase, prev ? "" : "opacity-40 pointer-events-none"].join(" ").trim()}
          style={btnBorder}
        >
          <Text as="span" variant="micro" className="font-code" style={{ letterSpacing: "0.28em" }}>
            ← {labelPrev}
          </Text>
        </button>

        <button
          onClick={next}
          className={[btnBase, next ? "" : "opacity-40 pointer-events-none"].join(" ").trim()}
          style={btnBorder}
        >
          <Text as="span" variant="micro" className="font-code" style={{ letterSpacing: "0.28em" }}>
            {labelNext} →
          </Text>
        </button>
      </div>
    </div>
  );
}
