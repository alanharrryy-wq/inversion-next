import { SlideShell } from "@/shared/ui/slide/SlideShell"
import { cn } from "@/shared/lib/cn"
import type { Slide02DashboardData } from "@/slides/slide-02/data/slide02.contract"
import { getSlide02Mock } from "@/slides/slide-02/data/slide02.mock"
import { useSlide02Seed } from "../data/slide02.seed"

export default function Slide02() {
  const seed = useSlide02Seed("slide02-v4")
  const data = getSlide02Mock(seed) // data determinista por seed

  return (
    <SlideShell
      title="Portfolio Overview"
      kicker="AI · Risk · Performance"
      className="hi-screen"
      footerLeft={<span className="tracking-wide">HITECH</span>}
      footerRight={<span className="font-mono">1600x900</span>}
    >
      {/* UI “policy-safe”: sin blur/filter/mix-blend, sin motion, sin sombras borrosas */}
      <div className="relative grid h-full grid-cols-12 grid-rows-6 gap-6">
        {/* Base glass (sin blur) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10 bg-white/[0.03]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[24px] opacity-70 [background:radial-gradient(1200px_600px_at_30%_20%,rgba(255,255,255,0.10),transparent_55%)]"
        />

        <Panel className="col-span-5 row-span-2" title="Risk Summary">
          <RiskMock data={data.riskSummary} />
        </Panel>

        <Panel className="col-span-4 row-span-2" title="KPI Tracker" critical>
          <KpiDonutSafe data={data.kpiTracker} />
        </Panel>

        <Panel className="col-span-3 row-span-2" title="AI Better">
          <BarsAndSignalSafe data={data.aiBetter} />
        </Panel>

        <Panel className="col-span-5 row-span-4" title="Recent Activity">
          <ActivityMock data={data.recentActivity} />
        </Panel>

        <Panel className="col-span-4 row-span-4" title="Portfolio Performance">
          <PerfChartSafe data={data.portfolioPerformance} />
        </Panel>

        <Panel className="col-span-3 row-span-4" title="AI Insights">
          <InsightsMockSafe data={data.aiInsights} />
        </Panel>
      </div>
    </SlideShell>
  )
}

function Panel(props: {
  title: string
  className?: string
  critical?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border",
        props.critical ? "border-white/20 bg-white/[0.06]" : "border-white/12 bg-white/[0.04]",
        // “glass” sin blur: highlights por gradientes
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        props.className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80 [background:linear-gradient(135deg,rgba(255,255,255,0.10),transparent_35%,rgba(255,255,255,0.06))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(800px_260px_at_20%_0%,rgba(255,255,255,0.10),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25"
      />

      <div className="relative z-10 h-full p-6">
        <div className="mb-4 text-sm font-medium tracking-wide opacity-80">{props.title}</div>
        {props.children}
      </div>
    </div>
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

/** Donut sin blur/filter. Nada de <filter> en SVG. */
function KpiDonutSafe({ data }: { data: Slide02DashboardData["kpiTracker"] }) {
  const ring = 2 * Math.PI * 44
  const compositeLabel = `${(data.composite * 100).toFixed(1)}%`
  const dashOffset = ring * (1 - data.donutProgress)

  return (
    <div className="grid h-full grid-cols-[1fr_170px] gap-4">
      <div className="flex items-center justify-center">
        <div className="relative h-44 w-44">
          <div className="absolute inset-0 rounded-full bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
          <svg className="absolute inset-0" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="g1safe" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgba(255,255,255,0.70)" />
                <stop offset="0.35" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="1" stopColor="rgba(181,181,181,0.55)" />
              </linearGradient>
            </defs>

            <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="url(#g1safe)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${ring}`}
              strokeDashoffset={`${dashOffset}`}
              transform="rotate(-90 60 60)"
            />
          </svg>

          {/* Centro sin backdrop-blur */}
          <div className="absolute inset-[18px] rounded-full bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" />
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

function BarsAndSignalSafe({ data }: { data: Slide02DashboardData["aiBetter"] }) {
  const pts = Array.isArray(data.signal?.points) ? data.signal.points : []

  return (
    <div className="grid h-full grid-rows-[auto_auto_1fr] gap-3">
      <div className="space-y-2 text-xs opacity-80">
        {data.kpiBars.map((bar) => (
          <MiniBar key={bar.label} label={bar.label} value={bar.percent} right={formatValue(bar)} />
        ))}
      </div>

      <div className="hi-dim text-xs">Signal</div>

      {/* Sparkline sin filters */}
      <div className="hi-chart h-full w-full">
        <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={sparkPath(pts, 100, 40, 6)}
            fill="none"
            stroke="rgba(181,181,181,0.55)"
            strokeWidth="1.4"
          />
          <path
            d={sparkAreaPath(pts, 100, 40, 6)}
            fill="rgba(181,181,181,0.12)"
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

function PerfChartSafe({ data }: { data: Slide02DashboardData["portfolioPerformance"] }) {
  const pts = Array.isArray(data.series) ? data.series : []
  return (
    <div className="hi-chart h-full w-full">
      <svg className="h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <path d={sparkAreaPath(pts, 100, 60, 8)} fill="rgba(181,181,181,0.10)" />
        <path d={sparkPath(pts, 100, 60, 8)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

function InsightsMockSafe({ data }: { data: Slide02DashboardData["aiInsights"] }) {
  return (
    <div className="grid h-full grid-rows-[auto_1fr] gap-3">
      <div className="rounded-[14px] bg-white/5 p-4 text-xs opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {data.summaryPrefix} <span className="text-white/85">{data.highlightPercent}%</span> {data.summarySuffix}
        <div className="hi-dim mt-2 flex flex-wrap items-center gap-2">
          <span>Confidence: {data.confidence.toFixed(2)}</span>
          <span>· Source: {data.source}</span>
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

/** Helpers: paths deterministas, sin filtros */
function sparkPath(points: number[], W: number, H: number, padY: number) {
  const pts = points.length >= 2 ? points : [0.35, 0.38, 0.36, 0.41, 0.46, 0.44, 0.49]
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of pts) {
    min = Math.min(min, v)
    max = Math.max(max, v)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1e-9) {
    min = 0
    max = 1
  }

  const spanY = H - padY * 2
  const toY = (v: number) => {
    const t = (v - min) / (max - min)
    const clamped = Math.min(1, Math.max(0, t))
    return padY + (1 - clamped) * spanY
  }

  let d = ""
  for (let i = 0; i < pts.length; i += 1) {
    const x = (i / (pts.length - 1)) * W
    const y = toY(pts[i])
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

function sparkAreaPath(points: number[], W: number, H: number, padY: number) {
  const d = sparkPath(points, W, H, padY)
  return `${d} L ${W} ${H} L 0 ${H} Z`
}
