import { useMemo, useState } from 'react'
import type { AppNotification, NotificationKind } from '../types'

interface NotificationCenterProps {
  open: boolean
  notifications: AppNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDismiss: (id: string) => void
  onOpenDose?: (peptideId?: string) => void
}

const KIND_LABEL: Record<NotificationKind, string> = {
  dose: 'Dose',
  protocol: 'Protocol',
  streak: 'Streak',
  stock: 'Stock',
  system: 'Dosed',
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function NotificationCenter({
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onOpenDose,
}: NotificationCenterProps) {
  const [leaving, setLeaving] = useState<string | null>(null)
  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  if (!open) return null

  const handleDismiss = (id: string) => {
    setLeaving(id)
    window.setTimeout(() => {
      onDismiss(id)
      setLeaving(null)
    }, 180)
  }

  const handleActivate = (n: AppNotification) => {
    if (!n.read) onMarkRead(n.id)
    if (n.kind === 'dose' || n.kind === 'stock') {
      onOpenDose?.(n.meta?.peptideId)
    }
  }

  return (
    <div className="nc-root" role="dialog" aria-modal="true" aria-label="Notifications">
      <button type="button" className="nc-backdrop" aria-label="Close notifications" onClick={onClose} />
      <section className="nc-panel">
        <header className="nc-head">
          <div className="nc-head-copy">
            <p className="eyebrow">Inbox</p>
            <h1>Notifications</h1>
          </div>
          <button type="button" className="nc-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="nc-toolbar">
          <span className="nc-count">
            {notifications.length === 0
              ? 'No alerts'
              : unread > 0
                ? `${unread} unread`
                : 'All caught up'}
          </span>
          {unread > 0 && (
            <button type="button" className="nc-mark-all" onClick={onMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="nc-empty">
            <div className="nc-empty-mark" aria-hidden>
              <svg viewBox="0 0 48 48" fill="none">
                <path
                  d="M34 30v-8a10 10 0 1 0-20 0v8l-3 3h26l-3-3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 36a4 4 0 0 0 8 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <strong>You’re all clear</strong>
            <p>
              Dose reminders, low-stock alerts, and streak milestones will land here when
              there’s something worth knowing.
            </p>
          </div>
        ) : (
          <ul className="nc-list">
            {notifications.map((n, i) => (
              <li
                key={n.id}
                className={`nc-item${n.read ? '' : ' is-unread'}${leaving === n.id ? ' is-leaving' : ''}`}
                style={{ animationDelay: `${40 + i * 35}ms` }}
              >
                <button
                  type="button"
                  className="nc-item-main"
                  onClick={() => handleActivate(n)}
                >
                  <span className={`nc-kind nc-kind-${n.kind}`}>{KIND_LABEL[n.kind]}</span>
                  <strong>{n.title}</strong>
                  <span className="nc-body">{n.body}</span>
                  <time dateTime={n.createdAt}>{relativeTime(n.createdAt)}</time>
                </button>
                <div className="nc-item-actions">
                  {!n.read && (
                    <button
                      type="button"
                      className="nc-action"
                      onClick={() => onMarkRead(n.id)}
                    >
                      Read
                    </button>
                  )}
                  <button
                    type="button"
                    className="nc-action"
                    onClick={() => handleDismiss(n.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
