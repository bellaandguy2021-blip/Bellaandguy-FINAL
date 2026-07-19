-- Run this once in the Supabase Dashboard → SQL Editor, after services-v3.sql.
-- Adds a separate photo set for the Men section. Until now a category had one
-- shared "images" list, so changing a photo for men also changed it for women.
-- With this column the admin can manage the two sets independently:
--   images       → shown in the Women section (and used as fallback for Men)
--   images_male  → shown in the Men section when present

alter table public.service_categories add column if not exists images_male text[] not null default '{}';
