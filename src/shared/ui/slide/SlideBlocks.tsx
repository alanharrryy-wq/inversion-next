import React from "react";

export function DataBox(props: { title: string; children: React.ReactNode; tone?: "default" | "accent" | "gold" }) {
  const tone = props.tone ?? "default";
  const border =
    tone === "accent" ? "rgba(2,167,202,.45)" :
    tone === "gold" ? "rgba(171,123,38,.55)" :
    "var(--border)";

  return (
    <div
      className="h-panel"
      style={{
        padding: "18px 18px",
        borderColor: border,
        minHeight: 120,
      }}
    >
      <div style={{ fontSize: 14, color: "var(--muted)", letterSpacing: .3, marginBottom: 8 }}>
        {props.title}
      </div>
      <div style={{ fontSize: 18, color: "var(--text)", lineHeight: 1.35 }}>
        {props.children}
      </div>
    </div>
  );
}

export function TextList(props: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 20, color: "var(--text)", fontSize: 18, lineHeight: 1.55 }}>
      {props.items.map((t, i) => (
        <li key={i} style={{ marginBottom: 6, color: "var(--muted)" }}>
          <span style={{ color: "var(--text)" }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pill(props: { label: string; tone?: "accent" | "gold" | "muted" }) {
  const tone = props.tone ?? "muted";
  const bg =
    tone === "accent" ? "rgba(2,167,202,.20)" :
    tone === "gold" ? "rgba(171,123,38,.22)" :
    "rgba(255,255,255,.10)";

  const border =
    tone === "accent" ? "rgba(2,167,202,.35)" :
    tone === "gold" ? "rgba(171,123,38,.40)" :
    "rgba(255,255,255,.14)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        color: "var(--text)",
        fontSize: 13,
        letterSpacing: .25,
      }}
    >
      {props.label}
    </span>
  );
}
