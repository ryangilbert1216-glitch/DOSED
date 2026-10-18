import type { AppState, Peptide, Protocol } from '../types'
import { VIAL_COLORS } from '../types'

const KEY = 'peptide-protocol-v1'

const seedLive: Peptide[] = [
  {
    id: 'seed-bpc',
    name: 'BPC-157',
    status: 'live',
    vialMg: 5,
    diluentMl: 2,
    doseAmount: 250,
    doseUnit: 'mcg',
    syringeUnits: 100,
    frequency: 'daily',
    timeOfDay: '08:00',
    injectionSites: ['Abdomen', 'Thigh'],
    notes: 'Morning protocol',
    startedAt: new Date().toISOString(),
    color: VIAL_COLORS[0],
  },
  {
    id: 'seed-tb',
    name: 'TB-500',
    status: 'live',
    vialMg: 5,
    diluentMl: 2,
    doseAmount: 500,
    doseUnit: 'mcg',
    syringeUnits: 100,
    frequency: 'twice_weekly',
    timeOfDay: '20:00',
    injectionSites: ['Abdomen'],
    notes: '',
    startedAt: new Date().toISOString(),
    color: VIAL_COLORS[1],
  },
  {
    id: 'seed-cjc',
    name: 'CJC-1295',
    status: 'live',
    vialMg: 2,
    diluentMl: 1,
    doseAmount: 100,
    doseUnit: 'mcg',
    syringeUnits: 50,
    frequency: 'daily',
    timeOfDay: '21:30',
    injectionSites: ['Abdomen', 'Flank'],
    notes: 'With Ipamorelin',
    startedAt: new Date().toISOString(),
    color: VIAL_COLORS[2],
  },
]

const seedProtocols: Protocol[] = [
  {
    id: 'proto-main',
    name: 'Main stack',
    peptideIds: ['seed-bpc', 'seed-tb', 'seed-cjc'],
    createdAt: new Date().toISOString(),
  },
]

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalizeState(JSON.parse(raw) as AppState)
  } catch {
    /* ignore */
  }
  return {
    peptides: seedLive,
    protocols: seedProtocols,
    logs: [],
    remindersEnabled: true,
    displayName: 'Your name',
    profilePhoto: null,
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function normalizePeptide(p: Peptide): Peptide {
  const size = p.syringeUnits
  const syringeUnits =
    size === 30 || size === 50 || size === 100 ? size : 100
  return { ...p, syringeUnits }
}

function normalizeProtocol(p: Protocol): Protocol {
  return {
    id: p.id,
    name: p.name?.trim() ? p.name : 'Untitled protocol',
    peptideIds: Array.isArray(p.peptideIds) ? p.peptideIds : [],
    createdAt: p.createdAt || new Date().toISOString(),
  }
}

/** Normalize saves that may be missing protocols / syringe fields */
export function normalizeState(raw: AppState): AppState {
  const peptides = (raw.peptides ?? []).map(normalizePeptide)
  let protocols = (raw.protocols ?? []).map(normalizeProtocol)

  if (protocols.length === 0 && peptides.length > 0) {
    protocols = [
      {
        id: 'proto-default',
        name: 'My protocol',
        peptideIds: peptides.filter((p) => p.status === 'live').map((p) => p.id),
        createdAt: new Date().toISOString(),
      },
    ]
  }

  return {
    peptides,
    protocols,
    logs: raw.logs ?? [],
    remindersEnabled: raw.remindersEnabled ?? true,
    displayName: raw.displayName ?? 'Your name',
    profilePhoto: raw.profilePhoto ?? null,
  }
}
