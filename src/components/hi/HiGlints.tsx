export default function HiGlints(props: { density?: "low" | "med" }) {
  const d = props.density ?? "med"

  const stars =
    d === "low"
      ? [
          { top: "8%", left: "6%", s: 18, a: 0.35, t: 2.8 },
          { top: "12%", right: "7%", s: 14, a: 0.30, t: 3.6 },
          { bottom: "10%", left: "18%", s: 10, a: 0.22, t: 4.2 },
        ]
      : [
          { top: "7%", left: "6%", s: 20, a: 0.38, t: 2.8 },
          { top: "10%", right: "7%", s: 16, a: 0.34, t: 3.4 },
          { top: "26%", right: "10%", s: 10, a: 0.22, t: 4.1 },
          { bottom: "12%", left: "14%", s: 12, a: 0.25, t: 4.6 },
          { bottom: "18%", right: "16%", s: 9, a: 0.20, t: 5.0 },
        ]

  return (
    <div aria-hidden className="hi-glints">
      {stars.map((p, i) => (
        <span
          key={i}
          className="hi-glint"
          style={{
            top: p.top,
            left: (p as any).left,
            right: (p as any).right,
            bottom: (p as any).bottom,
            width: p.s,
            height: p.s,
            opacity: p.a,
            animationDuration: p.t + "s",
          }}
        />
      ))}
    </div>
  )
}
