-- Run this once in the Supabase Dashboard → SQL Editor.
-- Simple key-value store for the admin panel's Settings tab.
-- Writes are staff-only; reads are public, because the live website
-- (Footer, Contact section) displays these values (salon phone, address, hours).

create table if not exists public.settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Anyone can view settings"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "Staff can insert settings"
  on public.settings for insert
  to authenticated
  with check (true);

create policy "Staff can update settings"
  on public.settings for update
  to authenticated
  using (true);
