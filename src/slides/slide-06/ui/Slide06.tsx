import { motion } from "framer-motion"
import { SlideShell } from "@/shared/ui/slide/SlideShell"
import { cn } from "@/shared/lib/cn"

export default function Slide02() {
  return (
    <SlideShell
      title="Portfolio Overview"
      kicker="AI · Risk · Performance"
      className="hi-screen"
      footerLeft={<span className="tracking-wide">HITECH</span>}
      footerRight={<span className="font-mono">1600×900</span>}
    >
      <div className="relative grid h-full grid-cols-12 grid-rows-6 gap-6">
        {/* PANEL DOMINANTE */}
        <GlassPanel
          critical
          className="col-span-5 row-span-3"
          title="KPI Tracker"
        >
          <DonutMock />
        </GlassPanel>

        {/* PANEL DERECHO ARRIBA */}
        <GlassPanel className="col-span-4 row-span-2" title="AI Better">
          <BarsMock />
        </GlassPanel>

        {/* PANEL DERECHO MEDIO */}
        <GlassPanel className="col-span-3 row-span-2" title="AI Insights">
          <LineMock />
        </GlassPanel>

        {/* PANEL INFERIOR */}
        <GlassPanel className="col-span-7 row-span-3" title="Portfolio Performance">
          <ChartMock />
        </GlassPanel>

        {/* PANEL ACTIVIDAD */}
        <GlassPanel className="col-span-5 row-span-3" title="Recent Activity">
          <ListMock />
        </GlassPanel>

        {/* REFLEJO ESPEJO */}
        <MirrorReflection />
      </div>
    </SlideShell>
  )
}

/* ────────────────────────────────────────────── */
/* COMPONENTES BASE */
/* ────────────────────────────────────────────── */

function GlassPanel(props: {
  title: string
  critical?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[18px]",
        "hi-panel hi-glassfx hi-rim hi-grain",
        props.critical && "hi-panel-critical",
        props.className
      )}
    >
      {/* HIGHLIGHT SUPERIOR */}
      <div className="hi-specular pointer-events-none" />

      {/* CONTENIDO */}
      <div className="relative z-10 h-full p-6">
        <div className="mb-4 text-sm font-medium tracking-wide opacity-80">
          {props.title}
        </div>
        {props.children}
      </div>

      {/* GLOW EXTERNO */}
      <div className="hi-glow pointer-events-none" />
    </motion.div>
  )
}

/* ────────────────────────────────────────────── */
/* MOCKS VISUALES (luego los conectas a data real) */
/* ────────────────────────────────────────────── */

function DonutMock() {
  return (
    <div className="relative mx-auto h-40 w-40 rounded-full bg-gradient-to-br from-white/20 to-white/5 shadow-inner">
      <div className="absolute inset-4 rounded-full bg-black/60 backdrop-blur-sm" />
      <div className="absolute inset-0 rounded-full hi-chart" />
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
        72%
      </div>
    </div>
  )
}

function BarsMock() {
  return (
    <div className="flex h-full items-end gap-2">
      {[60, 40, 80].map((h, i) => (
        <div
          key={i}
          className="w-4 rounded-sm bg-gradient-to-t from-cyan-400/40 to-cyan-200/80 shadow"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

function LineMock() {
  return (
    <div className="h-full w-full rounded-md bg-gradient-to-br from-white/10 to-transparent shadow-inner" />
  )
}

function ChartMock() {
  return (
    <div className="relative h-full w-full rounded-md bg-gradient-to-br from-white/10 to-black/40 shadow-inner">
      <div className="absolute inset-0 hi-chart" />
    </div>
  )
}

function ListMock() {
  return (
    <ul className="space-y-2 text-sm opacity-80">
      <li>• Mitigation plan initiated</li>
      <li>• New trade executed</li>
      <li>• KPI report generated</li>
    </ul>
  )
}

/* ────────────────────────────────────────────── */
/* REFLEJO ESPEJO (blur + fade) */
/* ────────────────────────────────────────────── */

function MirrorReflection() {
  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-10 h-40 scale-y-[-1] opacity-30 blur-xl">
      <div className="h-full w-full rounded-[18px] bg-white/10" />
    </div>
  )
}
