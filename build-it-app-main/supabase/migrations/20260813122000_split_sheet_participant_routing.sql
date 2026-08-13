-- SPLIT split-sheet participant routing.
-- Run this after the core split-sheet workflow migration so creators and invited collaborators
-- can both see the same sent split sheet in their own accounts.

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
    nullif(trim(both '@' from coalesce(invite_username, invite_value, '')), '') is not null
    and lower(profile.username) = lower(trim(both '@' from coalesce(invite_username, invite_value, '')))
  )
  or (
    nullif(coalesce(invite_email, invite_value, ''), '') is not null
    and lower(profile.email) = lower(coalesce(invite_email, invite_value, ''))
  )
  or (
    length(public.split_invite_digits(coalesce(invite_phone, invite_value, ''))) >= 7
    and (
      public.split_invite_digits(coalesce(profile.phone_country_code, '') || ' ' || coalesce(profile.phone_number, '')) =
        public.split_invite_digits(coalesce(invite_phone, invite_value, ''))
      or public.split_invite_digits(profile.phone_number) =
        public.split_invite_digits(coalesce(invite_phone, invite_value, ''))
      or right(public.split_invite_digits(coalesce(profile.phone_country_code, '') || ' ' || coalesce(profile.phone_number, '')), 10) =
        right(public.split_invite_digits(coalesce(invite_phone, invite_value, '')), 10)
    )
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
  if new.invite_method = 'creator' and new.collaborator_user_id is null then
    select sheet.creator_user_id
      into new.collaborator_user_id
    from public.split_sheets sheet
    where sheet.id = new.split_sheet_id;
  end if;

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
  before insert or update of username, invite_email, invite_phone, invite_value, invite_method, collaborator_user_id
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

drop trigger if exists link_pending_split_invites_for_profile on public.profiles;
create trigger link_pending_split_invites_for_profile
  after insert or update of username, email, phone_number, phone_country_code
  on public.profiles
  for each row
  execute function public.link_pending_split_invites_for_profile();

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

create or replace function public.sync_split_sheet_proposals_from_payload(
  p_split_sheet_id uuid,
  p_document_payload jsonb,
  p_actor_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.split_sheet_proposal_versions (
    id,
    split_sheet_id,
    version_number,
    proposed_by_user_id,
    proposed_by_label,
    notes,
    allocations,
    total_percentage,
    created_at
  )
  select
    proposal ->> 'id',
    p_split_sheet_id,
    coalesce(nullif(proposal ->> 'versionNumber', '')::integer, 1),
    p_actor_user_id,
    coalesce(nullif(proposal ->> 'proposedBy', ''), 'SPLIT user'),
    nullif(proposal ->> 'notes', ''),
    coalesce(proposal -> 'allocations', '[]'::jsonb),
    (
      select round(coalesce(sum((allocation ->> 'percentage')::numeric), 0), 2)
      from jsonb_array_elements(coalesce(proposal -> 'allocations', '[]'::jsonb)) allocation
    ),
    coalesce(nullif(proposal ->> 'createdAt', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_document_payload -> 'splitProposalVersions', '[]'::jsonb)) proposal
  where nullif(proposal ->> 'id', '') is not null
  on conflict (id) do update
    set version_number = excluded.version_number,
        proposed_by_label = excluded.proposed_by_label,
        notes = excluded.notes,
        allocations = excluded.allocations,
        total_percentage = excluded.total_percentage;
end;
$$;

revoke all on function public.sync_split_sheet_proposals_from_payload(uuid, jsonb, uuid) from public, anon, authenticated;

create or replace function public.sync_split_sheet_collaborators_from_payload(
  p_split_sheet_id uuid,
  p_document_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_proposal_id text := nullif(p_document_payload ->> 'currentProposalId', '');
begin
  update public.split_sheet_collaborators collaborator
    set invite_status = coalesce(invite.invite_status, collaborator.invite_status),
        approval_status = coalesce(approval.approval_status, collaborator.approval_status),
        signature_status = coalesce(signature.signature_status, collaborator.signature_status),
        responded_at = coalesce(invite.responded_at, approval.responded_at, collaborator.responded_at),
        signed_at = coalesce(signature.signed_at, collaborator.signed_at),
        percentage = coalesce(party.percentage, collaborator.percentage),
        role = coalesce(party.role, collaborator.role),
        contribution_categories = coalesce(party.contribution_categories, collaborator.contribution_categories),
        contribution_notes = coalesce(party.contribution_notes, collaborator.contribution_notes),
        profile_snapshot = coalesce(invite.profile_snapshot, collaborator.profile_snapshot),
        updated_at = now()
  from (
    select
      party ->> 'id' as party_id,
      nullif(party ->> 'role', '') as role,
      nullif(party ->> 'contributionDescription', '') as contribution_notes,
      coalesce(party -> 'contributionCategories', '[]'::jsonb) as contribution_categories,
      nullif(party ->> 'percent', '')::numeric as percentage,
      coalesce(nullif(party ->> 'isCurrentUser', '')::boolean, false) as is_creator
    from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party
  ) party
  left join (
    select
      invite ->> 'id' as invite_id,
      invite ->> 'partyId' as party_id,
      nullif(invite ->> 'status', '') as invite_status,
      nullif(invite ->> 'respondedAt', '')::timestamptz as responded_at,
      coalesce(invite -> 'profileSnapshot', '{}'::jsonb) as profile_snapshot
    from jsonb_array_elements(coalesce(p_document_payload -> 'collaboratorInvites', '[]'::jsonb)) invite
  ) invite on invite.party_id = party.party_id
  left join (
    select
      approval ->> 'collaboratorId' as collaborator_id,
      nullif(approval ->> 'status', '') as approval_status,
      nullif(approval ->> 'respondedAt', '')::timestamptz as responded_at
    from jsonb_array_elements(coalesce(p_document_payload -> 'splitApprovals', '[]'::jsonb)) approval
    where current_proposal_id is null
      or approval ->> 'proposalVersionId' = current_proposal_id
  ) approval on approval.collaborator_id = coalesce(invite.party_id, 'creator')
    or approval.collaborator_id = case when party.is_creator then 'creator' else invite.invite_id end
  left join (
    select
      signature ->> 'collaboratorId' as collaborator_id,
      nullif(signature ->> 'status', '') as signature_status,
      nullif(signature ->> 'signedAt', '')::timestamptz as signed_at
    from jsonb_array_elements(coalesce(p_document_payload -> 'splitSignatures', '[]'::jsonb)) signature
    where current_proposal_id is null
      or signature ->> 'proposalVersionId' = current_proposal_id
  ) signature on signature.collaborator_id = coalesce(invite.party_id, 'creator')
    or signature.collaborator_id = case when party.is_creator then 'creator' else invite.invite_id end
  where collaborator.split_sheet_id = p_split_sheet_id
    and collaborator.party_id = party.party_id;
end;
$$;

revoke all on function public.sync_split_sheet_collaborators_from_payload(uuid, jsonb) from public, anon, authenticated;

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

  perform public.sync_split_sheet_proposals_from_payload(p_split_sheet_id, p_document_payload, current_user_id);

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

  perform public.sync_split_sheet_collaborators_from_payload(p_split_sheet_id, p_document_payload);

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

create or replace function public.load_my_split_sheets()
returns table (
  id uuid,
  updated_at timestamptz,
  document_payload jsonb
)
language sql
security definer
set search_path = public
as $$
  select sheet.id, sheet.updated_at, sheet.document_payload
  from public.split_sheets sheet
  where sheet.creator_user_id = (select auth.uid())
    or exists (
      select 1
      from public.split_sheet_collaborators collaborator
      where collaborator.split_sheet_id = sheet.id
        and collaborator.collaborator_user_id = (select auth.uid())
        and (sheet.status <> 'Draft' or sheet.sent_at is not null)
    )
  order by sheet.updated_at desc;
$$;

grant execute on function public.load_my_split_sheets() to authenticated;

select public.resolve_all_pending_split_sheet_collaborators();
