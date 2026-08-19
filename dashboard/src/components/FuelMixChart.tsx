import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import type { AnnualPoint } from '../types'
import { Card, Legend, Tooltip, axisTick, fmt, gridProps, type SeriesDef } from './Chrome'

const FUELS: SeriesDef[] = [
  { key: 'Hybrid', label: 'Hybrid', color: 'var(--series-1)' },
  { key: 'Diesel', label: 'Diesel', color: 'var(--series-2)' },
  { key: 'Gasoline', label: 'Gasoline', color: 'var(--series-3)' },
]

export function FuelMixChart({ annual }: { annual: AnnualPoint[] }) {
  // Share-of-year, so the mix is readable independently of total volume.
  const rows = annual.map((a) => ({
    year: a.year,
    partial: a.partial,
    ...Object.fromEntries(FUELS.map((f) => [f.key, a.fuelShare[f.key] ?? 0])),
  }))

  const first = annual[0]
  const last = annual.filter((a) => !a.partial).at(-1)!
  const gasDrop = (first.fuelShare.Gasoline ?? 0) - (last.fuelShare.Gasoline ?? 0)

  return (
    <Card
      title="Fuel mix, share of annual wholesale"
      desc={`What actually changed is gasoline: it fell ${gasDrop.toFixed(0)} points between ${first.year} and ${last.year}, and diesel and hybrid divided the ground it gave up. ${annual.at(-1)!.partial ? `${annual.at(-1)!.year} covers January to March only.` : ''}`}
      table={<FuelTable annual={annual} />}
    >
      <Legend series={FUELS} />
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={rows} margin={{ top: 4, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="year"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={46}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
          />
          <RTooltip
            content={<Tooltip unit="%" labelFmt={(v) => String(v)} />}
            cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
          />
          {FUELS.map((f) => (
            <Area
              key={f.key}
              type="monotone"
              dataKey={f.key}
              name={f.label}
              stackId="mix"
              stroke="var(--surface-1)"   /* the 2px gap between stacked fills */
              strokeWidth={2}
              fill={f.color}
              fillOpacity={1}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

function FuelTable({ annual }: { annual: AnnualPoint[] }) {
  return (
    <table className="data">
      <caption className="sr-only">Fuel share of annual wholesale by year</caption>
      <thead>
        <tr>
          <th scope="col">Year</th>
          {FUELS.map((f) => <th key={f.key} scope="col">{f.label}</th>)}
          <th scope="col">Total units</th>
        </tr>
      </thead>
      <tbody>
        {annual.map((a) => (
          <tr key={a.year}>
            <th scope="row">{a.year}{a.partial ? ' *' : ''}</th>
            {FUELS.map((f) => (
              <td key={f.key}>
                {a.fuelShare[f.key] != null ? `${a.fuelShare[f.key].toFixed(1)}%` : '—'}
              </td>
            ))}
            <td>{fmt(a.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
