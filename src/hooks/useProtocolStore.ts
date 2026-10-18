import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, DoseLog, Peptide, Protocol } from '../types'
import {
  clearTrackerDataCloud,
  deleteLogCloud,
  deleteProtocolCloud,
  ensureProfile,
  fetchUserState,
  insertLogCloud,
  upsertPeptideCloud,
  upsertProtocolCloud,
} from '../lib/cloud'
import { newId } from '../lib/id'
import { loadState, normalizeState, saveState } from '../lib/storage'

const id = () => newId()

const emptyState = (): AppState => ({
  peptides: [],
  protocols: [],
  logs: [],
  remindersEnabled: true,
  displayName: 'Your name',
  profilePhoto: null,
})

export function useProtocolStore(opts?: {
  userId?: string | null
  cloud?: boolean
}) {
  const userId = opts?.userId ?? null
  const cloud = Boolean(opts?.cloud && userId)
  const [state, setState] = useState<AppState>(() =>
    cloud ? emptyState() : loadState(),
  )
  const [ready, setReady] = useState(!cloud)
  const [syncError, setSyncError] = useState<string | null>(null)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  useEffect(() => {
    if (!cloud || !userId) {
      setState(loadState())
      setReady(true)
      return
    }

    let alive = true
    setReady(false)
    void (async () => {
      try {
        await ensureProfile(userId)
        const remote = await fetchUserState(userId)
        if (!alive) return
        setState(normalizeState(remote))
        setSyncError(null)
      } catch (err) {
        console.error(err)
        if (alive) setSyncError('Could not load your cloud data.')
      } finally {
        if (alive) setReady(true)
      }
    })()

    return () => {
      alive = false
    }
  }, [cloud, userId])

  useEffect(() => {
    if (cloud) return
    saveState(state)
  }, [state, cloud])

  const livePeptides = useMemo(
    () => state.peptides.filter((p) => p.status === 'live'),
    [state.peptides],
  )

  const archivedPeptides = useMemo(
    () => state.peptides.filter((p) => p.status === 'archived'),
    [state.peptides],
  )

  const upsertPeptide = useCallback(
    (peptide: Peptide) => {
      setState((s) => {
        const i = s.peptides.findIndex((p) => p.id === peptide.id)
        if (i === -1) return { ...s, peptides: [...s.peptides, peptide] }
        const next = [...s.peptides]
        next[i] = peptide
        return { ...s, peptides: next }
      })
      const uid = userIdRef.current
      if (cloud && uid) void upsertPeptideCloud(uid, peptide)
    },
    [cloud],
  )

  const archivePeptide = useCallback(
    (peptideId: string) => {
      setState((s) => {
        const next = s.peptides.map((p) =>
          p.id === peptideId ? { ...p, status: 'archived' as const } : p,
        )
        const updated = next.find((p) => p.id === peptideId)
        const uid = userIdRef.current
        if (cloud && uid && updated) void upsertPeptideCloud(uid, updated)
        return { ...s, peptides: next }
      })
    },
    [cloud],
  )

  const restorePeptide = useCallback(
    (peptideId: string) => {
      setState((s) => {
        const next = s.peptides.map((p) =>
          p.id === peptideId ? { ...p, status: 'live' as const } : p,
        )
        const updated = next.find((p) => p.id === peptideId)
        const uid = userIdRef.current
        if (cloud && uid && updated) void upsertPeptideCloud(uid, updated)
        return { ...s, peptides: next }
      })
    },
    [cloud],
  )

  const logDose = useCallback(
    (peptide: Peptide, site?: string, notes?: string) => {
      const entry: DoseLog = {
        id: id(),
        peptideId: peptide.id,
        peptideName: peptide.name,
        doseAmount: peptide.doseAmount,
        doseUnit: peptide.doseUnit,
        site,
        takenAt: new Date().toISOString(),
        notes,
      }
      setState((s) => {
        const peptides = s.peptides.map((p) => {
          if (p.id !== peptide.id) return p
          const rem =
            p.remainingDoses != null
              ? Math.max(0, p.remainingDoses - 1)
              : p.remainingDoses
          return { ...p, remainingDoses: rem }
        })
        const updated = peptides.find((p) => p.id === peptide.id)
        const uid = userIdRef.current
        if (cloud && uid) {
          void insertLogCloud(uid, entry)
          if (updated) void upsertPeptideCloud(uid, updated)
        }
        return { ...s, logs: [entry, ...s.logs], peptides }
      })
      return entry
    },
    [cloud],
  )

  const undoDoseLog = useCallback(
    (peptideId: string, dayKey?: string) => {
      const key =
        dayKey ??
        (() => {
          const d = new Date()
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}`
        })()

      setState((s) => {
        const idx = s.logs.findIndex((l) => {
          if (l.peptideId !== peptideId) return false
          const t = new Date(l.takenAt)
          const y = t.getFullYear()
          const m = String(t.getMonth() + 1).padStart(2, '0')
          const day = String(t.getDate()).padStart(2, '0')
          return `${y}-${m}-${day}` === key
        })
        if (idx === -1) return s
        const removed = s.logs[idx]
        const logs = [...s.logs]
        logs.splice(idx, 1)
        const peptides = s.peptides.map((p) => {
          if (p.id !== peptideId) return p
          if (p.remainingDoses == null) return p
          return { ...p, remainingDoses: p.remainingDoses + 1 }
        })
        const updated = peptides.find((p) => p.id === peptideId)
        const uid = userIdRef.current
        if (cloud && uid) {
          void deleteLogCloud(removed.id)
          if (updated) void upsertPeptideCloud(uid, updated)
        }
        return { ...s, logs, peptides }
      })
    },
    [cloud],
  )

  const removeLog = useCallback(
    (logId: string) => {
      setState((s) => {
        const entry = s.logs.find((l) => l.id === logId)
        if (!entry) return s
        const peptides = s.peptides.map((p) => {
          if (p.id !== entry.peptideId || p.remainingDoses == null) return p
          return { ...p, remainingDoses: p.remainingDoses + 1 }
        })
        const updated = peptides.find((p) => p.id === entry.peptideId)
        const uid = userIdRef.current
        if (cloud && uid) {
          void deleteLogCloud(logId)
          if (updated) void upsertPeptideCloud(uid, updated)
        }
        return {
          ...s,
          logs: s.logs.filter((l) => l.id !== logId),
          peptides,
        }
      })
    },
    [cloud],
  )

  const setRemindersEnabled = useCallback(
    (remindersEnabled: boolean) => {
      setState((s) => ({ ...s, remindersEnabled }))
      const uid = userIdRef.current
      if (cloud && uid) void ensureProfile(uid, { remindersEnabled })
    },
    [cloud],
  )

  const setDisplayName = useCallback(
    (displayName: string) => {
      setState((s) => ({ ...s, displayName }))
      const uid = userIdRef.current
      if (cloud && uid) void ensureProfile(uid, { displayName })
    },
    [cloud],
  )

  const setProfilePhoto = useCallback(
    (profilePhoto: string | null) => {
      setState((s) => ({ ...s, profilePhoto }))
      const uid = userIdRef.current
      if (cloud && uid) void ensureProfile(uid, { profilePhoto })
    },
    [cloud],
  )

  const createBlankLive = useCallback((): Peptide => {
    const colors = state.peptides.map((p) => p.color)
    const palette = [
      '#2a9d8f',
      '#457b9d',
      '#1d3557',
      '#e9c46a',
      '#f4a261',
      '#6d597a',
      '#4a7c59',
      '#bc6c25',
    ]
    const color = palette.find((c) => !colors.includes(c)) ?? palette[0]
    return {
      id: id(),
      name: '',
      status: 'live',
      vialMg: 5,
      diluentMl: 2,
      doseAmount: 250,
      doseUnit: 'mcg',
      syringeUnits: 100,
      frequency: 'daily',
      timeOfDay: '08:00',
      injectionSites: ['Abdomen'],
      notes: '',
      startedAt: new Date().toISOString(),
      color,
    }
  }, [state.peptides])

  const createProtocol = useCallback(
    (name = 'New protocol') => {
      const proto: Protocol = {
        id: id(),
        name,
        peptideIds: [],
        createdAt: new Date().toISOString(),
      }
      setState((s) => ({ ...s, protocols: [...s.protocols, proto] }))
      const uid = userIdRef.current
      if (cloud && uid) void upsertProtocolCloud(uid, proto)
      return proto
    },
    [cloud],
  )

  const updateProtocol = useCallback(
    (protocol: Protocol) => {
      setState((s) => ({
        ...s,
        protocols: s.protocols.map((p) => (p.id === protocol.id ? protocol : p)),
      }))
      const uid = userIdRef.current
      if (cloud && uid) void upsertProtocolCloud(uid, protocol)
    },
    [cloud],
  )

  const deleteProtocol = useCallback(
    (protocolId: string) => {
      setState((s) => ({
        ...s,
        protocols: s.protocols.filter((p) => p.id !== protocolId),
      }))
      if (cloud) void deleteProtocolCloud(protocolId)
    },
    [cloud],
  )

  const clearTrackerData = useCallback(async () => {
    const uid = userIdRef.current
    setState((s) => ({
      ...s,
      peptides: [],
      protocols: [],
      logs: [],
    }))
    if (cloud && uid) {
      await clearTrackerDataCloud(uid)
    }
  }, [cloud])

  const toggleVialInProtocol = useCallback(
    (protocolId: string, peptideId: string) => {
      setState((s) => {
        const protocols = s.protocols.map((p) => {
          if (p.id !== protocolId) return p
          const has = p.peptideIds.includes(peptideId)
          return {
            ...p,
            peptideIds: has
              ? p.peptideIds.filter((x) => x !== peptideId)
              : [...p.peptideIds, peptideId],
          }
        })
        const updated = protocols.find((p) => p.id === protocolId)
        const uid = userIdRef.current
        if (cloud && uid && updated) void upsertProtocolCloud(uid, updated)
        return { ...s, protocols }
      })
    },
    [cloud],
  )

  return {
    state,
    ready,
    syncError,
    livePeptides,
    archivedPeptides,
    upsertPeptide,
    archivePeptide,
    restorePeptide,
    logDose,
    undoDoseLog,
    removeLog,
    setRemindersEnabled,
    setDisplayName,
    setProfilePhoto,
    createBlankLive,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    clearTrackerData,
    toggleVialInProtocol,
  }
}
