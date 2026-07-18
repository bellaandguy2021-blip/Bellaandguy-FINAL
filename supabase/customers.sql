-- Run this once in the Supabase Dashboard → SQL Editor.
-- Powers the admin panel's "Customers" tab. Customer profiles (bookings,
-- inquiries, lifetime spend, favourite service) are computed on the fly from
-- the existing appointments/inquiries tables — this table only stores the
-- extra staff-only bits that don't come from a booking: notes, tags, and
-- blacklist status, keyed by phone number.
--
-- Staff-only end to end: unlike settings/services/homepage tables, nothing
-- here is read by the public website, so even SELECT is restricted to
-- authenticated (staff) users.

create table if not exists public.customers (
  phone       text primary key,
  notes       text not null default '',
  tags        text[] not null default '{}',
  blacklisted boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Staff can view customers" on public.customers;
drop policy if exists "Staff can insert customers" on public.customers;
drop policy if exists "Staff can update customers" on public.customers;
drop policy if exists "Staff can delete customers" on public.customers;

create policy "Staff can view customers"
  on public.customers for select
  to authenticated
  using (true);
create policy "Staff can insert customers"
  on public.customers for insert
  to authenticated
  with check (true);
create policy "Staff can update customers"
  on public.customers for update
  to authenticated
  using (true);
create policy "Staff can delete customers"
  on public.customers for delete
  to authenticated
  using (true);
