import { useMemo, useState } from 'react'
import type { DoseLog } from '../types'
import { format, parseISO, isToday, isYesterday } from 'date-fns'

interface LogProps {
  logs: DoseLog[]
  onUndo?: (logId: string) => void
  onOpenFridge?: () => void
}

function dayLabel(iso: string) {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, MMM d')
}

function dayKey(iso: string) {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return 'unknown'
  return format(d, 'yyyy-MM-dd')
}

export function Log({ logs, onUndo, onOpenFridge }: LogProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: DoseLog[] }>()
    for (const log of logs.slice(0, 60)) {
      const key = dayKey(log.takenAt)
      const existing = map.get(key)
      if (existing) existing.items.push(log)
      else map.set(key, { label: dayLabel(log.takenAt), items: [log] })
    }
    return [...map.entries()]
  }, [logs])

  const handleUndo = (id: string) => {
    if (!onUndo) return
    setRemovingId(id)
    window.setTimeout(() => {
      onUndo(id)
      setRemovingId(null)
    }, 180)
  }

  return (
    <section className="panel track-panel">
      <p className="eyebrow">History</p>
      <h2>Injection log</h2>
      <p className="muted">A clean record of what you took.</p>

      {logs.length === 0 ? (
        <div className="track-empty">
          <p>No doses logged yet. When you log from Home, they’ll show up here.</p>
          {onOpenFridge && (
            <button type="button" className="btn-primary" onClick={onOpenFridge}>
              Go to Fridge
            </button>
          )}
        </div>
      ) : (
        <div className="track-groups">
          {groups.map(([key, group], gi) => (
            <div
              key={key}
              className="track-group"
              style={{ animationDelay: `${gi * 40}ms` }}
            >
              <h3 className="track-day">{group.label}</h3>
              <ul className="log-list">
                {group.items.map((l, i) => (
                  <li
                    key={l.id}
                    className={`log-row${removingId === l.id ? ' is-leaving' : ''}`}
                    style={{ animationDelay: `${gi * 40 + i * 30}ms` }}
                  >
                    <div className="log-row-main">
                      <strong>{l.peptideName || 'Untitled'}</strong>
                      <span className="muted block">
                        {l.doseAmount}
                        {l.doseUnit}
                        {l.site ? ` · ${l.site}` : ''}
                      </span>
                    </div>
                    <div className="log-row-meta">
                      <time dateTime={l.takenAt}>
                        {format(parseISO(l.takenAt), 'h:mm a')}
                      </time>
                      {onUndo && (
                        <button
                          type="button"
                          className="log-undo"
                          onClick={() => handleUndo(l.id)}
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
