// src/ui/Stack.tsx
import React from "react";

export function Stack(props: React.PropsWithChildren<{ gap?: number; className?: string }>) {
  const { gap = 16, className = "", children } = props;
  return (
    <div className={["flex flex-col", className].join(" ").trim()} style={{ gap }}>
      {children}
    </div>
  );
}
