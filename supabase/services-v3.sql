-- Run this once in the Supabase Dashboard → SQL Editor, after services-v2.sql.
-- Adds the "section" column (e.g. "Japanese Rituals") — a heading shown above
-- a cluster of services within a category, distinct from the smaller per-service
-- "group" badge (e.g. "Kanpeki Pura Labs"). This existed in the original static
-- catalog but was never carried into the database, so any category already
-- imported via the admin panel lost its section headings on import.

alter table public.services add column if not exists section text;

-- One-time backfill: restore "Japanese Rituals" as the section for the 14
-- services that were merged into the Facials category. Safe to re-run.
update public.services set section = 'Japanese Rituals'
where name in (
  'Hydra Shine Facial',
  'Pure Bright Facial',
  'Ivory White (Vitamin C Shine)',
  'Glass Glow Skin Facial',
  'Bridal Bright Vitamin C Facial',
  'Blanch (Skin Whitening Facial)',
  'Save the Date (Pre-Wedding)',
  'Papaya & Marshmallow Facial',
  'Jamaican Sorrel Facial',
  'Quinoa Whitening Facial',
  'Avocado Glow & Shine Facial',
  'Luxe Chocolate Whitening Facial',
  'Raw Mango Acne Purification',
  'Gasmara Facial (6-Phase)'
);
