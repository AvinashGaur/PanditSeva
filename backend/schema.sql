-- ============================================================================
-- PanditSeva.in — Supabase schema (Postgres + RLS + Storage)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS / OR REPLACE).
-- Money is stored in paise (integer) to avoid float errors.
-- ============================================================================

-- ---------- profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        text not null default 'user' check (role in ('user','admin','astrologer')),
  created_at  timestamptz not null default now()
);

-- Role helpers. SECURITY DEFINER so policies on other tables can call them
-- without recursing into profiles' own RLS.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_staff() returns boolean   -- admin or astrologer
language sql stable security definer set search_path = public as
$$ select coalesce((select role in ('admin','astrologer') from public.profiles where id = auth.uid()), false) $$;

-- auto-create a profile when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_staff on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_select_own   on public.profiles for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles for select using (public.is_staff());
-- users may edit their own name/phone but can NEVER change their own role
create policy profiles_update_own   on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());
create policy profiles_update_admin on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ---------- jy_content (admin-managed content, key -> JSON) ----------
-- keys used by the site: pricing, astrologer, site_content,
--   panchang_note_YYYY-MM-DD, faladesh_override_YYYY-MM-DD,
--   rashifal_override_YYYY-MM-DD_<0-11>, babynames_extra
-- admin_only = true hides a row from the public (default false: publicly readable).
create table if not exists public.jy_content (
  key         text primary key,
  value       jsonb not null,
  admin_only  boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);
create or replace function public.jy_content_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();   -- never trust a client-supplied value
  return new;
end $$;
drop trigger if exists jy_content_touch on public.jy_content;
create trigger jy_content_touch before insert or update on public.jy_content
  for each row execute function public.jy_content_touch();

alter table public.jy_content enable row level security;
drop policy if exists jy_content_read   on public.jy_content;
drop policy if exists jy_content_insert on public.jy_content;
drop policy if exists jy_content_update on public.jy_content;
drop policy if exists jy_content_delete on public.jy_content;
create policy jy_content_read   on public.jy_content for select using (not admin_only or public.is_admin());
create policy jy_content_insert on public.jy_content for insert with check (public.is_admin());
create policy jy_content_update on public.jy_content for update using (public.is_admin()) with check (public.is_admin());
create policy jy_content_delete on public.jy_content for delete using (public.is_admin());

-- ---------- orders (written ONLY by Edge Functions using the service role) ----------
create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  product              text not null,
  amount_paise         integer not null check (amount_paise > 0),
  currency             text not null default 'INR',
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  status               text not null default 'created' check (status in ('created','paid','failed','refunded')),
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);
create index if not exists orders_user_idx on public.orders(user_id);
alter table public.orders enable row level security;
drop policy if exists orders_select_own   on public.orders;
drop policy if exists orders_select_admin on public.orders;
create policy orders_select_own   on public.orders for select using (user_id = auth.uid());
create policy orders_select_admin on public.orders for select using (public.is_admin());
-- no insert/update/delete policy for clients => only the service role (Edge Functions) can write.

-- ---------- memberships (monthly / yearly) ----------
create table if not exists public.memberships (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  plan                 text not null,                 -- membershipMonthly | membershipYearly | manual
  status               text not null default 'active' check (status in ('active','expired','revoked')),
  valid_until          timestamptz,
  razorpay_payment_id  text,
  updated_at           timestamptz not null default now()
);
alter table public.memberships enable row level security;
drop policy if exists memberships_select_own   on public.memberships;
drop policy if exists memberships_admin_all    on public.memberships;
create policy memberships_select_own on public.memberships for select using (user_id = auth.uid());
create policy memberships_admin_all  on public.memberships for all using (public.is_admin()) with check (public.is_admin());

-- ---------- entitlements (one-time purchases: premiumKundali, kundaliMatching, detailedPdf) ----------
create table if not exists public.entitlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product     text not null,
  order_id    uuid references public.orders(id) on delete set null,
  granted_at  timestamptz not null default now(),
  unique (user_id, order_id)
);
alter table public.entitlements enable row level security;
drop policy if exists entitlements_select_own on public.entitlements;
drop policy if exists entitlements_admin_all  on public.entitlements;
create policy entitlements_select_own on public.entitlements for select using (user_id = auth.uid());
create policy entitlements_admin_all  on public.entitlements for all using (public.is_admin()) with check (public.is_admin());

-- ---------- reports (generated or astrologer-reviewed Kundali / matching reports) ----------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('kundali','matching')),
  input        jsonb not null default '{}'::jsonb,
  status       text not null default 'generated' check (status in ('generated','pending_review','approved')),
  file_path    text,                       -- path inside storage bucket 'reports': <user_id>/<report_id>.pdf
  approved_by  uuid references auth.users(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists reports_user_idx on public.reports(user_id);
alter table public.reports enable row level security;
drop policy if exists reports_select_own   on public.reports;
drop policy if exists reports_insert_own   on public.reports;
drop policy if exists reports_staff_select on public.reports;
drop policy if exists reports_staff_insert on public.reports;
drop policy if exists reports_staff_update on public.reports;
drop policy if exists reports_admin_delete on public.reports;
create policy reports_select_own on public.reports for select using (user_id = auth.uid());
-- a user can only log their own report as 'generated' (cannot self-approve or attach files)
create policy reports_insert_own on public.reports for insert
  with check (user_id = auth.uid() and status = 'generated' and file_path is null and approved_by is null and approved_at is null);
create policy reports_staff_select on public.reports for select using (public.is_staff());
create policy reports_staff_insert on public.reports for insert with check (public.is_staff());
create policy reports_staff_update on public.reports for update using (public.is_staff()) with check (public.is_staff());
create policy reports_admin_delete on public.reports for delete using (public.is_admin());

-- ---------- Storage: private bucket 'reports' ----------
insert into storage.buckets (id, name, public) values ('reports', 'reports', false)
on conflict (id) do nothing;

drop policy if exists reports_obj_staff_all   on storage.objects;
drop policy if exists reports_obj_owner_read  on storage.objects;
create policy reports_obj_staff_all on storage.objects for all
  using (bucket_id = 'reports' and public.is_staff())
  with check (bucket_id = 'reports' and public.is_staff());
-- owners can download their PDF only after an astrologer has approved it
create policy reports_obj_owner_read on storage.objects for select
  using (bucket_id = 'reports' and exists (
    select 1 from public.reports r
    where r.file_path = storage.objects.name and r.user_id = auth.uid() and r.status = 'approved'));

-- ---------- bootstrap the first admin (run manually, once, after you sign up) ----------
-- update public.profiles set role = 'admin' where email = 'you@example.com';
