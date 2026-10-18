import type {
  AppNotification,
  AppState,
  DoseLog,
  Peptide,
  Protocol,
} from '../types'
import { supabase } from './supabase'
import type { Database, Json } from './database.types'

type PeptideRow = Database['public']['Tables']['peptides']['Row']
type ProtocolRow = Database['public']['Tables']['protocols']['Row']
type LogRow = Database['public']['Tables']['dose_logs']['Row']
type NotifRow = Database['public']['Tables']['notifications']['Row']

function sitesFromJson(value: Json): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === 'string')
  }
  return ['Abdomen']
}

function peptideFromRow(row: PeptideRow): Peptide {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    vialMg: row.vial_mg,
    diluentMl: row.diluent_ml,
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit,
    syringeUnits: row.syringe_units,
    frequency: row.frequency,
    customSchedule: row.custom_schedule ?? undefined,
    timeOfDay: row.time_of_day,
    injectionSites: sitesFromJson(row.injection_sites),
    notes: row.notes,
    remainingDoses: row.remaining_doses ?? undefined,
    startedAt: row.started_at,
    color: row.color,
  }
}

function peptideToRow(userId: string, p: Peptide) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    status: p.status,
    vial_mg: p.vialMg,
    diluent_ml: p.diluentMl,
    dose_amount: p.doseAmount,
    dose_unit: p.doseUnit,
    syringe_units: p.syringeUnits,
    frequency: p.frequency,
    custom_schedule: p.customSchedule ?? null,
    time_of_day: p.timeOfDay,
    injection_sites: p.injectionSites as Json,
    notes: p.notes,
    remaining_doses: p.remainingDoses ?? null,
    started_at: p.startedAt,
    color: p.color,
    updated_at: new Date().toISOString(),
  }
}

function logFromRow(row: LogRow): DoseLog {
  return {
    id: row.id,
    peptideId: row.peptide_id ?? '',
    peptideName: row.peptide_name,
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit,
    site: row.site ?? undefined,
    takenAt: row.taken_at,
    notes: row.notes ?? undefined,
  }
}

function notifFromRow(row: NotifRow): AppNotification {
  const meta = (row.meta ?? {}) as AppNotification['meta']
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read,
    meta,
  }
}

export async function fetchUserState(userId: string): Promise<AppState> {
  if (!supabase) throw new Error('Supabase not configured')

  const [profileRes, peptidesRes, protocolsRes, linksRes, logsRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('peptides').select('*').eq('user_id', userId),
      supabase.from('protocols').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('protocol_peptides').select('*'),
      supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', userId)
        .order('taken_at', { ascending: false })
        .limit(200),
    ])

  if (profileRes.error) throw profileRes.error
  if (peptidesRes.error) throw peptidesRes.error
  if (protocolsRes.error) throw protocolsRes.error
  if (linksRes.error) throw linksRes.error
  if (logsRes.error) throw logsRes.error

  const links = linksRes.data ?? []
  const protocols: Protocol[] = (protocolsRes.data as ProtocolRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
    peptideIds: links
      .filter((l) => l.protocol_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.peptide_id),
  }))

  const profile = profileRes.data

  return {
    peptides: ((peptidesRes.data as PeptideRow[]) ?? []).map(peptideFromRow),
    protocols,
    logs: ((logsRes.data as LogRow[]) ?? []).map(logFromRow),
    remindersEnabled: profile?.reminders_enabled ?? true,
    displayName: profile?.display_name ?? 'Your name',
    profilePhoto: profile?.profile_photo ?? null,
  }
}

export async function ensureProfile(
  userId: string,
  patch?: {
    displayName?: string
    remindersEnabled?: boolean
    theme?: 'light' | 'dark'
    onboarded?: boolean
    profilePhoto?: string | null
  },
) {
  if (!supabase) return
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!data) {
    await supabase.from('profiles').insert({
      id: userId,
      display_name: patch?.displayName ?? 'Your name',
      reminders_enabled: patch?.remindersEnabled ?? true,
      theme: patch?.theme ?? 'dark',
      onboarded: patch?.onboarded ?? false,
      profile_photo: patch?.profilePhoto ?? null,
    })
    return
  }
  if (!patch) return
  await supabase
    .from('profiles')
    .update({
      ...(patch.displayName != null ? { display_name: patch.displayName } : {}),
      ...(patch.remindersEnabled != null
        ? { reminders_enabled: patch.remindersEnabled }
        : {}),
      ...(patch.theme != null ? { theme: patch.theme } : {}),
      ...(patch.onboarded != null ? { onboarded: patch.onboarded } : {}),
      ...(patch.profilePhoto !== undefined
        ? { profile_photo: patch.profilePhoto }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

export async function upsertPeptideCloud(userId: string, peptide: Peptide) {
  if (!supabase) return
  const { error } = await supabase
    .from('peptides')
    .upsert(peptideToRow(userId, peptide), { onConflict: 'id' })
  if (error) console.error('upsertPeptide', error)
}

export async function deletePeptideCloud(peptideId: string) {
  if (!supabase) return
  await supabase.from('peptides').delete().eq('id', peptideId)
}

export async function upsertProtocolCloud(userId: string, protocol: Protocol) {
  if (!supabase) return
  const { error } = await supabase.from('protocols').upsert({
    id: protocol.id,
    user_id: userId,
    name: protocol.name,
    created_at: protocol.createdAt,
  })
  if (error) {
    console.error('upsertProtocol', error)
    return
  }
  await supabase.from('protocol_peptides').delete().eq('protocol_id', protocol.id)
  if (protocol.peptideIds.length === 0) return
  const rows = protocol.peptideIds.map((peptideId, sort_order) => ({
    protocol_id: protocol.id,
    peptide_id: peptideId,
    sort_order,
  }))
  const { error: linkErr } = await supabase.from('protocol_peptides').insert(rows)
  if (linkErr) console.error('protocol_peptides', linkErr)
}

export async function deleteProtocolCloud(protocolId: string) {
  if (!supabase) return
  await supabase.from('protocols').delete().eq('id', protocolId)
}

/** Wipe vials, protocols, and dose history — keeps profile (name, photo, reminders). */
export async function clearTrackerDataCloud(userId: string) {
  if (!supabase) return
  const results = await Promise.all([
    supabase.from('dose_logs').delete().eq('user_id', userId),
    supabase.from('protocols').delete().eq('user_id', userId),
    supabase.from('peptides').delete().eq('user_id', userId),
    supabase.from('notifications').delete().eq('user_id', userId),
  ])
  for (const res of results) {
    if (res.error) {
      console.error('clearTrackerData', res.error)
      throw res.error
    }
  }
}

export async function insertLogCloud(userId: string, log: DoseLog) {
  if (!supabase) return
  const { error } = await supabase.from('dose_logs').insert({
    id: log.id,
    user_id: userId,
    peptide_id: log.peptideId || null,
    peptide_name: log.peptideName,
    dose_amount: log.doseAmount,
    dose_unit: log.doseUnit,
    site: log.site ?? null,
    taken_at: log.takenAt,
    notes: log.notes ?? null,
  })
  if (error) console.error('insertLog', error)
}

export async function deleteLogCloud(logId: string) {
  if (!supabase) return
  await supabase.from('dose_logs').delete().eq('id', logId)
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)
  if (error) {
    console.error('fetchNotifications', error)
    return []
  }
  return ((data as NotifRow[]) ?? []).map(notifFromRow)
}

export async function insertNotificationCloud(
  userId: string,
  n: AppNotification,
) {
  if (!supabase) return
  await supabase.from('notifications').upsert({
    id: n.id,
    user_id: userId,
    kind: n.kind,
    title: n.title,
    body: n.body,
    created_at: n.createdAt,
    read: n.read,
    meta: (n.meta ?? {}) as Json,
  })
}

export async function updateNotificationCloud(
  id: string,
  patch: { read?: boolean },
) {
  if (!supabase) return
  await supabase.from('notifications').update(patch).eq('id', id)
}

export async function deleteNotificationCloud(id: string) {
  if (!supabase) return
  await supabase.from('notifications').delete().eq('id', id)
}

export async function markAllNotificationsReadCloud(userId: string) {
  if (!supabase) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function getProfileOnboarded(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', userId)
    .maybeSingle()
  return Boolean(data?.onboarded)
}
