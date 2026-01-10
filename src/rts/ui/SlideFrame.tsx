// src/ui/SlideFrame.tsx
import React from "react";

export function SlideFrame(props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  const { className = "", style, children } = props;
  return (
    <div className={["rts-root vs-canvas vs-pad-outer w-full h-full", className].join(" ").trim()} style={style}>
      {children}
    </div>
  );
}

export function SlideGrid(props: React.PropsWithChildren<{ className?: string; style?: React.CSSProperties }>) {
  const { className = "", style, children } = props;
  return (
    <div className={["vs-grid w-full", className].join(" ").trim()} style={style}>
      {children}
    </div>
  );
}
