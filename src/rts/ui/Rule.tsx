// src/ui/Rule.tsx
import React from "react";

export function Rule(props: { className?: string; style?: React.CSSProperties }) {
  const { className = "", style } = props;
  return <div className={["vs-rule", className].join(" ").trim()} style={style} />;
}
