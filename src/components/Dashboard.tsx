import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DoseLog, Peptide } from '../types'
import { drawUpSummary } from '../lib/calc'
import { fileToProfileDataUrl } from '../lib/photo'
import calendarDaysIcon from '../assets/calendar-days.png'
import checkWeekIcon from '../assets/check-week.png'
import fridgeStatIcon from '../assets/fridge-stat.png'
import fridgeCardArt from '../assets/fridge-card-ui.png'

function GearIcon() {
  return (
    <svg className="dash-tool-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.12-.54 1.63-.94l2.39.96c.23.1.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BellIcon({ badge = false }: { badge?: boolean }) {
  return (
    <span className={`dash-bell-wrap${badge ? ' has-badge' : ''}`}>
      <svg className="dash-tool-icon dash-tool-icon-bell" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 1.5h15L18 16Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {badge && <span className="dash-bell-badge" aria-hidden />}
    </span>
  )
}

interface DashboardProps {
  peptides: Peptide[]
  logs: DoseLog[]
  remindersEnabled: boolean
  unreadNotifications: number
  displayName: string
  profilePhoto: string | null
  onProfilePhotoChange: (photo: string | null) => void
  onAdd: () => void
  onOpenFridge: () => void
  onOpenPeptide: (id: string) => void
  onOpenProfile: () => void
  onOpenNotifications: () => void
  onLog: (p: Peptide) => void
  onUndoLog: (p: Peptide) => void
}

function localKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(d: Date) {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function streakDays(logs: DoseLog[]) {
  const days = new Set(logs.map((l) => localKey(new Date(l.takenAt))))
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!days.has(localKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(localKey(cursor))) return 0
  }
  let count = 0
  while (days.has(localKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfDay(d: Date) {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)
}

/** Whether a live peptide is scheduled on a given calendar day */
function isPlannedOnDay(p: Peptide, day: Date) {
  const start = startOfDay(new Date(p.startedAt))
  const target = startOfDay(day)
  if (Number.isNaN(start.getTime()) || target < start) return false

  const diff = daysBetween(start, target)
  switch (p.frequency) {
    case 'daily':
    case 'custom':
      return true
    case 'eod':
      return diff % 2 === 0
    case 'weekly':
      return target.getDay() === start.getDay()
    case 'twice_weekly': {
      // Same weekday as start, plus 3 days later in the week cycle
      const dow = target.getDay()
      const startDow = start.getDay()
      const second = (startDow + 3) % 7
      return dow === startDow || dow === second
    }
    default:
      return true
  }
}

function formatDayTitle(day: Date) {
  return day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatLogTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function Dashboard({
  peptides,
  logs,
  remindersEnabled,
  unreadNotifications,
  displayName,
  profilePhoto,
  onProfilePhotoChange,
  onAdd,
  onOpenFridge,
  onOpenPeptide,
  onOpenProfile,
  onOpenNotifications,
  onLog,
  onUndoLog,
}: DashboardProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const weekRef = useRef<HTMLDivElement>(null)
  const dayBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [weekThumb, setWeekThumb] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    ready: false,
  })
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [selectedKey, setSelectedKey] = useState(() => localKey(today))
  const [daySheetOpen, setDaySheetOpen] = useState(false)

  const week = useMemo(() => {
    const start = startOfWeek(today)
    return WEEKDAYS.map((label, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return { label, date, key: localKey(date) }
    })
  }, [today])

  const loggedDays = useMemo(
    () => new Set(logs.map((l) => localKey(new Date(l.takenAt)))),
    [logs],
  )

  const streak = useMemo(() => streakDays(logs), [logs])
  const weekLogs = logs.filter((l) => {
    const t = new Date(l.takenAt).getTime()
    const start = startOfWeek(today).getTime()
    return t >= start
  }).length

  const earliest = peptides.reduce<number | null>((min, p) => {
    const t = new Date(p.startedAt).getTime()
    if (Number.isNaN(t)) return min
    return min == null ? t : Math.min(min, t)
  }, null)
  const daysOn = earliest
    ? Math.max(1, Math.round((Date.now() - earliest) / 86400000) + 1)
    : 0

  const due = [...peptides].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
  const loggedToday = new Set(
    logs
      .filter((l) => localKey(new Date(l.takenAt)) === localKey(today))
      .map((l) => l.peptideId),
  )

  const selectedDay = useMemo(
    () => week.find((d) => d.key === selectedKey) ?? week[0],
    [selectedKey, week],
  )

  const dayPlan = useMemo(() => {
    if (!selectedDay) return []
    const dayLogs = logs.filter((l) => localKey(new Date(l.takenAt)) === selectedDay.key)
    const loggedByPeptide = new Map<string, DoseLog[]>()
    for (const log of dayLogs) {
      const list = loggedByPeptide.get(log.peptideId) ?? []
      list.push(log)
      loggedByPeptide.set(log.peptideId, list)
    }

    const planned = peptides
      .filter((p) => isPlannedOnDay(p, selectedDay.date))
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
      .map((p) => {
        const matches = loggedByPeptide.get(p.id) ?? []
        return {
          id: p.id,
          name: p.name || 'Untitled',
          color: p.color,
          timeOfDay: p.timeOfDay,
          doseAmount: p.doseAmount,
          doseUnit: p.doseUnit,
          logged: matches.length > 0,
          logTimes: matches.map((m) => formatLogTime(m.takenAt)).filter(Boolean),
          planned: true,
        }
      })

    const plannedIds = new Set(planned.map((p) => p.id))
    const extras = [...loggedByPeptide.entries()]
      .filter(([id]) => !plannedIds.has(id))
      .map(([id, matches]) => {
        const first = matches[0]
        const live = peptides.find((p) => p.id === id)
        return {
          id,
          name: first.peptideName || live?.name || 'Untitled',
          color: live?.color ?? '#888888',
          timeOfDay: live?.timeOfDay ?? formatLogTime(first.takenAt),
          doseAmount: first.doseAmount,
          doseUnit: first.doseUnit,
          logged: true,
          logTimes: matches.map((m) => formatLogTime(m.takenAt)).filter(Boolean),
          planned: false,
        }
      })

    return [...planned, ...extras]
  }, [logs, peptides, selectedDay])

  const handleDayClick = (key: string) => {
    if (key === selectedKey) {
      setDaySheetOpen((open) => !open)
      return
    }
    setSelectedKey(key)
    setDaySheetOpen(false)
  }

  const handleLogDose = (p: Peptide) => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmingId(p.id)
    onLog(p)
    confirmTimer.current = setTimeout(() => {
      setConfirmingId(null)
      confirmTimer.current = null
    }, 900)
  }

  useLayoutEffect(() => {
    const measure = () => {
      const weekEl = weekRef.current
      const btn = dayBtnRefs.current[selectedKey]
      if (!weekEl || !btn) return
      const weekBox = weekEl.getBoundingClientRect()
      const btnBox = btn.getBoundingClientRect()
      setWeekThumb({
        left: btnBox.left - weekBox.left + weekEl.scrollLeft,
        top: btnBox.top - weekBox.top + weekEl.scrollTop,
        width: btnBox.width,
        height: btnBox.height,
        ready: true,
      })
    }
    measure()
    const weekEl = weekRef.current
    if (!weekEl) return
    const ro = new ResizeObserver(measure)
    ro.observe(weekEl)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [selectedKey, week])

  return (
    <section className="dash" aria-label="Home dashboard">
      <header className="dash-top dash-anim" style={{ animationDelay: '40ms' }}>
        <div className="dash-tools">
          <button type="button" className="dash-icon-btn" onClick={onOpenProfile} aria-label="Settings">
            <GearIcon />
          </button>
          <button
            type="button"
            className="dash-icon-btn"
            onClick={onOpenNotifications}
            aria-label={
              unreadNotifications > 0
                ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? '' : 's'}`
                : remindersEnabled
                  ? 'Open notifications'
                  : 'Open notifications — reminders off'
            }
          >
            <BellIcon badge={unreadNotifications > 0} />
          </button>
        </div>
        <button type="button" className="dash-pill" onClick={onAdd}>
          <span className="dash-pill-dot" aria-hidden />
          {peptides.length} live
          <span className="dash-pill-plus" aria-hidden>
            +
          </span>
        </button>
      </header>

      <div className="dash-identity dash-anim" style={{ animationDelay: '90ms' }}>
        <button
          type="button"
          className="dash-avatar"
          onClick={() => photoInputRef.current?.click()}
          aria-label="Upload profile photo"
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt="" />
          ) : (
            <span className="dash-avatar-placeholder">
              {(displayName?.trim() || 'Y').charAt(0).toUpperCase()}
            </span>
          )}
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              const dataUrl = await fileToProfileDataUrl(file)
              onProfilePhotoChange(dataUrl)
            } catch {
              /* ignore bad files */
            }
          }}
        />
        <h1>{displayName?.trim() && displayName !== 'Your name' ? displayName : 'Your name'}</h1>
        <p>Your protocol</p>
      </div>

      <div className="dash-stats dash-anim" style={{ animationDelay: '140ms' }}>
        <div className="dash-stat">
          <div className="dash-stat-top">
            <StatIcon kind="vials" />
            <strong>{peptides.length}</strong>
          </div>
          <span className="dash-stat-label">In fridge</span>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-top">
            <StatIcon kind="check" />
            <strong>{weekLogs}</strong>
          </div>
          <span className="dash-stat-label">This week</span>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-top">
            <StatIcon kind="cal" />
            <strong>{daysOn}</strong>
          </div>
          <span className="dash-stat-label">Days on</span>
        </div>
      </div>

      <div className="dash-week dash-anim" role="list" ref={weekRef} style={{ animationDelay: '180ms' }}>
        <span
          className={`dash-week-thumb${weekThumb.ready ? ' is-ready' : ''}`}
          aria-hidden
          style={{
            transform: `translate(${weekThumb.left}px, ${weekThumb.top}px)`,
            width: weekThumb.width,
            height: weekThumb.height,
          }}
        />
        {week.map((day) => {
          const active = day.key === selectedKey
          const hasLog = loggedDays.has(day.key)
          return (
            <button
              key={day.key}
              type="button"
              role="listitem"
              className={`dash-day ${active ? 'is-active' : ''}`}
              ref={(el) => {
                dayBtnRefs.current[day.key] = el
              }}
              onClick={() => handleDayClick(day.key)}
              aria-expanded={active && daySheetOpen}
            >
              <span className="dash-day-dots" aria-hidden>
                {active ? (
                  <>
                    <i className="dot-accent" />
                    <i className="dot-soft" />
                    <i className="dot-mute" />
                  </>
                ) : (
                  <i className={hasLog ? 'dot-accent' : 'dot-mute'} />
                )}
              </span>
              <span className="dash-day-name">{day.label}</span>
              <span className="dash-day-num">{day.date.getDate()}</span>
            </button>
          )
        })}
      </div>

      {daySheetOpen && selectedDay && (
        <div className="dash-day-sheet" role="dialog" aria-label={`Doses for ${formatDayTitle(selectedDay.date)}`}>
          <div className="dash-day-sheet-head">
            <div>
              <p className="eyebrow">Day plan</p>
              <h2>{formatDayTitle(selectedDay.date)}</h2>
            </div>
            <button
              type="button"
              className="dash-day-sheet-close"
              onClick={() => setDaySheetOpen(false)}
              aria-label="Close day plan"
            >
              ×
            </button>
          </div>

          {dayPlan.length === 0 ? (
            <p className="dash-day-sheet-empty">Nothing planned or logged this day.</p>
          ) : (
            <ul className="dash-day-sheet-list">
              {dayPlan.map((item) => (
                <li key={item.id} className="dash-day-sheet-row">
                  <button
                    type="button"
                    className="dash-day-sheet-main"
                    onClick={() => onOpenPeptide(item.id)}
                  >
                    <i style={{ background: item.color }} aria-hidden />
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.timeOfDay} · {item.doseAmount}
                        {item.doseUnit}
                        {!item.planned ? ' · unplanned log' : ''}
                      </span>
                    </div>
                  </button>
                  <div className="dash-day-sheet-status">
                    <span className={`dash-day-status ${item.logged ? 'is-logged' : 'is-missed'}`}>
                      {item.logged ? 'Logged' : 'Not logged'}
                    </span>
                    {item.logTimes.length > 0 && (
                      <em>{item.logTimes.join(', ')}</em>
                    )}
                    {!item.logged && selectedDay.key === localKey(today) && (
                      <button
                        type="button"
                        className="btn-secondary dash-day-log-btn"
                        onClick={() => {
                          const p = peptides.find((x) => x.id === item.id)
                          if (p) onLog(p)
                        }}
                      >
                        Log
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="dash-cards dash-anim" style={{ animationDelay: '220ms' }}>
        <button
          type="button"
          className="dash-card dash-card-fridge"
          onClick={onOpenFridge}
          aria-label={`Fridge, ${peptides.length} live`}
        >
          <span className="dash-card-fridge-stage">
            <img className="dash-card-fridge-art" src={fridgeCardArt} alt="" />
            <span className="dash-card-fridge-live">
              {peptides.length} live
            </span>
          </span>
        </button>

        <div className="dash-card dash-card-streak">
          <div>
            <strong>Keep it up</strong>
            <span>
              {streak === 0
                ? 'Log a dose to start a streak.'
                : `${streak} day${streak === 1 ? '' : 's'} in a row.`}
            </span>
            <div className="dash-dots" aria-hidden>
              {week.map((day) => (
                <i key={day.key} className={loggedDays.has(day.key) ? 'is-on' : ''} />
              ))}
            </div>
          </div>
          <Trophy />
        </div>
      </div>

      <section
        className="dosed-today dash-anim"
        aria-label="Today's doses"
        style={{ animationDelay: '280ms' }}
      >
        <header className="dosed-today__head">
          <h2 className="dosed-today__title">Today’s Doses</h2>
          <button type="button" className="dosed-today__view-all" onClick={onOpenFridge}>
            View all
          </button>
        </header>

        {due.length === 0 ? (
          <div className="dosed-today__empty">
            <p>Nothing scheduled today. Add a vial to build your plan.</p>
            <button type="button" className="dosed-today__log" onClick={onAdd}>
              Add vial
            </button>
          </div>
        ) : (
          <ul className="dosed-today__list">
            {due.map((p) => {
              const done = loggedToday.has(p.id)
              const confirming = confirmingId === p.id
              return (
                <li
                  key={p.id}
                  className={`dosed-today__row${done ? ' is-logged' : ''}${confirming ? ' is-confirming' : ''}`}
                >
                  <div className="dosed-today__row-body">
                    <div className="dosed-today__row-top">
                      <button
                        type="button"
                        className="dosed-today__name"
                        onClick={() => onOpenPeptide(p.id)}
                      >
                        {p.name || 'Untitled'}
                      </button>
                      <span
                        className={`dosed-today__status${done ? ' is-logged' : ' is-pending'}`}
                      >
                        {done ? 'Logged' : 'Pending'}
                      </span>
                    </div>
                    <div className="dosed-today__meta">
                      <span>
                        {p.doseAmount}
                        {p.doseUnit}
                      </span>
                      <span className="dosed-today__dot" aria-hidden />
                      <span>{p.timeOfDay}</span>
                      <span className="dosed-today__dot" aria-hidden />
                      <span>{drawUpSummary(p)}</span>
                    </div>
                  </div>

                  {confirming ? (
                    <div className="dosed-today__verify" aria-live="polite">
                      <span className="dosed-today__check" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none">
                          <circle className="dosed-today__check-ring" cx="12" cy="12" r="10" />
                          <path
                            className="dosed-today__check-mark"
                            d="M7.5 12.5l3 3 6-6.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span>Dose logged</span>
                    </div>
                  ) : done ? (
                    <div className="dosed-today__logged-bar">
                      <span className="dosed-today__logged-label">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M7.5 12.5l3 3 6-6.5"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Logged
                      </span>
                      <button
                        type="button"
                        className="dosed-today__undo"
                        onClick={() => onUndoLog(p)}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="dosed-today__log"
                      onClick={() => handleLogDose(p)}
                    >
                      Log Dose
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}

function Trophy() {
  return (
    <svg className="dash-trophy" viewBox="0 0 72 72" aria-hidden>
      <path
        d="M22 16h28v8c0 10-6 18-14 20-8-2-14-10-14-20v-8Z"
        fill="currentColor"
      />
      <path d="M22 20H14c0 8 4 12 8 14M50 20h8c0 8-4 12-8 14" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M32 44h8v6h-8zM26 52h20v4H26z" fill="currentColor" opacity="0.75" />
    </svg>
  )
}

function StatIcon({ kind }: { kind: 'vials' | 'check' | 'cal' }) {
  if (kind === 'check') {
    return (
      <img
        className="stat-icon-asset"
        src={checkWeekIcon}
        alt=""
        width={18}
        height={18}
        decoding="async"
        aria-hidden
      />
    )
  }
  if (kind === 'cal') {
    return (
      <img
        className="stat-icon-asset"
        src={calendarDaysIcon}
        alt=""
        width={18}
        height={18}
        decoding="async"
        aria-hidden
      />
    )
  }
  return (
    <img
      className="stat-icon-asset"
      src={fridgeStatIcon}
      alt=""
      width={18}
      height={18}
      decoding="async"
      aria-hidden
    />
  )
}
