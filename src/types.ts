export type DoseUnit = 'mcg' | 'mg' | 'iu'
export type Frequency =
  | 'daily'
  | 'eod'
  | 'twice_weekly'
  | 'weekly'
  | 'custom'

/** U-100 insulin syringe capacity in units */
export type SyringeSize = 30 | 50 | 100

export interface Peptide {
  id: string
  name: string
  /** Live fridge items only — archived are historical */
  status: 'live' | 'archived'
  vialMg: number
  diluentMl: number
  doseAmount: number
  doseUnit: DoseUnit
  /** Insulin syringe size used for this vial */
  syringeUnits: SyringeSize
  frequency: Frequency
  customSchedule?: string
  timeOfDay: string
  injectionSites: string[]
  notes: string
  remainingDoses?: number
  startedAt: string
  color: string
}

/** Named stack of vials from your inventory */
export interface Protocol {
  id: string
  name: string
  peptideIds: string[]
  createdAt: string
}

export interface DoseLog {
  id: string
  peptideId: string
  peptideName: string
  doseAmount: number
  doseUnit: DoseUnit
  site?: string
  takenAt: string
  notes?: string
}

export type NotificationKind =
  | 'dose'
  | 'protocol'
  | 'streak'
  | 'stock'
  | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
  /** Optional deep-link hint for future actions */
  meta?: {
    peptideId?: string
    protocolId?: string
  }
}

export interface AppState {
  peptides: Peptide[]
  protocols: Protocol[]
  logs: DoseLog[]
  remindersEnabled: boolean
  displayName: string
  /** data URL for local profile photo */
  profilePhoto: string | null
}

export const VIAL_COLORS = [
  '#2a9d8f',
  '#457b9d',
  '#1d3557',
  '#e9c46a',
  '#f4a261',
  '#6d597a',
  '#4a7c59',
  '#bc6c25',
] as const
