import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import type { MonthlyPoint } from '../types'
import { Card, Tooltip, axisTick, fmt, fmtCompact, gridProps, monthLabel } from './Chrome'

/** Four series share one hue: identity comes from the facet title, not colour,
 *  which is what lets us show all four without a four-way categorical palette. */
export function SeriesSmallMultiples({
  monthly, seriesNames, zenixLaunch,
}: {
  monthly: MonthlyPoint[]
  seriesNames: string[]
  zenixLaunch: string
}) {
  // One shared y-domain so the facets are comparable at a glance.
  const max = Math.max(
    ...monthly.flatMap((m) => seriesNames.map((s) => Number(m[s] ?? 0))),
  )
  const domainMax = Math.ceil(max / 500) * 500

  return (
    <Card
      title="Each series on its own"
      desc="The same monthly volumes split by generation and fuel, on a shared scale. Reborn Gasoline is the line that gave way; the other three all hold or grow."
      table={<SeriesTable monthly={monthly} seriesNames={seriesNames} />}
    >
      <div className="facets">
        {seriesNames.map((name) => {
          const rows = monthly.map((m) => ({ date: m.date, v: Number(m[name] ?? 0) }))
          const live = rows.filter((r) => r.v > 0)
          const total = rows.reduce((a, r) => a + r.v, 0)
          return (
            <div key={name}>
              <p className="facet-title">{name}</p>
              <p className="facet-sub">
                {fmt(total)} units · from {monthLabel(live[0]?.date ?? rows[0].date)}
              </p>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={rows} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    minTickGap={44}
                    tickFormatter={(v: string) => v.slice(0, 4)}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    domain={[0, domainMax]}
                    tickFormatter={fmtCompact}
                  />
                  <RTooltip
                    content={<Tooltip />}
                    cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                  />
                  <ReferenceLine x={zenixLaunch} stroke="var(--text-muted)"
                    strokeDasharray="3 3" />
                  <Area
                    dataKey="v"
                    name={name}
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    fill="var(--series-1)"
                    fillOpacity={0.16}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>
      <p className="desc" style={{ marginTop: 12, marginBottom: 4 }}>
        The dotted rule marks the Zenix launch in {monthLabel(zenixLaunch)}.
      </p>
    </Card>
  )
}

function SeriesTable({
  monthly, seriesNames,
}: { monthly: MonthlyPoint[]; seriesNames: string[] }) {
  // Annual totals keep the table readable; the monthly detail lives in the CSV.
  const years = [...new Set(monthly.map((m) => m.date.slice(0, 4)))]
  return (
    <table className="data">
      <thead>
        <tr>
          <th scope="col">Year</th>
          {seriesNames.map((s) => <th key={s} scope="col">{s}</th>)}
        </tr>
      </thead>
      <tbody>
        {years.map((y) => {
          const ms = monthly.filter((m) => m.date.startsWith(y))
          return (
            <tr key={y}>
              <th scope="row">{y}</th>
              {seriesNames.map((s) => (
                <td key={s}>{fmt(ms.reduce((a, m) => a + Number(m[s] ?? 0), 0))}</td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
