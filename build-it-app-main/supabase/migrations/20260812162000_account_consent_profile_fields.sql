-- SPLIT account consent and registration profile fields.
-- Non-destructive: adds consent columns and updates the existing auth profile trigger.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists privacy_policy_version text;

create index if not exists profiles_terms_accepted_at_idx
  on public.profiles (terms_accepted_at)
  where terms_accepted_at is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_phone_country_code text := nullif(new.raw_user_meta_data ->> 'phone_country_code', '');
  metadata_phone_number text := nullif(new.raw_user_meta_data ->> 'phone_number', '');
  metadata_terms_accepted_at text := nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '');
  metadata_privacy_acknowledged_at text := nullif(new.raw_user_meta_data ->> 'privacy_acknowledged_at', '');
begin
  insert into public.profiles (
    user_id,
    phone_country_code,
    phone_number,
    email,
    username,
    display_name,
    legal_name,
    role_tags,
    pro_affiliation,
    ipi_number,
    custom_pro_name,
    publishing_status,
    terms_accepted_at,
    terms_version,
    privacy_acknowledged_at,
    privacy_policy_version,
    profile_data
  )
  values (
    new.id,
    metadata_phone_country_code,
    coalesce(metadata_phone_number, new.phone),
    coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'legal_name', ''),
    nullif(new.raw_user_meta_data ->> 'role_tags', ''),
    nullif(new.raw_user_meta_data ->> 'pro_affiliation', ''),
    nullif(new.raw_user_meta_data ->> 'ipi_number', ''),
    nullif(new.raw_user_meta_data ->> 'custom_pro_name', ''),
    nullif(new.raw_user_meta_data ->> 'publishing_status', ''),
    metadata_terms_accepted_at::timestamptz,
    nullif(new.raw_user_meta_data ->> 'terms_version', ''),
    metadata_privacy_acknowledged_at::timestamptz,
    nullif(new.raw_user_meta_data ->> 'privacy_policy_version', ''),
    jsonb_strip_nulls(jsonb_build_object(
      'username', nullif(new.raw_user_meta_data ->> 'username', ''),
      'displayName', nullif(new.raw_user_meta_data ->> 'display_name', ''),
      'legalName', nullif(new.raw_user_meta_data ->> 'legal_name', ''),
      'roleTags', nullif(new.raw_user_meta_data ->> 'role_tags', ''),
      'proAffiliation', nullif(new.raw_user_meta_data ->> 'pro_affiliation', ''),
      'ipiNumber', nullif(new.raw_user_meta_data ->> 'ipi_number', ''),
      'customProName', nullif(new.raw_user_meta_data ->> 'custom_pro_name', ''),
      'publishingStatus', nullif(new.raw_user_meta_data ->> 'publishing_status', ''),
      'emailAddress', coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
      'phoneCountryCode', metadata_phone_country_code,
      'phoneNumber', metadata_phone_number,
      'termsAcceptedAt', metadata_terms_accepted_at,
      'termsVersion', nullif(new.raw_user_meta_data ->> 'terms_version', ''),
      'privacyAcknowledgedAt', metadata_privacy_acknowledged_at,
      'privacyPolicyVersion', nullif(new.raw_user_meta_data ->> 'privacy_policy_version', '')
    ))
  )
  on conflict (user_id) do update
    set phone_country_code = coalesce(excluded.phone_country_code, public.profiles.phone_country_code),
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
        email = coalesce(excluded.email, public.profiles.email),
        username = coalesce(public.profiles.username, excluded.username),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        legal_name = coalesce(excluded.legal_name, public.profiles.legal_name),
        role_tags = coalesce(excluded.role_tags, public.profiles.role_tags),
        pro_affiliation = coalesce(excluded.pro_affiliation, public.profiles.pro_affiliation),
        ipi_number = coalesce(excluded.ipi_number, public.profiles.ipi_number),
        custom_pro_name = coalesce(excluded.custom_pro_name, public.profiles.custom_pro_name),
        publishing_status = coalesce(excluded.publishing_status, public.profiles.publishing_status),
        terms_accepted_at = coalesce(excluded.terms_accepted_at, public.profiles.terms_accepted_at),
        terms_version = coalesce(excluded.terms_version, public.profiles.terms_version),
        privacy_acknowledged_at = coalesce(excluded.privacy_acknowledged_at, public.profiles.privacy_acknowledged_at),
        privacy_policy_version = coalesce(excluded.privacy_policy_version, public.profiles.privacy_policy_version),
        profile_data = case
          when excluded.profile_data = '{}'::jsonb then public.profiles.profile_data
          else excluded.profile_data
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
