import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import type { Crossover, Forecast, Metric, MonthlyPoint } from '../types'
import {
  Card, Legend, Tooltip, axisTick, fmt, gridProps, monthLabel, type SeriesDef,
} from './Chrome'

const RD = 'Reborn Diesel'
const ZH = 'Zenix Hybrid'
const HISTORY_FROM = '2021-01'   // enough context without dwarfing the forecast

const LEGEND: SeriesDef[] = [
  { key: 'zh', label: 'Zenix Hybrid', color: 'var(--series-1)' },
  { key: 'rd', label: 'Reborn Diesel', color: 'var(--series-2)' },
  { key: 'zhF', label: 'Zenix Hybrid — forecast', color: 'var(--series-1)' },
  { key: 'rdF', label: 'Reborn Diesel — forecast', color: 'var(--series-2)' },
]

interface Row {
  date: string
  rd?: number
  zh?: number
  rdF?: number
  zhF?: number
  zhBand?: [number, number]
}

export function HeadToHeadChart({
  monthly, forecasts, metrics, crossover,
}: {
  monthly: MonthlyPoint[]
  forecasts: Record<string, Forecast>
  metrics: Record<string, Metric>
  crossover: Crossover
}) {
  const hist = monthly.filter((m) => m.date >= HISTORY_FROM)

  // Leading zeros are pre-launch padding, not observed demand -- start each
  // line at its first real month so the chart does not imply Zenix Hybrid was
  // on sale and selling nothing.
  const firstLive = (key: string) =>
    hist.findIndex((m) => Number(m[key] ?? 0) > 0)

  const zhStart = firstLive(ZH)
  const rdStart = firstLive(RD)

  const rows: Row[] = hist.map((m, i) => ({
    date: m.date,
    rd: rdStart >= 0 && i >= rdStart ? Number(m[RD] ?? 0) : undefined,
    zh: zhStart >= 0 && i >= zhStart ? Number(m[ZH] ?? 0) : undefined,
  }))

  const last = rows.at(-1)
  const zf = forecasts[ZH]?.points ?? []
  const rf = forecasts[RD]?.points ?? []

  // Seed the forecast lines at the last actual so they join up visually.
  if (last) {
    last.rdF = last.rd
    last.zhF = last.zh
    last.zhBand = [last.zh ?? 0, last.zh ?? 0]
  }
  const byDate = new Map<string, Row>()
  zf.forEach((p) => byDate.set(p.date, {
    date: p.date, zhF: p.mean, zhBand: [p.lower, p.upper],
  }))
  rf.forEach((p) => {
    const r = byDate.get(p.date) ?? { date: p.date }
    r.rdF = p.mean
    byDate.set(p.date, r)
  })
  const data = [...rows, ...[...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))]

  const m1 = metrics[ZH]
  const m2 = metrics[RD]
  const runs = crossover.leadRuns ?? []

  // A crossover counts only if the lead holds to the end of the horizon, so the
  // two verdicts are "it happens in month X" or "it never settles".
  const verdict = crossover.date
    ? `Zenix Hybrid takes the lead for good in ${monthLabel(crossover.date)}.`
    : `There is no permanent crossover in the horizon. Zenix Hybrid has led in ${runs.length} separate stretches, but never keeps the lead${crossover.finalGap != null ? `, finishing ${fmt(Math.round(crossover.finalGap))} units/month behind` : ''}.`

  return (
    <Card
      title="Reborn Diesel vs Zenix Hybrid, with 24-month SARIMA forecast"
      desc={`${verdict} The shaded band is the 80% interval on Zenix Hybrid, and it is wide enough to contain almost any outcome — treat the forecast as a statement about uncertainty, not a date.`}
      table={<HeadTable data={data} />}
    >
      <Legend series={LEGEND} dashed={['zhF', 'rdF']} />
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={28}
            tickFormatter={monthLabel}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => fmt(v)}
          />
          <RTooltip
            content={<Tooltip hide={['zhBand']} />}
            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
          />

          <Area
            dataKey="zhBand"
            name="Zenix Hybrid 80% interval"
            stroke="none"
            fill="var(--forecast-band)"
            isAnimationActive={false}
            activeDot={false}
          />

          {last && (
            <ReferenceLine
              x={last.date}
              stroke="var(--text-muted)"
              strokeDasharray="3 3"
              label={{
                value: 'forecast →',
                position: 'insideTopRight',
                fill: 'var(--text-muted)',
                fontSize: 11,
              }}
            />
          )}

          <Line dataKey="zh" name="Zenix Hybrid" stroke="var(--series-1)"
            strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="rd" name="Reborn Diesel" stroke="var(--series-2)"
            strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="zhF" name="Zenix Hybrid — forecast" stroke="var(--series-1)"
            strokeWidth={2} strokeDasharray="5 4" dot={false}
            isAnimationActive={false} />
          <Line dataKey="rdF" name="Reborn Diesel — forecast" stroke="var(--series-2)"
            strokeWidth={2} strokeDasharray="5 4" dot={false}
            isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>

      {runs.length > 1 && (
        <p className="desc" style={{ marginTop: 10, marginBottom: 4 }}>
          <strong>The lead is changing hands, and Zenix Hybrid's turns are
          getting shorter:</strong>{' '}
          {runs.map((r) => `${r.months}`).join(' → ')} months, from{' '}
          {monthLabel(runs[0].from)} to {monthLabel(runs.at(-1)!.to)}. A rule that
          only asked for a few consecutive months would have called the first of
          those stretches the crossover.
        </p>
      )}

      {(m1 || m2) && (
        <p className="desc" style={{ marginTop: 4, marginBottom: 4 }}>
          Held-out accuracy over the last 12 months:{' '}
          {m1 && <>Zenix Hybrid MAPE {m1.mape}% (MAE {fmt(m1.mae)} units)</>}
          {m1 && m2 && '; '}
          {m2 && <>Reborn Diesel MAPE {m2.mape}% (MAE {fmt(m2.mae)} units)</>}.
        </p>
      )}
    </Card>
  )
}

function HeadTable({ data }: { data: Row[] }) {
  const rows = data.filter((r) => r.rd != null || r.rdF != null)
  return (
    <table className="data">
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Zenix Hybrid</th>
          <th scope="col">Reborn Diesel</th>
          <th scope="col">Basis</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const actual = r.rd != null
          return (
            <tr key={r.date}>
              <th scope="row">{monthLabel(r.date)}</th>
              <td>{fmt(Math.round((actual ? r.zh : r.zhF) ?? 0))}</td>
              <td>{fmt(Math.round((actual ? r.rd : r.rdF) ?? 0))}</td>
              <td>{actual ? 'actual' : 'forecast'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
