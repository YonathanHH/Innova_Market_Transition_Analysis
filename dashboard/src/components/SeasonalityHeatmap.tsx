import type { Seasonality } from '../types'
import { Card, fmt } from './Chrome'

const RAMP = [
  'var(--seq-100)', 'var(--seq-200)', 'var(--seq-300)', 'var(--seq-400)',
  'var(--seq-500)', 'var(--seq-600)', 'var(--seq-700)',
]

/** Sequential encoding: one hue, light to dark. Values are printed in every
 *  cell, so magnitude never rests on colour alone. */
export function SeasonalityHeatmap({ seasonality }: { seasonality: Seasonality }) {
  const { months, rows, giiasLiftPct } = seasonality
  const all = rows.flatMap((r) => r.values).filter((v) => v > 0)
  const min = Math.min(...all)
  const max = Math.max(...all)

  const stepOf = (v: number) => {
    if (v <= 0) return -1
    const t = (v - min) / (max - min || 1)
    return Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))
  }

  return (
    <Card
      title="Seasonality: units by month and year"
      desc={
        giiasLiftPct != null
          ? `August runs ${giiasLiftPct}% above the average month across complete years — the GIIAS motor show, the one reliable seasonal feature in the series.`
          : 'Monthly totals across every year in the dataset.'
      }
    >
      <div className="heat-scroll">
        <table className="heat">
          <thead>
            <tr>
              <th />
              {months.map((m) => <th key={m} scope="col">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row">{r.year}</th>
                {r.values.map((v, i) => {
                  const step = stepOf(v)
                  return (
                    <td
                      key={i}
                      style={{
                        background: step < 0 ? 'transparent' : RAMP[step],
                        // Keep label contrast on the dark end of the ramp.
                        color: step >= 4 ? '#fcfcfb' : 'var(--text-primary)',
                        border: step < 0 ? '1px dashed var(--border)' : 'none',
                      }}
                      title={`${months[i]} ${r.year}: ${v ? fmt(v) : 'no data'}`}
                    >
                      {v ? fmt(v) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heat-scale">
        <span>{fmt(min)}</span>
        <span className="ramp">
          {RAMP.map((c) => <span key={c} style={{ background: c }} />)}
        </span>
        <span>{fmt(max)} units</span>
      </div>
    </Card>
  )
}
