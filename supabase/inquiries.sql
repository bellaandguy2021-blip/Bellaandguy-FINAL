-- Run this once in the Supabase Dashboard → SQL Editor.
-- Mirrors the RLS pattern used by the existing `appointments` / `contacts` tables:
-- anonymous visitors can INSERT (the public inquiry form), only logged-in staff
-- (authenticated role) can read/update/delete (the admin panel).

create table if not exists public.inquiries (
  id                 bigint generated always as identity primary key,
  full_name          text not null,
  phone              text not null,
  email              text,
  gender             text,
  service            text,
  preferred_contact  text not null default 'Phone Call',
  message            text,
  status             text not null default 'New',
  created_at         timestamptz not null default now(),
  inquiry_type       text not null default 'service', -- 'service' (Ask About This Service) or 'franchise' (Franchise Enquiry)
  budget             text                              -- franchise enquiries only: investment budget range
);

alter table public.inquiries enable row level security;

create policy "Anyone can submit an inquiry"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

create policy "Staff can view inquiries"
  on public.inquiries for select
  to authenticated
  using (true);

create policy "Staff can update inquiries"
  on public.inquiries for update
  to authenticated
  using (true);

create policy "Staff can delete inquiries"
  on public.inquiries for delete
  to authenticated
  using (true);

-- Optional but recommended: powers the admin panel's realtime "new inquiry" toast.
alter publication supabase_realtime add table public.inquiries;
