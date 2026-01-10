// src/ui/Panel.tsx
import React from "react";

export function Panel(
  props: React.PropsWithChildren<{
    variant?: "solid" | "soft";
    className?: string;
    style?: React.CSSProperties;
  }>
) {
  const { variant = "solid", className = "", style, children } = props;
  const base = variant === "soft" ? "vs-panel--soft" : "vs-panel";
  return (
    <div className={[base, "vs-motion", className].join(" ").trim()} style={style}>
      {children}
    </div>
  );
}
