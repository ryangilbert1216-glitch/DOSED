export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type PeptideRow = {
  id: string
  user_id: string
  name: string
  status: 'live' | 'archived'
  vial_mg: number
  diluent_ml: number
  dose_amount: number
  dose_unit: 'mcg' | 'mg' | 'iu'
  syringe_units: 30 | 50 | 100
  frequency: 'daily' | 'eod' | 'twice_weekly' | 'weekly' | 'custom'
  custom_schedule: string | null
  time_of_day: string
  injection_sites: Json
  notes: string
  remaining_doses: number | null
  started_at: string
  color: string
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  display_name: string
  profile_photo: string | null
  reminders_enabled: boolean
  theme: 'light' | 'dark'
  onboarded: boolean
  created_at: string
  updated_at: string
}

type ProtocolRow = {
  id: string
  user_id: string
  name: string
  created_at: string
}

type ProtocolPeptideRow = {
  protocol_id: string
  peptide_id: string
  sort_order: number
}

type DoseLogRow = {
  id: string
  user_id: string
  peptide_id: string | null
  peptide_name: string
  dose_amount: number
  dose_unit: 'mcg' | 'mg' | 'iu'
  site: string | null
  taken_at: string
  notes: string | null
}

type NotificationRow = {
  id: string
  user_id: string
  kind: 'dose' | 'protocol' | 'streak' | 'stock' | 'system'
  title: string
  body: string
  created_at: string
  read: boolean
  meta: Json
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: {
          id: string
          display_name?: string
          profile_photo?: string | null
          reminders_enabled?: boolean
          theme?: 'light' | 'dark'
          onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          profile_photo?: string | null
          reminders_enabled?: boolean
          theme?: 'light' | 'dark'
          onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      peptides: {
        Row: PeptideRow
        Insert: {
          id?: string
          user_id: string
          name?: string
          status?: 'live' | 'archived'
          vial_mg?: number
          diluent_ml?: number
          dose_amount?: number
          dose_unit?: 'mcg' | 'mg' | 'iu'
          syringe_units?: 30 | 50 | 100
          frequency?: 'daily' | 'eod' | 'twice_weekly' | 'weekly' | 'custom'
          custom_schedule?: string | null
          time_of_day?: string
          injection_sites?: Json
          notes?: string
          remaining_doses?: number | null
          started_at?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<PeptideRow>
        Relationships: []
      }
      protocols: {
        Row: ProtocolRow
        Insert: {
          id?: string
          user_id: string
          name?: string
          created_at?: string
        }
        Update: Partial<ProtocolRow>
        Relationships: []
      }
      protocol_peptides: {
        Row: ProtocolPeptideRow
        Insert: {
          protocol_id: string
          peptide_id: string
          sort_order?: number
        }
        Update: Partial<ProtocolPeptideRow>
        Relationships: []
      }
      dose_logs: {
        Row: DoseLogRow
        Insert: {
          id?: string
          user_id: string
          peptide_id?: string | null
          peptide_name?: string
          dose_amount: number
          dose_unit: 'mcg' | 'mg' | 'iu'
          site?: string | null
          taken_at?: string
          notes?: string | null
        }
        Update: Partial<DoseLogRow>
        Relationships: []
      }
      notifications: {
        Row: NotificationRow
        Insert: {
          id?: string
          user_id: string
          kind: 'dose' | 'protocol' | 'streak' | 'stock' | 'system'
          title: string
          body?: string
          created_at?: string
          read?: boolean
          meta?: Json
        }
        Update: Partial<NotificationRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
