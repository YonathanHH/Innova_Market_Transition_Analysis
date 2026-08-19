import { useEffect, useState } from 'react'
import raw from './data/dashboard.json'
import type { Dashboard } from './types'
import { FuelMixChart } from './components/FuelMixChart'
import { HeadToHeadChart } from './components/HeadToHeadChart'
import { SeasonalityHeatmap } from './components/SeasonalityHeatmap'
import { SeriesSmallMultiples } from './components/SeriesSmallMultiples'
import { fmt, monthLabel } from './components/Chrome'

const d = raw as unknown as Dashboard

type Theme = 'light' | 'dark' | 'system'

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system',
  )
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'))
  return [theme, cycle]
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  )
}

export default function App() {
  const [theme, cycleTheme] = useTheme()
  const { meta, kpis, annual, monthly, forecasts, metrics, crossover, seasonality } = d
  const lastFull = annual.find((a) => a.year === meta.lastFullYear)!

  return (
    <div className="wrap">
      <div className="topbar">
        <button className="theme-toggle" onClick={cycleTheme}
          title="Switch between light, dark and system">
          {theme === 'system' ? 'Theme: auto' : theme === 'light' ? 'Theme: light' : 'Theme: dark'}
        </button>
      </div>

      <header className="masthead">
        <h1>Toyota Kijang Innova: the diesel-to-hybrid transition</h1>
        <p className="sub">
          Indonesian wholesale volumes from {monthLabel(meta.coverage.from)} to{' '}
          {monthLabel(meta.coverage.to)}, covering the overlap between the
          ladder-frame Innova Reborn and the TNGA monocoque Innova Zenix launched
          in {monthLabel(meta.zenixLaunch)}.
        </p>
        <div className="meta">
          <span>{fmt(meta.rows)} rows</span>
          <span>{fmt(meta.totalUnits)} units</span>
          <span>Source: {meta.source}</span>
          <span>Built {meta.generated.slice(0, 10)}</span>
        </div>
      </header>

      <div className="kpi-row">
        <Kpi
          label={`${meta.lastFullYear} volume`}
          value={fmt(kpis.lastFullYearTotal)}
          note="units wholesaled"
        />
        <Kpi
          label={`Hybrid share ${meta.lastFullYear}`}
          value={`${kpis.lastFullYearHybridShare}%`}
          note="steady since 2023"
        />
        <Kpi
          label={`Diesel share ${meta.lastFullYear}`}
          value={`${kpis.lastFullYearDieselShare}%`}
          note="up from 28% in 2023"
        />
        <Kpi
          label="August (GIIAS) lift"
          value={kpis.giiasLiftPct != null ? `+${kpis.giiasLiftPct}%` : '—'}
          note="vs the average month"
        />
      </div>

      <div className="callout">
        <strong>The headline finding is not the one you would expect.</strong> Hybrid
        did not take share from diesel. Between 2023 and {meta.lastFullYear},{' '}
        <strong>gasoline</strong> fell from {annual.find((a) => a.year === 2023)!.fuelShare.Gasoline}%
        to {lastFull.fuelShare.Gasoline}% of volume, while hybrid held near 40% and
        diesel climbed from {annual.find((a) => a.year === 2023)!.fuelShare.Diesel}% to{' '}
        {lastFull.fuelShare.Diesel}%. The transition under way is gasoline giving way
        to both of the others, not diesel giving way to hybrid.
      </div>

      <FuelMixChart annual={annual} />

      <HeadToHeadChart
        monthly={monthly}
        forecasts={forecasts}
        metrics={metrics}
        crossover={crossover}
      />

      <SeriesSmallMultiples
        monthly={monthly}
        seriesNames={meta.seriesNames}
        zenixLaunch={meta.zenixLaunch}
      />

      <SeasonalityHeatmap seasonality={seasonality} />

      <footer className="page">
        <p>
          Data hand-parsed from{' '}
          <a href="https://www.gaikindo.or.id" rel="noreferrer">GAIKINDO</a>{' '}
          monthly wholesale reports by Yonathan Hary Hutagalung, shared under
          CC BY 4.0. Forecasts are SARIMA models selected by AIC; see the
          repository notebook for diagnostics and the data dictionary for known
          issues in the source data.
        </p>
        <p>
          Wholesale counts shipments from manufacturer to dealer, which is not the
          same as retail registrations.
        </p>
      </footer>
    </div>
  )
}
