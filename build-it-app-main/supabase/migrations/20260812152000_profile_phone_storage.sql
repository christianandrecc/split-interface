-- SPLIT profile phone storage cleanup.
-- Keeps phone country code and national phone number in separate profile columns.

alter table public.profiles
  add column if not exists phone_country_code text;

create or replace function public.split_invite_digits(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

update public.profiles
set phone_number = trim(regexp_replace(phone_number, '^\+\d+\s+', ''))
where phone_country_code is not null
  and phone_number is not null
  and phone_number ~ '^\+\d+\s+';

create index if not exists profiles_phone_full_digits_lookup_idx
  on public.profiles ((public.split_invite_digits(coalesce(phone_country_code, '') || ' ' || coalesce(phone_number, ''))))
  where phone_number is not null and phone_number <> '';

create or replace function public.resolve_split_invite_user_id(
  invite_username text,
  invite_email text,
  invite_phone text,
  invite_value text,
  invite_method text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profile.user_id
  from public.profiles profile
  where (
    invite_method = 'username'
    and nullif(trim(both '@' from coalesce(invite_username, invite_value, '')), '') is not null
    and lower(profile.username) = lower(trim(both '@' from coalesce(invite_username, invite_value, '')))
  )
  or (
    invite_method = 'email'
    and nullif(coalesce(invite_email, invite_value, ''), '') is not null
    and lower(profile.email) = lower(coalesce(invite_email, invite_value, ''))
  )
  or (
    invite_method = 'phone'
    and length(public.split_invite_digits(coalesce(invite_phone, invite_value, ''))) >= 7
    and (
      public.split_invite_digits(coalesce(profile.phone_country_code, '') || ' ' || coalesce(profile.phone_number, '')) = public.split_invite_digits(coalesce(invite_phone, invite_value, ''))
      or public.split_invite_digits(profile.phone_number) = public.split_invite_digits(coalesce(invite_phone, invite_value, ''))
      or right(public.split_invite_digits(coalesce(profile.phone_country_code, '') || ' ' || coalesce(profile.phone_number, '')), 10) = right(public.split_invite_digits(coalesce(invite_phone, invite_value, '')), 10)
    )
  )
  order by profile.updated_at desc
  limit 1;
$$;

revoke all on function public.resolve_split_invite_user_id(text, text, text, text, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_payload jsonb := coalesce(new.raw_user_meta_data -> 'profile_data', '{}'::jsonb);
  metadata_phone_country_code text := nullif(new.raw_user_meta_data ->> 'phone_country_code', '');
  metadata_phone_number text := nullif(new.raw_user_meta_data ->> 'phone_number', '');
begin
  insert into public.profiles (
    user_id,
    phone_country_code,
    phone_number,
    email,
    username,
    display_name,
    profile_data
  )
  values (
    new.id,
    metadata_phone_country_code,
    coalesce(metadata_phone_number, new.phone),
    coalesce(nullif(new.raw_user_meta_data ->> 'email', ''), new.email),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    profile_payload
  )
  on conflict (user_id) do update
    set phone_country_code = coalesce(excluded.phone_country_code, public.profiles.phone_country_code),
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
        email = coalesce(excluded.email, public.profiles.email),
        username = coalesce(public.profiles.username, excluded.username),
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
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

create or replace function public.link_pending_split_invites_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.split_sheet_collaborators collaborator
    set collaborator_user_id = new.user_id,
        updated_at = now()
  where collaborator.collaborator_user_id is null
    and collaborator.invite_method <> 'creator'
    and (
      (
        collaborator.username is not null
        and new.username is not null
        and lower(collaborator.username) = lower(new.username)
      )
      or (
        collaborator.invite_email is not null
        and new.email is not null
        and lower(collaborator.invite_email) = lower(new.email)
      )
      or (
        length(public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, ''))) >= 7
        and length(public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, ''))) >= 7
        and (
          public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, '')) = public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, ''))
          or right(public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, '')), 10) = right(public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, '')), 10)
        )
      )
    );

  return new;
end;
$$;

drop trigger if exists link_pending_split_invites_for_profile on public.profiles;
create trigger link_pending_split_invites_for_profile
  after insert or update of username, email, phone_number, phone_country_code
  on public.profiles
  for each row
  execute function public.link_pending_split_invites_for_profile();
