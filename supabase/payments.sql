-- Run this once in the Supabase Dashboard → SQL Editor.
-- Adds online-payment tracking columns to the existing appointments table.
-- Safe to re-run — every column is added only if missing.

alter table public.appointments add column if not exists payment_status text not null default 'none';
alter table public.appointments add column if not exists amount_paid numeric not null default 0;
alter table public.appointments add column if not exists razorpay_order_id text;
alter table public.appointments add column if not exists razorpay_payment_id text;

-- payment_status is one of: 'none' (pay at service, current default behaviour),
-- 'partial' (advance paid online, balance due on-site), 'full' (fully paid online).

notify pgrst, 'reload schema';
