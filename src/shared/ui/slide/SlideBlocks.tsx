import type { ReactNode } from "react"

export function DataBox(props: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={["rounded-2xl border border-white/10 bg-white/5 p-5", props.className ?? ""].join(" ")}>
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-3 text-sm opacity-90">{props.children}</div>
    </section>
  )
}

export function TextList(props: { items: Array<string>; className?: string }) {
  return (
    <ul className={["list-disc space-y-2 pl-6 text-sm opacity-90", props.className ?? ""].join(" ")}>
      {props.items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}

export function Pill(props: { children: ReactNode; className?: string }) {
  return (
    <span className={["inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs", props.className ?? ""].join(" ")}>
      {props.children}
    </span>
  )
}
