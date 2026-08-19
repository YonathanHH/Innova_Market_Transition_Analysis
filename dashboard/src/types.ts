/** Shape of dashboard.json, produced by scripts/build_dashboard_data.py. */

export interface Meta {
  generated: string
  source: string
  rows: number
  totalUnits: number
  coverage: { from: string; to: string }
  seriesNames: string[]
  forecastHorizon: number
  zenixLaunch: string
  lastFullYear: number
}

export interface Kpis {
  totalUnits: number
  lastFullYearTotal: number
  lastFullYearHybridShare: number
  lastFullYearDieselShare: number
  giiasLiftPct: number | null
}

/** One month; series names are dynamic keys alongside `date` and `total`. */
export type MonthlyPoint = { date: string; total: number } & Record<string, number | string>

export interface AnnualPoint {
  year: number
  total: number
  partial: boolean
  byFuel: Record<string, number>
  byModel: Record<string, number>
  fuelShare: Record<string, number>
}

export interface Seasonality {
  months: string[]
  rows: { year: number; values: number[] }[]
  monthlyMean: Record<string, number>
  giiasLiftPct?: number | null
}

export interface ForecastPoint {
  date: string
  mean: number
  lower: number
  upper: number
}

export interface Forecast {
  order: number[]
  seasonalOrder: number[]
  aic: number
  points: ForecastPoint[]
}

export interface Metric {
  holdoutMonths: number
  mae: number
  rmse: number
  mape: number | null
}

export interface LeadRun {
  from: string
  to: string
  months: number
  basis: 'actual' | 'forecast' | 'actual to forecast'
}

export interface Crossover {
  /** Null when the lead never holds to the end of the horizon. */
  date: string | null
  withinForecast: boolean
  /** Every stretch where Zenix Hybrid outsold Reborn Diesel. */
  leadRuns: LeadRun[]
  historyEnds: string
  inForecast?: boolean
  zenixHybrid?: number
  rebornDiesel?: number
  lastZenixHybrid?: number
  lastRebornDiesel?: number
  finalGap?: number
}

export interface Dashboard {
  meta: Meta
  kpis: Kpis
  monthly: MonthlyPoint[]
  annual: AnnualPoint[]
  seasonality: Seasonality
  forecasts: Record<string, Forecast>
  metrics: Record<string, Metric>
  crossover: Crossover
}
