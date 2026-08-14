-- SPLIT split-sheet account isolation.
-- Prevent deleted collaborator accounts from being reattached to a new account
-- that happens to reuse the same email, phone number, or username.

do $$
declare
  existing_fk_name text;
begin
  select c.conname
    into existing_fk_name
  from pg_constraint c
  join pg_attribute a
    on a.attrelid = c.conrelid
   and a.attnum = any(c.conkey)
  where c.conrelid = 'public.split_sheet_collaborators'::regclass
    and c.contype = 'f'
    and a.attname = 'collaborator_user_id'
  limit 1;

  if existing_fk_name is not null then
    execute format(
      'alter table public.split_sheet_collaborators drop constraint if exists %I',
      existing_fk_name
    );
  end if;

  alter table public.split_sheet_collaborators
    add constraint split_sheet_collaborators_collaborator_user_id_fkey
    foreign key (collaborator_user_id)
    references auth.users(id)
    on delete cascade;
end $$;

create or replace function public.set_split_collaborator_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_method = 'creator' and new.collaborator_user_id is null then
    select sheet.creator_user_id
      into new.collaborator_user_id
    from public.split_sheets sheet
    where sheet.id = new.split_sheet_id;
  end if;

  if new.invite_method <> 'creator'
    and new.collaborator_user_id is null
    and new.invite_status = 'Pending'
    and new.approval_status = 'Pending'
    and new.signature_status = 'Pending'
    and new.responded_at is null
    and new.signed_at is null
  then
    new.collaborator_user_id = public.resolve_split_invite_user_id(
      new.username,
      new.invite_email,
      new.invite_phone,
      new.invite_value,
      new.invite_method
    );
  end if;

  return new;
end;
$$;

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
    and collaborator.invite_status = 'Pending'
    and collaborator.approval_status = 'Pending'
    and collaborator.signature_status = 'Pending'
    and collaborator.responded_at is null
    and collaborator.signed_at is null
    and (
      (
        collaborator.username is not null
        and new.username is not null
        and lower(trim(both '@' from collaborator.username)) = lower(trim(both '@' from new.username))
      )
      or (
        coalesce(collaborator.invite_email, collaborator.invite_value) is not null
        and new.email is not null
        and lower(coalesce(collaborator.invite_email, collaborator.invite_value)) = lower(new.email)
      )
      or (
        length(public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, ''))) >= 7
        and length(public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, ''))) >= 7
        and (
          public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, '')) =
            public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, ''))
          or right(public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, '')), 10) =
            right(public.split_invite_digits(coalesce(new.phone_country_code, '') || ' ' || coalesce(new.phone_number, '')), 10)
        )
      )
    );

  return new;
end;
$$;

create or replace function public.resolve_split_sheet_collaborators(p_split_sheet_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_count integer := 0;
begin
  if not (select public.is_split_sheet_creator(p_split_sheet_id)) then
    raise exception 'Only the split-sheet creator can resolve collaborators.';
  end if;

  update public.split_sheet_collaborators collaborator
    set collaborator_user_id = public.resolve_split_invite_user_id(
          collaborator.username,
          collaborator.invite_email,
          collaborator.invite_phone,
          collaborator.invite_value,
          collaborator.invite_method
        ),
        updated_at = now()
  where collaborator.split_sheet_id = p_split_sheet_id
    and collaborator.invite_method <> 'creator'
    and collaborator.collaborator_user_id is null
    and collaborator.invite_status = 'Pending'
    and collaborator.approval_status = 'Pending'
    and collaborator.signature_status = 'Pending'
    and collaborator.responded_at is null
    and collaborator.signed_at is null
    and public.resolve_split_invite_user_id(
          collaborator.username,
          collaborator.invite_email,
          collaborator.invite_phone,
          collaborator.invite_value,
          collaborator.invite_method
        ) is not null;

  get diagnostics resolved_count = row_count;
  return resolved_count;
end;
$$;

grant execute on function public.resolve_split_sheet_collaborators(uuid) to authenticated;

create or replace function public.resolve_all_pending_split_sheet_collaborators()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_count integer := 0;
begin
  update public.split_sheet_collaborators collaborator
    set collaborator_user_id = public.resolve_split_invite_user_id(
          collaborator.username,
          collaborator.invite_email,
          collaborator.invite_phone,
          collaborator.invite_value,
          collaborator.invite_method
        ),
        updated_at = now()
  where collaborator.collaborator_user_id is null
    and collaborator.invite_method <> 'creator'
    and collaborator.invite_status = 'Pending'
    and collaborator.approval_status = 'Pending'
    and collaborator.signature_status = 'Pending'
    and collaborator.responded_at is null
    and collaborator.signed_at is null
    and public.resolve_split_invite_user_id(
          collaborator.username,
          collaborator.invite_email,
          collaborator.invite_phone,
          collaborator.invite_value,
          collaborator.invite_method
        ) is not null;

  get diagnostics resolved_count = row_count;

  update public.split_sheet_collaborators collaborator
    set collaborator_user_id = sheet.creator_user_id,
        updated_at = now()
  from public.split_sheets sheet
  where collaborator.split_sheet_id = sheet.id
    and collaborator.invite_method = 'creator'
    and collaborator.collaborator_user_id is null;

  return resolved_count;
end;
$$;

grant execute on function public.resolve_all_pending_split_sheet_collaborators() to authenticated;
