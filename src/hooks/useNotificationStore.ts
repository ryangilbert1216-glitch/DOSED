import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteNotificationCloud,
  fetchNotifications,
  insertNotificationCloud,
  markAllNotificationsReadCloud,
  updateNotificationCloud,
} from '../lib/cloud'
import { newId } from '../lib/id'
import type { AppNotification, DoseLog, NotificationKind, Peptide, Protocol } from '../types'

const KEY = 'dosed-notifications-v1'
const DEDUPE_KEY = 'dosed-notif-dedupe-v1'

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppNotification[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n) => n && typeof n.id === 'string' && typeof n.title === 'string')
      .map((n) => ({
        ...n,
        kind: (n.kind ?? 'system') as NotificationKind,
        read: Boolean(n.read),
        createdAt: n.createdAt || new Date().toISOString(),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return []
  }
}

function loadDedupe(): Set<string> {
  try {
    const raw = localStorage.getItem(DEDUPE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr.slice(-200) : [])
  } catch {
    return new Set()
  }
}

function localDayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function streakDays(logs: DoseLog[]) {
  const days = new Set(logs.map((l) => localDayKey(new Date(l.takenAt))))
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!days.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(localDayKey(cursor))) return 0
  }
  let count = 0
  while (days.has(localDayKey(cursor))) {
    count += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function useNotificationStore(opts?: {
  userId?: string | null
  cloud?: boolean
}) {
  const userId = opts?.userId ?? null
  const cloud = Boolean(opts?.cloud && userId)
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    cloud ? [] : loadNotifications(),
  )
  const dedupe = useRef<Set<string>>(loadDedupe())
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  useEffect(() => {
    if (!cloud || !userId) {
      setNotifications(loadNotifications())
      return
    }
    let alive = true
    void fetchNotifications(userId).then((list) => {
      if (alive) setNotifications(list)
    })
    return () => {
      alive = false
    }
  }, [cloud, userId])

  useEffect(() => {
    if (cloud) return
    localStorage.setItem(KEY, JSON.stringify(notifications.slice(0, 80)))
  }, [notifications, cloud])

  const persistDedupe = useCallback(() => {
    localStorage.setItem(DEDUPE_KEY, JSON.stringify([...dedupe.current].slice(-200)))
  }, [])

  const push = useCallback(
    (input: {
      kind: NotificationKind
      title: string
      body: string
      dedupeKey?: string
      meta?: AppNotification['meta']
    }) => {
      if (input.dedupeKey) {
        if (dedupe.current.has(input.dedupeKey)) return null
        dedupe.current.add(input.dedupeKey)
        persistDedupe()
      }
      const entry: AppNotification = {
        id: newId(),
        kind: input.kind,
        title: input.title,
        body: input.body,
        createdAt: new Date().toISOString(),
        read: false,
        meta: input.meta,
      }
      setNotifications((list) => [entry, ...list].slice(0, 80))
      const uid = userIdRef.current
      if (cloud && uid) void insertNotificationCloud(uid, entry)
      return entry
    },
    [cloud, persistDedupe],
  )

  const markRead = useCallback(
    (notifId: string) => {
      setNotifications((list) =>
        list.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
      )
      if (cloud) void updateNotificationCloud(notifId, { read: true })
    },
    [cloud],
  )

  const markAllRead = useCallback(() => {
    setNotifications((list) => list.map((n) => (n.read ? n : { ...n, read: true })))
    const uid = userIdRef.current
    if (cloud && uid) void markAllNotificationsReadCloud(uid)
  }, [cloud])

  const dismiss = useCallback(
    (notifId: string) => {
      setNotifications((list) => list.filter((n) => n.id !== notifId))
      if (cloud) void deleteNotificationCloud(notifId)
    },
    [cloud],
  )

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  return {
    notifications,
    unreadCount,
    push,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
  }
}

/** Generate contextual in-app alerts from live protocol state (stock, streak, welcome). */
export function useNotificationInsights(opts: {
  livePeptides: Peptide[]
  protocols: Protocol[]
  logs: DoseLog[]
  displayName: string
  push: ReturnType<typeof useNotificationStore>['push']
}) {
  const { livePeptides, protocols, logs, displayName, push } = opts
  const booted = useRef(false)

  useEffect(() => {
    const day = localDayKey()

    for (const p of livePeptides) {
      if (p.remainingDoses == null) continue
      if (p.remainingDoses > 3) continue
      push({
        kind: 'stock',
        title: p.remainingDoses <= 0 ? 'Vial empty' : 'Running low',
        body:
          p.remainingDoses <= 0
            ? `${p.name || 'Untitled'} has no doses left — restock when you can.`
            : `${p.name || 'Untitled'} has about ${p.remainingDoses} dose${p.remainingDoses === 1 ? '' : 's'} left.`,
        dedupeKey: `stock:${p.id}:${day}:${p.remainingDoses <= 0 ? 'empty' : 'low'}`,
        meta: { peptideId: p.id },
      })
    }

    const streak = streakDays(logs)
    for (const milestone of [3, 7, 14, 30]) {
      if (streak < milestone) continue
      push({
        kind: 'streak',
        title: `${milestone}-day streak`,
        body:
          milestone >= 14
            ? 'Consistency is compounding. Keep the rhythm going.'
            : 'Nice run — log today’s dose to keep it alive.',
        dedupeKey: `streak:${milestone}:${day}`,
      })
    }

    if (!booted.current) {
      booted.current = true
      if (livePeptides.length > 0) {
        const name =
          displayName?.trim() && displayName !== 'Your name' ? displayName.trim() : null
        push({
          kind: 'system',
          title: name ? `Welcome back, ${name}` : 'Notifications are live',
          body: 'Dose reminders, stock alerts, and streak wins will show up here.',
          dedupeKey: `welcome:${day}`,
        })
      }
      if (protocols.length > 0) {
        const latest = [...protocols].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        )[0]
        const created = new Date(latest.createdAt).getTime()
        if (Date.now() - created < 1000 * 60 * 60 * 24) {
          push({
            kind: 'protocol',
            title: 'Protocol ready',
            body: `${latest.name || 'Untitled'} is set with ${latest.peptideIds.length} vial${latest.peptideIds.length === 1 ? '' : 's'}.`,
            dedupeKey: `protocol:${latest.id}`,
            meta: { protocolId: latest.id },
          })
        }
      }
    }
  }, [displayName, livePeptides, logs, protocols, push])
}
