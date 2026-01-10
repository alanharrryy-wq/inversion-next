import * as React from "react"
import { createPortal } from "react-dom"
import { Command } from "cmdk"
import { ArrowLeft, ArrowRight, LayoutGrid, Search } from "lucide-react"
import { bindHotkey } from "../../lib/hotkeys"

type Action = {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  keywords?: string[]
  onRun: () => void
}

function safeDocument() {
  return typeof document !== "undefined" ? document : null
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    const unbind = bindHotkey((e) => {
      const isK = e.key.toLowerCase() === "k"
      const mod = e.ctrlKey || e.metaKey

      if (mod && isK) {
        e.preventDefault()
        React.startTransition(() => setOpen((v) => !v))
      }

      if (e.key === "Escape") {
        React.startTransition(() => setOpen(false))
      }
    })
    return () => unbind()
  }, [])

  const actions = React.useMemo<Action[]>(() => {
    const nav = (sIndex: number) => () => {
      React.startTransition(() => {
        window.location.hash = `#/deck?s=${sIndex}`
        setOpen(false)
        setQuery("")
      })
    }

    return [
      { id: "go_deck", title: "Ir al Deck", subtitle: "Vista principal", icon: <LayoutGrid size={18} />, keywords: ["deck", "home"], onRun: nav(0) },
      { id: "slide_00", title: "Abrir slide-00", subtitle: "Intro", icon: <ArrowRight size={18} />, keywords: ["slide", "00"], onRun: nav(0) },
      { id: "slide_01", title: "Abrir slide-01", subtitle: "Siguiente", icon: <ArrowRight size={18} />, keywords: ["slide", "01"], onRun: nav(1) },
      { id: "slide_02", title: "Abrir slide-02", subtitle: "Dashboard", icon: <ArrowRight size={18} />, keywords: ["slide", "02", "dashboard"], onRun: nav(2) },
      { id: "slide_03", title: "Abrir slide-03", subtitle: "Contexto", icon: <ArrowRight size={18} />, keywords: ["slide", "03", "contexto"], onRun: nav(3) },
      { id: "slide_04", title: "Abrir slide-04", subtitle: "Sistema", icon: <ArrowRight size={18} />, keywords: ["slide", "04", "sistema"], onRun: nav(4) },
      { id: "slide_05", title: "Abrir slide-05", subtitle: "KPIs", icon: <ArrowRight size={18} />, keywords: ["slide", "05", "kpi"], onRun: nav(5) },
      { id: "slide_06", title: "Abrir slide-06", subtitle: "Timeline", icon: <ArrowRight size={18} />, keywords: ["slide", "06", "timeline"], onRun: nav(6) },
      { id: "slide_07", title: "Abrir slide-07", subtitle: "Riesgos", icon: <ArrowRight size={18} />, keywords: ["slide", "07", "riesgos"], onRun: nav(7) },
      {
        id: "prev",
        title: "Anterior",
        subtitle: "Slide anterior",
        icon: <ArrowLeft size={18} />,
        keywords: ["prev", "anterior"],
        onRun: () => {
          React.startTransition(() => {
            window.dispatchEvent(new CustomEvent("hitech:deck:prev"))
            setOpen(false)
          })
        },
      },
      {
        id: "next",
        title: "Siguiente",
        subtitle: "Slide siguiente",
        icon: <ArrowRight size={18} />,
        keywords: ["next", "siguiente"],
        onRun: () => {
          React.startTransition(() => {
            window.dispatchEvent(new CustomEvent("hitech:deck:next"))
            setOpen(false)
          })
        },
      },
    ]
  }, [])

  const doc = safeDocument()
  if (!doc) return null

  if (!open) return null

  const overlay = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
      }}
      onMouseDown={() => React.startTransition(() => setOpen(false))}
    >
      <div
        style={{
          width: "min(720px, calc(100vw - 24px))",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(10,14,20,0.98)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ✅ cmdk CORRECTO: TODO dentro de <Command> */}
        <Command
          value={query}
          onValueChange={(v) => React.startTransition(() => setQuery(v))}
          style={{ padding: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
            <Search size={18} />
            <Command.Input
              placeholder="Buscar acciones… (Ctrl+K)"
              autoFocus
              style={{
                width: "100%",
                outline: "none",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontSize: 14,
              }}
            />
            <span
              style={{
                opacity: 0.6,
                fontSize: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Esc
            </span>
          </div>

          <Command.List style={{ maxHeight: 380, overflow: "auto", padding: 8 }}>
            <Command.Empty style={{ padding: 16, opacity: 0.7 }}>
              No encontré nada con eso.
            </Command.Empty>

            {actions.map((a) => (
              <Command.Item
                key={a.id}
                value={[a.title, a.subtitle, ...(a.keywords || [])].filter(Boolean).join(" ")}
                onSelect={() => a.onRun()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                  {a.subtitle ? (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{a.subtitle}</div>
                  ) : null}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  )

  return createPortal(overlay, doc.body)
}
