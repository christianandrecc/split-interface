-- SPLIT beta profile storage.
-- Safe to run on a fresh project or on top of the earlier profiles table.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  phone_number text,
  legal_name text,
  stage_name text,
  ipi_number text,
  pro_affiliation text,
  publisher_name text,
  tax_id text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  address_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists profile_image_url text,
  add column if not exists role_tags text,
  add column if not exists social_instagram text,
  add column if not exists social_tiktok text,
  add column if not exists social_x text,
  add column if not exists social_website text,
  add column if not exists profile_location text,
  add column if not exists profile_visibility text,
  add column if not exists legal_first_name text,
  add column if not exists legal_middle_name text,
  add column if not exists legal_last_name text,
  add column if not exists pka_names text,
  add column if not exists phone_country_code text,
  add column if not exists legal_address text,
  add column if not exists address_line text,
  add column if not exists zip_code text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists mlc_number text,
  add column if not exists custom_pro_name text,
  add column if not exists publishing_status text,
  add column if not exists publisher_ipi text,
  add column if not exists publisher_pro text,
  add column if not exists publishing_share text,
  add column if not exists admin_company_name text,
  add column if not exists admin_ipi text,
  add column if not exists admin_collection_share text,
  add column if not exists publisher_contact text,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and username <> '';

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    phone_number,
    email,
    username,
    display_name
  )
  values (
    new.id,
    new.phone,
    new.email,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (user_id) do update
    set phone_number = excluded.phone_number,
        email = excluded.email,
        username = coalesce(public.profiles.username, excluded.username),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at_column();
