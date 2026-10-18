-- ============================================================
-- COPY ALL OF THIS into Supabase → SQL Editor → New query → Run
-- Safe to run more than once.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Your name',
  profile_photo text,
  reminders_enabled boolean not null default true,
  theme text not null default 'dark' check (theme in ('light', 'dark')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create table if not exists public.peptides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  status text not null default 'live' check (status in ('live', 'archived')),
  vial_mg double precision not null default 5,
  diluent_ml double precision not null default 2,
  dose_amount double precision not null default 250,
  dose_unit text not null default 'mcg' check (dose_unit in ('mcg', 'mg', 'iu')),
  syringe_units integer not null default 100 check (syringe_units in (30, 50, 100)),
  frequency text not null default 'daily'
    check (frequency in ('daily', 'eod', 'twice_weekly', 'weekly', 'custom')),
  custom_schedule text,
  time_of_day text not null default '08:00',
  injection_sites jsonb not null default '["Abdomen"]'::jsonb,
  notes text not null default '',
  remaining_doses integer,
  started_at timestamptz not null default now(),
  color text not null default '#2a9d8f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peptides_user_id_idx on public.peptides (user_id);
alter table public.peptides enable row level security;

drop policy if exists "peptides_select_own" on public.peptides;
drop policy if exists "peptides_insert_own" on public.peptides;
drop policy if exists "peptides_update_own" on public.peptides;
drop policy if exists "peptides_delete_own" on public.peptides;

create policy "peptides_select_own" on public.peptides for select using (auth.uid() = user_id);
create policy "peptides_insert_own" on public.peptides for insert with check (auth.uid() = user_id);
create policy "peptides_update_own" on public.peptides for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "peptides_delete_own" on public.peptides for delete using (auth.uid() = user_id);

create table if not exists public.protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'New protocol',
  created_at timestamptz not null default now()
);

create index if not exists protocols_user_id_idx on public.protocols (user_id);
alter table public.protocols enable row level security;

drop policy if exists "protocols_select_own" on public.protocols;
drop policy if exists "protocols_insert_own" on public.protocols;
drop policy if exists "protocols_update_own" on public.protocols;
drop policy if exists "protocols_delete_own" on public.protocols;

create policy "protocols_select_own" on public.protocols for select using (auth.uid() = user_id);
create policy "protocols_insert_own" on public.protocols for insert with check (auth.uid() = user_id);
create policy "protocols_update_own" on public.protocols for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "protocols_delete_own" on public.protocols for delete using (auth.uid() = user_id);

create table if not exists public.protocol_peptides (
  protocol_id uuid not null references public.protocols (id) on delete cascade,
  peptide_id uuid not null references public.peptides (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (protocol_id, peptide_id)
);

alter table public.protocol_peptides enable row level security;

drop policy if exists "protocol_peptides_select_own" on public.protocol_peptides;
drop policy if exists "protocol_peptides_insert_own" on public.protocol_peptides;
drop policy if exists "protocol_peptides_update_own" on public.protocol_peptides;
drop policy if exists "protocol_peptides_delete_own" on public.protocol_peptides;

create policy "protocol_peptides_select_own" on public.protocol_peptides for select
  using (exists (select 1 from public.protocols p where p.id = protocol_id and p.user_id = auth.uid()));
create policy "protocol_peptides_insert_own" on public.protocol_peptides for insert
  with check (exists (select 1 from public.protocols p where p.id = protocol_id and p.user_id = auth.uid()));
create policy "protocol_peptides_update_own" on public.protocol_peptides for update
  using (exists (select 1 from public.protocols p where p.id = protocol_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.protocols p where p.id = protocol_id and p.user_id = auth.uid()));
create policy "protocol_peptides_delete_own" on public.protocol_peptides for delete
  using (exists (select 1 from public.protocols p where p.id = protocol_id and p.user_id = auth.uid()));

create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  peptide_id uuid references public.peptides (id) on delete set null,
  peptide_name text not null default '',
  dose_amount double precision not null,
  dose_unit text not null check (dose_unit in ('mcg', 'mg', 'iu')),
  site text,
  taken_at timestamptz not null default now(),
  notes text
);

create index if not exists dose_logs_user_id_idx on public.dose_logs (user_id);
create index if not exists dose_logs_taken_at_idx on public.dose_logs (user_id, taken_at desc);
alter table public.dose_logs enable row level security;

drop policy if exists "dose_logs_select_own" on public.dose_logs;
drop policy if exists "dose_logs_insert_own" on public.dose_logs;
drop policy if exists "dose_logs_update_own" on public.dose_logs;
drop policy if exists "dose_logs_delete_own" on public.dose_logs;

create policy "dose_logs_select_own" on public.dose_logs for select using (auth.uid() = user_id);
create policy "dose_logs_insert_own" on public.dose_logs for insert with check (auth.uid() = user_id);
create policy "dose_logs_update_own" on public.dose_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dose_logs_delete_own" on public.dose_logs for delete using (auth.uid() = user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('dose', 'protocol', 'streak', 'stock', 'system')),
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  read boolean not null default false,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Your name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
