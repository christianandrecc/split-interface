-- SPLIT split-sheet workflow storage.
-- Local approval gate: run in Supabase only after the local preview is approved.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.split_sheets (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist_project_name text,
  work_title text not null,
  status text not null default 'Draft',
  version integer not null default 1,
  current_proposal_id text,
  document_number text not null,
  split_total numeric(6, 2) not null default 100,
  document_payload jsonb not null default '{}'::jsonb,
  contract_delivery_status text not null default 'not_requested',
  contract_delivery_requested_at timestamptz,
  contract_delivery_error text,
  stored_at timestamptz,
  sent_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.split_sheet_collaborators (
  id uuid primary key default gen_random_uuid(),
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  party_id text not null,
  collaborator_user_id uuid references auth.users(id) on delete set null,
  username text,
  invite_email text,
  invite_phone text,
  invite_method text not null default 'username',
  invite_value text,
  display_name text,
  legal_name text,
  role text not null default 'Collaborator',
  percentage numeric(6, 2) not null default 0,
  contribution_categories jsonb not null default '[]'::jsonb,
  contribution_notes text,
  invite_status text not null default 'Pending',
  approval_status text not null default 'Pending',
  signature_status text not null default 'Pending',
  responded_at timestamptz,
  signed_at timestamptz,
  signing_order integer not null default 1,
  profile_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.split_sheet_proposal_versions (
  id text primary key,
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  version_number integer not null,
  proposed_by_user_id uuid references auth.users(id) on delete set null,
  proposed_by_label text not null,
  notes text,
  allocations jsonb not null default '[]'::jsonb,
  total_percentage numeric(6, 2) not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.split_sheet_responses (
  id uuid primary key default gen_random_uuid(),
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  proposal_version_id text references public.split_sheet_proposal_versions(id) on delete cascade,
  collaborator_id uuid references public.split_sheet_collaborators(id) on delete cascade,
  responder_user_id uuid references auth.users(id) on delete set null,
  response_type text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.split_sheet_audit_records (
  id uuid primary key default gen_random_uuid(),
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.split_sheet_contract_deliveries (
  id uuid primary key default gen_random_uuid(),
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  requested_by_label text not null,
  delivery_status text not null default 'queued',
  provider text not null default 'supabase_edge_function_placeholder',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'split_sheets_status_check'
      and conrelid = 'public.split_sheets'::regclass
  ) then
    alter table public.split_sheets
      add constraint split_sheets_status_check
      check (status in (
        'Draft',
        'Pending Collaborator Acceptance',
        'Pending Split Approval',
        'Revision Requested',
        'Ready to Sign',
        'Pending Signatures',
        'Fully Signed',
        'Verified and Stored',
        'Executed',
        'Amended',
        'Disputed',
        'Archived'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'split_sheets_total_check'
      and conrelid = 'public.split_sheets'::regclass
  ) then
    alter table public.split_sheets
      add constraint split_sheets_total_check
      check (split_total = 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'split_sheet_collaborators_percentage_check'
      and conrelid = 'public.split_sheet_collaborators'::regclass
  ) then
    alter table public.split_sheet_collaborators
      add constraint split_sheet_collaborators_percentage_check
      check (percentage >= 0 and percentage <= 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'split_sheet_collaborators_status_check'
      and conrelid = 'public.split_sheet_collaborators'::regclass
  ) then
    alter table public.split_sheet_collaborators
      add constraint split_sheet_collaborators_status_check
      check (
        invite_status in ('Pending', 'Accepted', 'Declined')
        and approval_status in ('Pending', 'Approved', 'Rejected')
        and signature_status in ('Pending', 'Signed')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'split_sheet_responses_type_check'
      and conrelid = 'public.split_sheet_responses'::regclass
  ) then
    alter table public.split_sheet_responses
      add constraint split_sheet_responses_type_check
      check (response_type in ('invite_accept', 'invite_reject', 'split_accept', 'split_reject', 'signature'));
  end if;
end $$;

create unique index if not exists split_sheet_collaborators_party_unique_idx
  on public.split_sheet_collaborators (split_sheet_id, party_id);
create index if not exists split_sheets_creator_user_id_idx on public.split_sheets (creator_user_id);
create index if not exists split_sheets_status_idx on public.split_sheets (status);
create index if not exists split_sheets_updated_at_idx on public.split_sheets (updated_at desc);
create index if not exists split_sheet_collaborators_sheet_id_idx on public.split_sheet_collaborators (split_sheet_id);
create index if not exists split_sheet_collaborators_user_id_idx on public.split_sheet_collaborators (collaborator_user_id);
create index if not exists split_sheet_collaborators_username_idx on public.split_sheet_collaborators (lower(username));
create index if not exists split_sheet_proposals_sheet_id_idx on public.split_sheet_proposal_versions (split_sheet_id);
create index if not exists split_sheet_responses_sheet_id_idx on public.split_sheet_responses (split_sheet_id);
create index if not exists split_sheet_audit_sheet_id_idx on public.split_sheet_audit_records (split_sheet_id);
create index if not exists split_sheet_contract_deliveries_sheet_id_idx on public.split_sheet_contract_deliveries (split_sheet_id);
create index if not exists profiles_email_lookup_idx
  on public.profiles (lower(email))
  where email is not null and email <> '';
create index if not exists profiles_phone_digits_lookup_idx
  on public.profiles ((regexp_replace(coalesce(phone_number, ''), '\D', '', 'g')))
  where phone_number is not null and phone_number <> '';

create or replace function public.split_invite_digits(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g');
$$;

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
    and public.split_invite_digits(profile.phone_number) = public.split_invite_digits(coalesce(invite_phone, invite_value, ''))
  )
  order by profile.updated_at desc
  limit 1;
$$;

revoke all on function public.resolve_split_invite_user_id(text, text, text, text, text) from public, anon, authenticated;

create or replace function public.set_split_collaborator_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_method <> 'creator' and new.collaborator_user_id is null then
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

drop trigger if exists set_split_collaborator_user_id on public.split_sheet_collaborators;
create trigger set_split_collaborator_user_id
  before insert or update of username, invite_email, invite_phone, invite_value, invite_method
  on public.split_sheet_collaborators
  for each row
  execute function public.set_split_collaborator_user_id();

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
        and length(public.split_invite_digits(new.phone_number)) >= 7
        and public.split_invite_digits(coalesce(collaborator.invite_phone, collaborator.invite_value, '')) = public.split_invite_digits(new.phone_number)
      )
    );

  return new;
end;
$$;

drop trigger if exists link_pending_split_invites_for_profile on public.profiles;
create trigger link_pending_split_invites_for_profile
  after insert or update of username, email, phone_number
  on public.profiles
  for each row
  execute function public.link_pending_split_invites_for_profile();

create or replace function public.is_split_sheet_participant(sheet_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.split_sheets sheet
    where sheet.id = sheet_id
      and sheet.creator_user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.split_sheet_collaborators collaborator
    where collaborator.split_sheet_id = sheet_id
      and collaborator.collaborator_user_id = (select auth.uid())
  );
$$;

create or replace function public.is_split_sheet_creator(sheet_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.split_sheets sheet
    where sheet.id = sheet_id
      and sheet.creator_user_id = (select auth.uid())
  );
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

create or replace function public.apply_split_sheet_participant_update(
  p_split_sheet_id uuid,
  p_document_payload jsonb,
  p_action text,
  p_actor_label text default null,
  p_response_type text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  next_status text;
  next_version integer;
  next_current_proposal_id text;
  next_total numeric(6, 2);
  participant_collaborator_id uuid;
  participant_invite_status text;
  response_kind text;
  actor_is_creator boolean := false;
  actor_label text := coalesce(nullif(trim(p_actor_label), ''), 'SPLIT collaborator');
  stored_payload jsonb;
begin
  if current_user_id is null then
    raise exception 'Sign in before responding to a split sheet.';
  end if;

  if not (select public.is_split_sheet_participant(p_split_sheet_id)) then
    raise exception 'You are not a participant on this split sheet.';
  end if;

  if p_action not in ('invite_accept', 'invite_decline', 'split_accept', 'split_reject', 'counter_offer', 'sign') then
    raise exception 'Unsupported split-sheet action.';
  end if;

  if coalesce(p_document_payload ->> 'id', '') <> p_split_sheet_id::text then
    raise exception 'Split sheet payload does not match the requested record.';
  end if;

  select round(coalesce(sum((party ->> 'percent')::numeric), 0), 2)
    into next_total
  from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party;

  if next_total <> 100 then
    raise exception 'Ownership percentages must total exactly 100.';
  end if;

  next_status := coalesce(p_document_payload ->> 'status', 'Draft');
  if next_status not in (
    'Draft',
    'Pending Collaborator Acceptance',
    'Pending Split Approval',
    'Revision Requested',
    'Ready to Sign',
    'Pending Signatures',
    'Fully Signed',
    'Verified and Stored',
    'Executed',
    'Amended',
    'Disputed',
    'Archived'
  ) then
    raise exception 'Unsupported split sheet status.';
  end if;

  next_version := coalesce(nullif(p_document_payload ->> 'version', '')::integer, 1);
  next_current_proposal_id := nullif(p_document_payload ->> 'currentProposalId', '');

  select collaborator.id
       , collaborator.invite_status
    into participant_collaborator_id
       , participant_invite_status
  from public.split_sheet_collaborators collaborator
  where collaborator.split_sheet_id = p_split_sheet_id
    and collaborator.collaborator_user_id = current_user_id
  order by collaborator.created_at
  limit 1;

  select public.is_split_sheet_creator(p_split_sheet_id) into actor_is_creator;

  if not actor_is_creator and participant_collaborator_id is null then
    raise exception 'You are not an invited collaborator on this split sheet.';
  end if;

  if actor_is_creator and p_action in ('invite_accept', 'invite_decline', 'split_accept', 'split_reject', 'counter_offer') then
    raise exception 'Creators can revise or sign, but cannot respond as a collaborator.';
  end if;

  if not actor_is_creator
    and p_action in ('split_accept', 'split_reject', 'counter_offer', 'sign')
    and participant_invite_status <> 'Accepted'
  then
    raise exception 'Accept the collaboration invite before responding to the split.';
  end if;

  update public.split_sheets
    set status = next_status,
        version = next_version,
        current_proposal_id = next_current_proposal_id,
        split_total = next_total,
        document_payload = p_document_payload,
        updated_at = now(),
        stored_at = coalesce(nullif(p_document_payload ->> 'storedAt', '')::timestamptz, stored_at),
        sent_at = coalesce(nullif(p_document_payload ->> 'sentAt', '')::timestamptz, sent_at),
        verified_at = nullif(p_document_payload ->> 'verifiedAt', '')::timestamptz
  where id = p_split_sheet_id;

  if participant_collaborator_id is not null then
    update public.split_sheet_collaborators
      set invite_status = case
            when p_action = 'invite_accept' then 'Accepted'
            when p_action = 'invite_decline' then 'Declined'
            else invite_status
          end,
          approval_status = case
            when p_action = 'split_accept' then 'Approved'
            when p_action in ('split_reject', 'counter_offer') then 'Rejected'
            else approval_status
          end,
          signature_status = case
            when p_action = 'sign' then 'Signed'
            else signature_status
          end,
          responded_at = case
            when p_action in ('invite_accept', 'invite_decline', 'split_accept', 'split_reject', 'counter_offer') then now()
            else responded_at
          end,
          signed_at = case
            when p_action = 'sign' then now()
            else signed_at
          end,
          updated_at = now()
    where id = participant_collaborator_id;
  end if;

  response_kind := coalesce(
    nullif(p_response_type, ''),
    case
      when p_action = 'invite_accept' then 'invite_accept'
      when p_action = 'invite_decline' then 'invite_reject'
      when p_action = 'split_accept' then 'split_accept'
      when p_action in ('split_reject', 'counter_offer') then 'split_reject'
      when p_action = 'sign' then 'signature'
      else 'split_accept'
    end
  );

  insert into public.split_sheet_responses (
    split_sheet_id,
    proposal_version_id,
    collaborator_id,
    responder_user_id,
    response_type,
    notes
  )
  values (
    p_split_sheet_id,
    next_current_proposal_id,
    participant_collaborator_id,
    current_user_id,
    response_kind,
    nullif(p_notes, '')
  );

  insert into public.split_sheet_audit_records (
    split_sheet_id,
    actor_user_id,
    actor_label,
    action,
    metadata
  )
  values (
    p_split_sheet_id,
    current_user_id,
    actor_label,
    p_action,
    jsonb_build_object('status', next_status, 'version', next_version)
  );

  select document_payload
    into stored_payload
  from public.split_sheets
  where id = p_split_sheet_id;

  return stored_payload;
end;
$$;

grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;

alter table public.split_sheets enable row level security;
alter table public.split_sheet_collaborators enable row level security;
alter table public.split_sheet_proposal_versions enable row level security;
alter table public.split_sheet_responses enable row level security;
alter table public.split_sheet_audit_records enable row level security;
alter table public.split_sheet_contract_deliveries enable row level security;

drop policy if exists "split sheets participants can view" on public.split_sheets;
drop policy if exists "split sheet creators can insert" on public.split_sheets;
drop policy if exists "split sheet creators can update" on public.split_sheets;
drop policy if exists "split collaborators participants can view" on public.split_sheet_collaborators;
drop policy if exists "split creators manage collaborators" on public.split_sheet_collaborators;
drop policy if exists "split proposals participants can view" on public.split_sheet_proposal_versions;
drop policy if exists "split creators manage proposals" on public.split_sheet_proposal_versions;
drop policy if exists "split responses participants can view" on public.split_sheet_responses;
drop policy if exists "split participants can respond" on public.split_sheet_responses;
drop policy if exists "split audit participants can view" on public.split_sheet_audit_records;
drop policy if exists "split participants can insert audit" on public.split_sheet_audit_records;
drop policy if exists "split creators manage audit" on public.split_sheet_audit_records;
drop policy if exists "split contract creators can queue delivery" on public.split_sheet_contract_deliveries;
drop policy if exists "split contract creators can view delivery" on public.split_sheet_contract_deliveries;

create policy "split sheets participants can view"
  on public.split_sheets for select
  to authenticated
  using ((select public.is_split_sheet_participant(id)));

create policy "split sheet creators can insert"
  on public.split_sheets for insert
  to authenticated
  with check ((select auth.uid()) = creator_user_id);

create policy "split sheet creators can update"
  on public.split_sheets for update
  to authenticated
  using ((select auth.uid()) = creator_user_id)
  with check ((select auth.uid()) = creator_user_id);

create policy "split collaborators participants can view"
  on public.split_sheet_collaborators for select
  to authenticated
  using ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split creators manage collaborators"
  on public.split_sheet_collaborators for all
  to authenticated
  using ((select public.is_split_sheet_creator(split_sheet_id)))
  with check ((select public.is_split_sheet_creator(split_sheet_id)));

create policy "split proposals participants can view"
  on public.split_sheet_proposal_versions for select
  to authenticated
  using ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split creators manage proposals"
  on public.split_sheet_proposal_versions for all
  to authenticated
  using ((select public.is_split_sheet_creator(split_sheet_id)))
  with check ((select public.is_split_sheet_creator(split_sheet_id)));

create policy "split responses participants can view"
  on public.split_sheet_responses for select
  to authenticated
  using ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split participants can respond"
  on public.split_sheet_responses for insert
  to authenticated
  with check ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split audit participants can view"
  on public.split_sheet_audit_records for select
  to authenticated
  using ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split participants can insert audit"
  on public.split_sheet_audit_records for insert
  to authenticated
  with check ((select public.is_split_sheet_participant(split_sheet_id)));

create policy "split creators manage audit"
  on public.split_sheet_audit_records for all
  to authenticated
  using ((select public.is_split_sheet_creator(split_sheet_id)))
  with check ((select public.is_split_sheet_creator(split_sheet_id)));

create policy "split contract creators can queue delivery"
  on public.split_sheet_contract_deliveries for insert
  to authenticated
  with check ((select public.is_split_sheet_creator(split_sheet_id)));

create policy "split contract creators can view delivery"
  on public.split_sheet_contract_deliveries for select
  to authenticated
  using ((select public.is_split_sheet_creator(split_sheet_id)));

create or replace function public.update_split_sheet_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_split_sheets_updated_at on public.split_sheets;
create trigger update_split_sheets_updated_at
  before update on public.split_sheets
  for each row
  execute function public.update_split_sheet_updated_at();

drop trigger if exists update_split_sheet_collaborators_updated_at on public.split_sheet_collaborators;
create trigger update_split_sheet_collaborators_updated_at
  before update on public.split_sheet_collaborators
  for each row
  execute function public.update_split_sheet_updated_at();

drop trigger if exists update_split_sheet_contract_deliveries_updated_at on public.split_sheet_contract_deliveries;
create trigger update_split_sheet_contract_deliveries_updated_at
  before update on public.split_sheet_contract_deliveries
  for each row
  execute function public.update_split_sheet_updated_at();
