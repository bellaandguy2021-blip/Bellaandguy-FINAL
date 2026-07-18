-- Run this once in the Supabase Dashboard → SQL Editor.
-- Powers the admin panel's "Services" tab: staff can add/edit/delete service
-- categories and individual services, including uploading multiple images per
-- service. Reads are public (the live site's Services browser, booking page,
-- and cart all read from here); writes are staff-only, same pattern as
-- settings.sql / inquiries.sql.
--
-- This is additive — it does NOT touch or replace the existing hardcoded
-- catalog in lib/servicesData.ts. Services created here appear alongside the
-- existing ones on the site (own categories, own cards, fully bookable).

create table if not exists public.service_categories (
  id            text primary key,               -- slug, e.g. "hair-treatments"
  label         text not null,
  description   text not null default '',
  icon          text not null default '✨',       -- single emoji shown on the category tile
  color         text not null default '#f5f5f5',
  gender        text not null default 'both' check (gender in ('female','male','both')),
  home_service  boolean not null default true,
  images        text[] not null default '{}',    -- category banner/gallery images (Storage URLs)
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.services (
  id            bigint generated always as identity primary key,
  category_id   text not null references public.service_categories(id) on delete cascade,
  name          text not null,
  price         integer not null default 0,
  duration      text,                            -- free text, e.g. "45 mins"
  group_name    text,                             -- optional sub-group label (e.g. "Full Legs")
  description   text,
  popular       boolean not null default false,
  images        text[] not null default '{}',    -- Storage URLs, first one is the card thumbnail
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.service_categories enable row level security;
alter table public.services enable row level security;

create policy "Anyone can view service categories"
  on public.service_categories for select
  to anon, authenticated
  using (true);
create policy "Staff can insert service categories"
  on public.service_categories for insert
  to authenticated
  with check (true);
create policy "Staff can update service categories"
  on public.service_categories for update
  to authenticated
  using (true);
create policy "Staff can delete service categories"
  on public.service_categories for delete
  to authenticated
  using (true);

create policy "Anyone can view services"
  on public.services for select
  to anon, authenticated
  using (true);
create policy "Staff can insert services"
  on public.services for insert
  to authenticated
  with check (true);
create policy "Staff can update services"
  on public.services for update
  to authenticated
  using (true);
create policy "Staff can delete services"
  on public.services for delete
  to authenticated
  using (true);

-- Storage bucket for service/category images uploaded from the admin panel.
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

create policy "Anyone can view service images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'service-images');
create policy "Staff can upload service images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'service-images');
create policy "Staff can delete service images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'service-images');
