import type {
  AIBetterData,
  AIInsightsData,
  KpiMetric,
  KpiTrackerData,
  MiniBarData,
  PortfolioPerformanceData,
  RecentActivityData,
  RiskLevel,
  RiskMixEntry,
  RiskSummaryData,
  SignalSeriesData,
  Slide02DashboardData
} from "./slide02.contract"

type Rng = () => number

function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(seed: number): Rng {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randRange(rng: Rng, min: number, max: number) {
  return min + (max - min) * rng()
}

function randInt(rng: Rng, min: number, max: number) {
  return Math.floor(randRange(rng, min, max + 1))
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function formatValue(value: number, unit?: string, decimals = 1) {
  if (!unit) {
    return value.toFixed(2)
  }
  if (unit === "m") {
    return `${value.toFixed(decimals)}m`
  }
  return `${value}${unit}`
}

function getMinMax(points: number[]) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of points) {
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  return { min, max }
}

function shuffle<T>(items: T[], rng: Rng) {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const temp = next[i]
    next[i] = next[j]
    next[j] = temp
  }
  return next
}

function buildRiskMix(rng: Rng): RiskMixEntry[] {
  const weights = [
    0.55 + rng() * 0.3,
    0.25 + rng() * 0.25,
    0.1 + rng() * 0.15
  ]
  const sum = weights.reduce((acc, value) => acc + value, 0)
  const percents = weights.map((value) => Math.round((value / sum) * 100))
  const total = percents.reduce((acc, value) => acc + value, 0)
  const diff = 100 - total
  percents[0] = clamp(percents[0] + diff, 0, 100)
  return [
    { level: "Low", percent: percents[0] },
    { level: "Medium", percent: percents[1] },
    { level: "High", percent: percents[2] }
  ]
}

function buildSignalSeries(rng: Rng, count: number): SignalSeriesData {
  const points: number[] = []
  let value = randRange(rng, 0.46, 0.64)
  for (let i = 0; i < count; i += 1) {
    const drift = randRange(rng, -0.035, 0.035)
    value = clamp(value + drift, 0.25, 0.9)
    points.push(roundTo(value, 3))
  }
  const { min, max } = getMinMax(points)
  return { points, min, max }
}

function buildPerformanceSeries(rng: Rng, count: number): PortfolioPerformanceData {
  const series: number[] = []
  let value = randRange(rng, 0.3, 0.38)
  for (let i = 0; i < count; i += 1) {
    const drawdown = rng() < 0.18
    const delta = drawdown
      ? -randRange(rng, 0.004, 0.016)
      : randRange(rng, 0.008, 0.024)
    value = clamp(value + delta, 0.2, 0.98)
    series.push(roundTo(value, 3))
  }
  const { min, max } = getMinMax(series)
  return { series, min, max }
}

export function getSlide02Mock(seed: string): Slide02DashboardData {
  const seedFn = xmur3(seed)
  const rng = mulberry32(seedFn())

  const riskMix = buildRiskMix(rng)
  const highPercent = riskMix.find((entry) => entry.level === "High")?.percent ?? 0
  const mediumPercent = riskMix.find((entry) => entry.level === "Medium")?.percent ?? 0
  const severity: RiskLevel =
    highPercent >= 15 ? "High" : mediumPercent >= 28 ? "Medium" : "Low"

  const riskSummary: RiskSummaryData = {
    activeRisks: randInt(rng, 9, 16),
    severity,
    deltaThisMonth: randInt(rng, 12, 32),
    riskMix
  }

  const targetValue = roundTo(randRange(rng, 2.2, 2.9), 1)
  const forecastValue = roundTo(targetValue * randRange(rng, 0.42, 0.58), 1)
  const actualValue = roundTo(targetValue * randRange(rng, 0.68, 0.82), 1)
  const composite = roundTo(randRange(rng, 0.68, 0.83), 3)

  const forecast: KpiMetric = {
    label: "Forecast",
    value: forecastValue,
    unit: "m",
    display: formatValue(forecastValue, "m")
  }
  const target: KpiMetric = {
    label: "Target",
    value: targetValue,
    unit: "m",
    display: formatValue(targetValue, "m")
  }
  const actual: KpiMetric = {
    label: "Actual",
    value: actualValue,
    unit: "m",
    display: formatValue(actualValue, "m")
  }

  const driftRoll = rng()
  const drift: RiskLevel = driftRoll > 0.66 ? "Low" : driftRoll > 0.33 ? "Medium" : "High"
  const confidence: RiskLevel =
    composite >= 0.78 ? "High" : composite >= 0.7 ? "Medium" : "Low"

  const kpiTracker: KpiTrackerData = {
    composite,
    donutProgress: composite,
    forecast,
    target,
    actual,
    confidence,
    drift
  }

  const scaleTop = targetValue * randRange(rng, 1.3, 1.6)
  const kpiBars: MiniBarData[] = [
    {
      label: "Forecast",
      percent: clamp(Math.round((forecastValue / scaleTop) * 100), 35, 80),
      rightValue: forecastValue,
      rightDisplay: forecastValue.toFixed(2)
    },
    {
      label: "Target",
      percent: clamp(Math.round((targetValue / scaleTop) * 100), 45, 85),
      rightValue: targetValue,
      rightUnit: "m",
      rightDisplay: formatValue(targetValue, "m")
    },
    {
      label: "Actual",
      percent: clamp(Math.round((actualValue / scaleTop) * 100), 40, 90),
      rightValue: actualValue,
      rightUnit: "m",
      rightDisplay: formatValue(actualValue, "m")
    }
  ]

  const aiBetter: AIBetterData = {
    kpiBars,
    signal: buildSignalSeries(rng, 22)
  }

  const baseTime = new Date("2026-01-10T12:00:00Z")
  const timeOffsets = [15, 60, 120]
  const activityPool = [
    { title: "Mitigation plan initiated", detail: "Risk #42" },
    { title: "New trade executed", detail: "Strategy: Core" },
    { title: "KPI report generated", detail: "PDF export" },
    { title: "Hedge rebalanced", detail: "Exposure: Tech" },
    { title: "Alert dismissed", detail: "Risk #17" }
  ]
  const recentActivityItems = shuffle(activityPool, rng)
    .slice(0, 3)
    .map((item, index) => {
      const minutesAgo = timeOffsets[index]
      const timeAgo = minutesAgo < 60 ? `${minutesAgo}m ago` : `${minutesAgo / 60}h ago`
      const timestamp = new Date(baseTime.getTime() - minutesAgo * 60000).toISOString()
      return {
        title: item.title,
        timeAgo,
        detail: item.detail,
        timestamp
      }
    })

  const recentActivity: RecentActivityData = {
    items: recentActivityItems
  }

  const portfolioPerformance = buildPerformanceSeries(rng, 24)

  const aiInsights: AIInsightsData = {
    summaryPrefix: "Operational efficiencies highlight opportunities for a",
    highlightPercent: 17,
    summarySuffix: "streamlined workflow improvement in the upcoming quarter.",
    confidence: roundTo(randRange(rng, 0.76, 0.88), 2),
    source: "MSW mock"
  }

  return {
    riskSummary,
    kpiTracker,
    aiBetter,
    recentActivity,
    portfolioPerformance,
    aiInsights
  }
}
