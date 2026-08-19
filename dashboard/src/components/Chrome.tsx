import { useState, type ReactNode } from 'react'

export const fmt = (n: number) => n.toLocaleString('en-US')
export const fmtCompact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n))

/** "2024-08" -> "Aug 2024" */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1] ?? m} ${y}`
}

export interface SeriesDef {
  key: string
  label: string
  color: string
}

/** A legend is always present for >= 2 series, so identity is never colour-alone. */
export function Legend({ series, dashed }: { series: SeriesDef[]; dashed?: string[] }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.key}>
          <span
            className="swatch line"
            style={{
              background: dashed?.includes(s.key)
                ? `repeating-linear-gradient(90deg, ${s.color} 0 5px, transparent 5px 9px)`
                : s.color,
            }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  )
}

interface TipPayload {
  name?: string
  dataKey?: string | number
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

/** Shared crosshair tooltip. Values wear text tokens; the swatch carries identity. */
export function Tooltip({
  active, payload, label, unit = 'units', labelFmt = monthLabel, hide = [],
}: {
  active?: boolean
  payload?: TipPayload[]
  label?: string | number
  unit?: string
  labelFmt?: (v: string) => string
  hide?: string[]
}) {
  if (!active || !payload?.length) return null
  const rows = payload.filter(
    (p) => !hide.includes(String(p.dataKey)) && p.value != null,
  )
  if (!rows.length) return null

  return (
    <div className="tip">
      <div className="tip-date">{labelFmt(String(label))}</div>
      {rows.map((p, i) => (
        <div className="tip-row" key={i}>
          <span className="swatch" style={{ background: p.color }} />
          <span className="k">{p.name ?? p.dataKey}</span>
          <span className="v">
            {typeof p.value === 'number' ? fmt(Math.round(p.value)) : p.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function Card({
  title, desc, children, table,
}: {
  title: string
  desc: string
  children: ReactNode
  table?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        <p className="desc">{desc}</p>
      </header>
      {children}
      {table && (
        <footer>
          <button
            className="table-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Hide data table' : 'Show data table'}
          </button>
          {open && <div className="table-scroll">{table}</div>}
        </footer>
      )}
    </section>
  )
}

/** Axis styling shared by every chart: recessive grid and muted tick ink. */
export const axisTick = { fontSize: 11, fill: 'var(--text-muted)' } as const
export const gridProps = {
  stroke: 'var(--grid)',
  strokeDasharray: '0',
  vertical: false,
} as const
