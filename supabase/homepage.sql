-- Run this once in the Supabase Dashboard → SQL Editor.
-- Powers the admin panel's "Homepage" tab: staff can add/edit/delete/reorder/hide
-- Why Choose Us cards, Testimonials, Gallery photos, and FAQs — all currently
-- hardcoded in the site's components. Reads are public (the live homepage reads
-- from here); writes are staff-only, same pattern as settings.sql / services.sql.
--
-- Additive: if a table here has zero rows (not run yet, or admin hasn't added
-- anything), the site falls back to its existing hardcoded content — nothing
-- breaks before the admin touches this screen.

create table if not exists public.homepage_features (
  id           bigint generated always as identity primary key,
  icon         text not null default '✨',   -- single emoji, same UX as service category icons
  title        text not null,
  description  text not null default '',
  badge        text,                          -- small corner label, e.g. "100% Safe"
  visible      boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.testimonials (
  id           bigint generated always as identity primary key,
  name         text not null,
  location     text,
  service      text,
  review       text not null,
  rating       integer not null default 5 check (rating between 1 and 5),
  initials     text,
  photo        text,                          -- Storage URL, optional (falls back to initials avatar)
  visible      boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id           bigint generated always as identity primary key,
  src          text not null,                 -- Storage URL
  label        text,
  sub          text,
  visible      boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.faqs (
  id           bigint generated always as identity primary key,
  question     text not null,
  answer       text not null,
  visible      boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.homepage_features enable row level security;
alter table public.testimonials       enable row level security;
alter table public.gallery_images     enable row level security;
alter table public.faqs               enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['homepage_features', 'testimonials', 'gallery_images', 'faqs']
  loop
    execute format('drop policy if exists "Anyone can view %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "Staff can insert %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "Staff can update %1$s" on public.%1$s;', t);
    execute format('drop policy if exists "Staff can delete %1$s" on public.%1$s;', t);
    execute format('create policy "Anyone can view %1$s" on public.%1$s for select to anon, authenticated using (true);', t);
    execute format('create policy "Staff can insert %1$s" on public.%1$s for insert to authenticated with check (true);', t);
    execute format('create policy "Staff can update %1$s" on public.%1$s for update to authenticated using (true);', t);
    execute format('create policy "Staff can delete %1$s" on public.%1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- Storage bucket for homepage images (hero background, gallery photos, testimonial photos).
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view site images" on storage.objects;
drop policy if exists "Staff can upload site images" on storage.objects;
drop policy if exists "Staff can delete site images" on storage.objects;

create policy "Anyone can view site images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-images');
create policy "Staff can upload site images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images');
create policy "Staff can delete site images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-images');
