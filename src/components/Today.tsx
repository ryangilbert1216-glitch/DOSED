import type { Peptide } from '../types'
import { drawUpSummary } from '../lib/calc'

interface TodayProps {
  peptides: Peptide[]
  onLog: (p: Peptide) => void
  onOpen: (id: string) => void
}

function freqLabel(f: Peptide['frequency']) {
  switch (f) {
    case 'daily':
      return 'Daily'
    case 'eod':
      return 'EOD'
    case 'twice_weekly':
      return '2× / week'
    case 'weekly':
      return 'Weekly'
    default:
      return 'Custom'
  }
}

export function Today({ peptides, onLog, onOpen }: TodayProps) {
  const sorted = [...peptides].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))

  return (
    <section className="panel">
      <p className="eyebrow">Home</p>
      <h2>Today</h2>
      <p className="muted">What&apos;s due from the fridge.</p>

      {sorted.length === 0 ? (
        <p className="empty-line">No live peptides yet.</p>
      ) : (
        <ul className="today-list">
          {sorted.map((p) => (
            <li key={p.id} className="today-row">
              <button type="button" className="today-main" onClick={() => onOpen(p.id)}>
                <span className="dot" style={{ background: p.color }} />
                <span>
                  <strong>{p.name}</strong>
                  <span className="muted block">
                    {p.timeOfDay} · {freqLabel(p.frequency)} · {p.doseAmount}
                    {p.doseUnit} · {drawUpSummary(p)}
                  </span>
                </span>
              </button>
              <button type="button" className="btn-secondary" onClick={() => onLog(p)}>
                Done
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
