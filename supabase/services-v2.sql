-- Run this once in the Supabase Dashboard → SQL Editor, after services.sql.
-- Adds the extra per-service fields editable from the admin Services tab:
-- discount, long description, included steps, benefits, before/after photos,
-- service-specific FAQs, and a second "Trending" badge alongside "Popular".
-- Safe to re-run — every column is added only if it doesn't already exist.

alter table public.services add column if not exists discount_percent integer check (discount_percent between 0 and 100);
alter table public.services add column if not exists long_description text;
alter table public.services add column if not exists included_steps text[] not null default '{}';
alter table public.services add column if not exists benefits text[] not null default '{}';
alter table public.services add column if not exists before_images text[] not null default '{}';
alter table public.services add column if not exists after_images text[] not null default '{}';
alter table public.services add column if not exists faqs jsonb not null default '[]';
alter table public.services add column if not exists trending boolean not null default false;
