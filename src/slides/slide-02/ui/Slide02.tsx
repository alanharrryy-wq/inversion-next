import { motion } from "framer-motion"
import { SlideShell } from "@/shared/ui/slide/SlideShell"
import { cn } from "@/shared/lib/cn"
import { useHiGrain } from "@/shared/hooks/useHiGrain"
import type { Slide02DashboardData } from "@/slides/slide-02/data/slide02.contract"
import { getSlide02Mock } from "@/slides/slide-02/data/slide02.mock"

export default function Slide02() {
  const data = getSlide02Mock("slide02-v4")
  // grain procedural (sin assets)
  useHiGrain({ size: 256, alpha: 0.18, seed: "slide02-v4" })

  return (
    <SlideShell
      title="Portfolio Overview"
      kicker="AI · Risk · Performance"
      // OJO: aquí dejamos hi-screen, pero idealmente SlideShell por dentro debería tener hi-stage
      className="hi-screen"
      footerLeft={<span className="tracking-wide">HITECH</span>}
      footerRight={<span className="font-mono">1600x900</span>}
    >
      <div className="relative grid h-full grid-cols-12 grid-rows-6 gap-6">
        <div className="hi-base-glass" aria-hidden="true" />

        <GlassPanel material="glassCold" className="col-span-5 row-span-2" title="Risk Summary">
          <RiskMock data={data.riskSummary} />
        </GlassPanel>

        <GlassPanel
          critical
          material="glassCritical"
          glint="silver"
          className="col-span-4 row-span-2"
          title="KPI Tracker"
        >
          <KpiDonut data={data.kpiTracker} />
        </GlassPanel>

        <GlassPanel material="glassCold" className="col-span-3 row-span-2" title="AI Better">
          <BarsAndSignal data={data.aiBetter} />
        </GlassPanel>

        <GlassPanel material="glassCold" className="col-span-5 row-span-4" title="Recent Activity">
          <ActivityMock data={data.recentActivity} />
        </GlassPanel>

        <GlassPanel material="glassCold" className="col-span-4 row-span-4" title="Portfolio Performance">
          {/* Mejor: highlight directo sobre el hi-chart para que se vea sí o sí */}
          <div data-chart-highlight="on" className="h-full">
            <PerfChart />
          </div>
        </GlassPanel>

        <GlassPanel material="glassCold" className="col-span-3 row-span-4" title="AI Insights">
          <InsightsMock data={data.aiInsights} />
        </GlassPanel>

        <div className="hi-mirror-wrap">
          <div className="hi-mirror" />
        </div>
      </div>
    </SlideShell>
  )
}

function GlassPanel(props: {
  title: string
  critical?: boolean
  material?: "glassCold" | "glassCritical"
  glint?: "silver" | "gold" | "emerald" | "cyan" | "red"
  className?: string
  children: React.ReactNode
}) {
  const isCritical = props.critical === true
  const material = isCritical ? "glassCritical" : "glassCold"
  const glint = isCritical ? props.glint ?? "silver" : undefined

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-material={material}
      data-glint={glint}
      className={cn(
        "hi-panel relative overflow-hidden",
        props.critical && "hi-panel-critical",
        props.className,
      )}
    >
      <div className="hi-inset" />
      <div className="hi-specular" />
      <div className="hi-rim" />
      <div className="hi-glassfx" />
      <div className="hi-grain" />
      <div className="hi-glints" />
      <div className="hi-glow" />

      <div className="relative z-10 h-full p-6">
        <div className="mb-4 text-sm font-medium tracking-wide opacity-80">{props.title}</div>
        {props.children}
      </div>
    </motion.div>
  )
}

function RiskMock({ data }: { data: Slide02DashboardData["riskSummary"] }) {
  const low = data.riskMix.find((entry) => entry.level === "Low")?.percent ?? 0
  const medium = data.riskMix.find((entry) => entry.level === "Medium")?.percent ?? 0
  const high = data.riskMix.find((entry) => entry.level === "High")?.percent ?? 0
  const deltaLabel = `${data.deltaThisMonth >= 0 ? "+" : ""}${data.deltaThisMonth} this month`

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <div className="rounded-[14px] bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="hi-dim text-xs">Active Risks</div>
        <div className="mt-2 text-4xl font-semibold">{data.activeRisks}</div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs opacity-80">
          <span className="h-2 w-2 rounded-full bg-white/40" />
          {data.severity}
          <span className="hi-dim">{deltaLabel}</span>
        </div>
      </div>

      <div className="rounded-[14px] bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="hi-dim text-xs">Risk Mix</div>
        <div className="mt-3 space-y-3 text-xs">
          <BarRow label="Low" value={low} />
          <BarRow label="Medium" value={medium} />
          <BarRow label="High" value={high} />
        </div>
      </div>
    </div>
  )
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between opacity-80">
        <span>{label}</span>
        <span className="hi-dim">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-black/35">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg, rgba(181,181,181,0.12), rgba(181,181,181,0.55))",
          }}
        />
      </div>
    </div>
  )
}

function KpiDonut({ data }: { data: Slide02DashboardData["kpiTracker"] }) {
  const ring = 2 * Math.PI * 44
  const compositeLabel = `${(data.composite * 100).toFixed(1)}%`
  const dashOffset = ring * (1 - data.donutProgress)

  return (
    <div className="grid h-full grid-cols-[1fr_170px] gap-4">
      <div className="flex items-center justify-center">
        <div className="relative h-44 w-44">
          <div className="absolute inset-0 rounded-full bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),_0_18px_60px_rgba(0,0,0,0.55)]" />
          <svg className="absolute inset-0" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgba(255,255,255,0.70)" />
                <stop offset="0.35" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="1" stopColor="rgba(181,181,181,0.55)" />
              </linearGradient>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="1.8" result="b" />
                <feColorMatrix
                  in="b"
                  type="matrix"
                  values="
                    1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 0.55 0"
                  result="g"
                />
                <feMerge>
                  <feMergeNode in="g" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="url(#g1)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${ring}`}
              strokeDashoffset={`${dashOffset}`}
              transform="rotate(-90 60 60)"
              filter="url(#softGlow)"
            />
          </svg>

          <div className="absolute inset-[18px] rounded-full bg-black/45 backdrop-blur-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-semibold">{compositeLabel}</div>
              <div className="hi-dim mt-1 text-xs">KPI composite</div>
            </div>
          </div>

          <div className="absolute inset-0 rounded-full opacity-70 [background:radial-gradient(closest-side_at_50%_0%,rgba(255,255,255,0.18),transparent_58%)]" />
        </div>
      </div>

      <div className="space-y-2">
        <Pill label={data.forecast.label} value={formatValue(data.forecast)} />
        <Pill label={data.target.label} value={formatValue(data.target)} />
        <Pill label={data.actual.label} value={formatValue(data.actual)} />
        <div className="mt-3 rounded-[14px] bg-white/5 p-3 text-xs opacity-80">
          Confidence: <span className="text-white/80">{data.confidence}</span> · Drift:{" "}
          <span className="text-white/80">{data.drift}</span>
        </div>
      </div>
    </div>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-white/5 px-3 py-2 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <span className="hi-dim">{label}</span>
      <span className="font-mono text-white/80">{value}</span>
    </div>
  )
}

function BarsAndSignal({ data }: { data: Slide02DashboardData["aiBetter"] }) {
  return (
    <div className="grid h-full grid-rows-[auto_auto_1fr] gap-3">
      <div className="space-y-2 text-xs opacity-80">
        {data.kpiBars.map((bar) => (
          <MiniBar key={bar.label} label={bar.label} value={bar.percent} right={formatValue(bar)} />
        ))}
      </div>

      <div className="hi-dim text-xs">Signal</div>

      <div className="hi-chart h-full w-full">
        <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path
            d="M0,32 C10,30 20,28 30,29 C40,30 50,22 60,20 C70,18 80,19 90,16 C95,15 98,14 100,13 L100,40 L0,40 Z"
            fill="rgba(181,181,181,0.14)"
          />
          <path
            d="M0,32 C10,30 20,28 30,29 C40,30 50,22 60,20 C70,18 80,19 90,16 C95,15 98,14 100,13"
            fill="none"
            stroke="rgba(181,181,181,0.55)"
            strokeWidth="1.4"
          />
        </svg>
      </div>
    </div>
  )
}

function MiniBar({ label, value, right }: { label: string; value: number; right: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="hi-dim font-mono">{right}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-black/35">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg, rgba(181,181,181,0.10), rgba(181,181,181,0.55))",
          }}
        />
      </div>
    </div>
  )
}

function ActivityMock({ data }: { data: Slide02DashboardData["recentActivity"] }) {
  return (
    <div className="space-y-3">
      {data.items.map((item) => (
        <ActivityRow key={item.timestamp} title={item.title} meta={`${item.timeAgo} · ${item.detail}`} />
      ))}
    </div>
  )
}

function ActivityRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-[14px] bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="text-sm opacity-85">{title}</div>
      <div className="hi-dim mt-1 text-xs">{meta}</div>
    </div>
  )
}

function PerfChart() {
  return (
    <div className="hi-chart h-full w-full">
      <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path
          d="M0,50 C10,48 20,47 30,44 C40,40 50,38 60,34 C70,30 80,28 90,24 C95,22 98,21 100,20 L100,60 L0,60 Z"
          fill="rgba(181,181,181,0.10)"
        />
        <path
          d="M0,50 C10,48 20,47 30,44 C40,40 50,38 60,34 C70,30 80,28 90,24 C95,22 98,21 100,20"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}

function InsightsMock({ data }: { data: Slide02DashboardData["aiInsights"] }) {
  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3">
      <div className="rounded-[14px] bg-white/5 p-4 text-xs opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {data.summaryPrefix} <span className="text-white/85">{data.highlightPercent}%</span> {data.summarySuffix}
        <div className="hi-dim mt-2">
          Confidence: {data.confidence.toFixed(2)} · Source: {data.source}
        </div>
      </div>
      <div className="hi-chart" />
    </div>
  )
}

type DisplayValue =
  | Slide02DashboardData["kpiTracker"]["forecast"]
  | Slide02DashboardData["aiBetter"]["kpiBars"][number]

function formatValue(metric: DisplayValue) {
  if ("rightValue" in metric) {
    if (metric.rightDisplay) return metric.rightDisplay
    if (metric.rightUnit) return `${metric.rightValue}${metric.rightUnit}`
    return `${metric.rightValue}`
  }
  if (metric.display) return metric.display
  if (metric.unit) return `${metric.value}${metric.unit}`
  return `${metric.value}`
}
