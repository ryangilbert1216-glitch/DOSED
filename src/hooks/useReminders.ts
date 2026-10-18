import { useEffect, useRef } from 'react'
import type { Peptide } from '../types'

declare global {
  interface Window {
    peptideDesktop?: {
      notify: (title: string, body: string) => Promise<boolean>
    }
  }
}

function todayKey(peptideId: string, timeOfDay: string) {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${peptideId}-${timeOfDay}`
}

type DoseDueHandler = (peptide: Peptide) => void

export function useReminders(
  live: Peptide[],
  enabled: boolean,
  onDoseDue?: DoseDueHandler,
) {
  const fired = useRef<Set<string>>(new Set())
  const onDoseDueRef = useRef(onDoseDue)
  onDoseDueRef.current = onDoseDue

  useEffect(() => {
    if (!enabled) return

    const tick = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const current = `${hh}:${mm}`

      for (const p of live) {
        if (p.timeOfDay !== current) continue
        const key = todayKey(p.id, p.timeOfDay)
        if (fired.current.has(key)) continue
        fired.current.add(key)

        const title = 'Dose due'
        const body = `${p.name || 'Untitled'} — ${p.doseAmount}${p.doseUnit} at ${p.timeOfDay}`

        onDoseDueRef.current?.(p)

        if (window.peptideDesktop?.notify) {
          void window.peptideDesktop.notify(title, body)
        } else if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(title, { body })
          } else if (Notification.permission !== 'denied') {
            void Notification.requestPermission().then((perm) => {
              if (perm === 'granted') new Notification(title, { body })
            })
          }
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 20_000)
    return () => window.clearInterval(id)
  }, [live, enabled])
}
