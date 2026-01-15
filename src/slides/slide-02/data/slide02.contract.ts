export type RiskLevel = "Low" | "Medium" | "High"

export interface RiskMixEntry {
  level: RiskLevel
  percent: number
}

export interface RiskSummaryData {
  activeRisks: number
  severity: RiskLevel
  deltaThisMonth: number
  riskMix: RiskMixEntry[]
}

export interface KpiMetric {
  label: "Forecast" | "Target" | "Actual"
  value: number
  unit?: string
  display?: string
}

export interface KpiTrackerData {
  composite: number
  donutProgress: number
  forecast: KpiMetric
  target: KpiMetric
  actual: KpiMetric
  confidence: RiskLevel
  drift: RiskLevel
}

export interface MiniBarData {
  label: "Forecast" | "Target" | "Actual"
  percent: number
  rightValue: number
  rightUnit?: string
  rightDisplay?: string
}

export interface SignalSeriesData {
  points: number[]
  min: number
  max: number
}

export interface AIBetterData {
  kpiBars: MiniBarData[]
  signal: SignalSeriesData
}

export interface RecentActivityItem {
  title: string
  timeAgo: string
  detail: string
  timestamp: string
}

export interface RecentActivityData {
  items: RecentActivityItem[]
}

export interface PortfolioPerformanceData {
  series: number[]
  min: number
  max: number
}

export interface AIInsightsData {
  summaryPrefix: string
  highlightPercent: number
  summarySuffix: string
  confidence: number
  source: string
}

export interface Slide02DashboardData {
  riskSummary: RiskSummaryData
  kpiTracker: KpiTrackerData
  aiBetter: AIBetterData
  recentActivity: RecentActivityData
  portfolioPerformance: PortfolioPerformanceData
  aiInsights: AIInsightsData
}
