// src/ui/Text.tsx
import React from "react";

type Variant = "kicker" | "title" | "h2" | "body" | "micro";

type Props = React.PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements;
  variant?: Variant;
  className?: string;
  style?: React.CSSProperties;
}>;

const variantClass: Record<Variant, string> = {
  kicker: "vs-kicker font-code",
  title: "vs-title font-display",
  h2: "vs-h2 font-main",
  body: "vs-body font-main",
  micro: "vs-micro font-code",
};

export function Text({ as = "div", variant = "body", className = "", style, children }: Props) {
  const Comp: any = as;
  return (
    <Comp className={[variantClass[variant], className].join(" ").trim()} style={style}>
      {children}
    </Comp>
  );
}
