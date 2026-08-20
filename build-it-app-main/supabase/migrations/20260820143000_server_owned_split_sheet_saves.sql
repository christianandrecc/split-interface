-- SPLIT server-owned split-sheet saves.
-- Moves creator store/send/update writes behind one authenticated RPC so the browser
-- cannot half-save split-sheet rows, collaborators, proposals, and delivery requests.

delete from public.split_sheet_contract_deliveries delivery
using (
  select
    id,
    row_number() over (partition by split_sheet_id order by created_at desc, id desc) as duplicate_order
  from public.split_sheet_contract_deliveries
) ranked
where delivery.id = ranked.id
  and ranked.duplicate_order > 1;

create unique index if not exists split_sheet_contract_deliveries_sheet_unique_idx
  on public.split_sheet_contract_deliveries (split_sheet_id);

create or replace function public.replace_split_sheet_collaborators_from_payload(
  p_split_sheet_id uuid,
  p_document_payload jsonb,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_proposal_id text := nullif(p_document_payload ->> 'currentProposalId', '');
begin
  delete from public.split_sheet_collaborators collaborator
  where collaborator.split_sheet_id = p_split_sheet_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party
      where party ->> 'id' = collaborator.party_id
    );

  insert into public.split_sheet_collaborators (
    split_sheet_id,
    party_id,
    collaborator_user_id,
    username,
    invite_email,
    invite_phone,
    invite_method,
    invite_value,
    display_name,
    legal_name,
    role,
    percentage,
    contribution_categories,
    contribution_notes,
    invite_status,
    approval_status,
    signature_status,
    responded_at,
    signed_at,
    signing_order,
    profile_snapshot
  )
  select
    p_split_sheet_id,
    party.party_id,
    case when party.is_creator then p_actor_user_id else null end,
    case
      when party.invite_method = 'username' then nullif(trim(both '@' from coalesce(party.invite_value, '')), '')
      else null
    end,
    case
      when party.invite_method = 'email' then nullif(party.invite_value, '')
      else nullif(party.email, '')
    end,
    case
      when party.invite_method = 'phone' then nullif(party.invite_value, '')
      else nullif(party.phone_number, '')
    end,
    case when party.is_creator then 'creator' else coalesce(nullif(party.invite_method, ''), 'username') end,
    nullif(party.invite_value, ''),
    coalesce(
      nullif(party.professional_name, ''),
      nullif(party.legal_name, ''),
      nullif(invite.invite_name, ''),
      nullif(party.invite_value, ''),
      nullif(party.email, ''),
      nullif(party.phone_number, ''),
      'Invited writer'
    ),
    nullif(party.legal_name, ''),
    coalesce(nullif(party.role, ''), 'Collaborator'),
    coalesce(party.percentage, 0),
    coalesce(party.contribution_categories, '[]'::jsonb),
    nullif(party.contribution_notes, ''),
    case when party.is_creator then 'Accepted' else coalesce(invite.invite_status, 'Pending') end,
    coalesce(approval.approval_status, case when party.is_creator then 'Approved' else 'Pending' end),
    coalesce(signature.signature_status, 'Pending'),
    coalesce(invite.responded_at, approval.responded_at),
    signature.signed_at,
    coalesce(party.signing_order, party.ordinal),
    coalesce(invite.profile_snapshot, '{}'::jsonb)
  from (
    select
      party ->> 'id' as party_id,
      row_number() over ()::integer as ordinal,
      coalesce(nullif(party ->> 'isCurrentUser', '')::boolean, false) as is_creator,
      nullif(party ->> 'inviteMethod', '') as invite_method,
      coalesce(
        nullif(party ->> 'inviteValue', ''),
        nullif(party ->> 'email', ''),
        nullif(party ->> 'phoneNumber', ''),
        nullif(party ->> 'splitId', '')
      ) as invite_value,
      nullif(party ->> 'email', '') as email,
      nullif(party ->> 'phoneNumber', '') as phone_number,
      nullif(party ->> 'legalName', '') as legal_name,
      nullif(party ->> 'professionalName', '') as professional_name,
      nullif(party ->> 'role', '') as role,
      nullif(party ->> 'percent', '')::numeric as percentage,
      coalesce(party -> 'contributionCategories', '[]'::jsonb) as contribution_categories,
      nullif(party ->> 'contributionDescription', '') as contribution_notes,
      nullif(party ->> 'signingOrder', '')::integer as signing_order
    from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party
    where nullif(party ->> 'id', '') is not null
  ) party
  left join (
    select
      invite ->> 'id' as invite_id,
      invite ->> 'partyId' as party_id,
      nullif(invite ->> 'name', '') as invite_name,
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
  ) approval on approval.collaborator_id = party.party_id
    or approval.collaborator_id = invite.invite_id
    or (party.is_creator and approval.collaborator_id = 'creator')
  left join (
    select
      signature ->> 'collaboratorId' as collaborator_id,
      nullif(signature ->> 'status', '') as signature_status,
      nullif(signature ->> 'signedAt', '')::timestamptz as signed_at
    from jsonb_array_elements(coalesce(p_document_payload -> 'splitSignatures', '[]'::jsonb)) signature
    where current_proposal_id is null
      or signature ->> 'proposalVersionId' = current_proposal_id
  ) signature on signature.collaborator_id = party.party_id
    or signature.collaborator_id = invite.invite_id
    or (party.is_creator and signature.collaborator_id = 'creator')
  on conflict (split_sheet_id, party_id) do update
    set collaborator_user_id = case
          when excluded.invite_method = 'creator' then excluded.collaborator_user_id
          else coalesce(public.split_sheet_collaborators.collaborator_user_id, excluded.collaborator_user_id)
        end,
        username = excluded.username,
        invite_email = excluded.invite_email,
        invite_phone = excluded.invite_phone,
        invite_method = excluded.invite_method,
        invite_value = excluded.invite_value,
        display_name = excluded.display_name,
        legal_name = excluded.legal_name,
        role = excluded.role,
        percentage = excluded.percentage,
        contribution_categories = excluded.contribution_categories,
        contribution_notes = excluded.contribution_notes,
        invite_status = case
          when public.split_sheet_collaborators.invite_status <> 'Pending' and excluded.invite_status = 'Pending'
            then public.split_sheet_collaborators.invite_status
          else excluded.invite_status
        end,
        approval_status = case
          when public.split_sheet_collaborators.approval_status <> 'Pending' and excluded.approval_status = 'Pending'
            then public.split_sheet_collaborators.approval_status
          else excluded.approval_status
        end,
        signature_status = case
          when public.split_sheet_collaborators.signature_status <> 'Pending' and excluded.signature_status = 'Pending'
            then public.split_sheet_collaborators.signature_status
          else excluded.signature_status
        end,
        responded_at = coalesce(excluded.responded_at, public.split_sheet_collaborators.responded_at),
        signed_at = coalesce(excluded.signed_at, public.split_sheet_collaborators.signed_at),
        signing_order = excluded.signing_order,
        profile_snapshot = case
          when excluded.profile_snapshot = '{}'::jsonb then public.split_sheet_collaborators.profile_snapshot
          else excluded.profile_snapshot
        end,
        updated_at = now();
end;
$$;

revoke all on function public.replace_split_sheet_collaborators_from_payload(uuid, jsonb, uuid) from public, anon, authenticated;

create or replace function public.sync_split_sheet_audit_from_payload(
  p_split_sheet_id uuid,
  p_document_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.split_sheet_audit_records
  where split_sheet_id = p_split_sheet_id;

  insert into public.split_sheet_audit_records (
    split_sheet_id,
    actor_user_id,
    actor_label,
    action,
    metadata,
    created_at
  )
  select
    p_split_sheet_id,
    null,
    coalesce(nullif(entry ->> 'actor', ''), 'SPLIT'),
    case
      when entry ->> 'action' = 'Sent a negotiation message' then 'Sent a message in Messages'
      else coalesce(nullif(entry ->> 'action', ''), 'Updated split sheet')
    end,
    jsonb_build_object('documentVersion', coalesce(nullif(p_document_payload ->> 'version', '')::integer, 1), 'order', ordinal),
    coalesce(nullif(entry ->> 'timestamp', '')::timestamptz, now())
  from jsonb_array_elements(coalesce(p_document_payload -> 'auditTrail', '[]'::jsonb)) with ordinality as audit(entry, ordinal)
  where nullif(entry ->> 'action', '') is not null
    and entry ->> 'action' not like '\_\_splitChatMessages:%';
end;
$$;

revoke all on function public.sync_split_sheet_audit_from_payload(uuid, jsonb) from public, anon, authenticated;

create or replace function public.upsert_split_sheet_document(
  p_document_payload jsonb,
  p_mode text default 'update',
  p_actor_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  sheet_id uuid;
  existing_creator_user_id uuid;
  next_title text;
  next_status text;
  next_version integer;
  next_current_proposal_id text;
  next_total numeric(6, 2);
  next_sent_at timestamptz;
  next_stored_at timestamptz;
  next_verified_at timestamptz;
  send_requested boolean := coalesce(p_mode, '') in ('send', 'contract_delivery');
  collaborator_count integer := 0;
  stored_payload jsonb;
  actor_label text := coalesce(nullif(trim(p_actor_label), ''), 'SPLIT user');
begin
  if current_user_id is null then
    raise exception 'Sign in before saving split sheets to Supabase.';
  end if;

  if coalesce(p_mode, '') not in ('draft', 'send', 'update', 'contract_delivery') then
    raise exception 'Unsupported split sheet save mode.';
  end if;

  if jsonb_typeof(p_document_payload) <> 'object' then
    raise exception 'Split sheet payload must be an object.';
  end if;

  sheet_id := nullif(p_document_payload ->> 'id', '')::uuid;
  if sheet_id is null then
    raise exception 'Split sheet payload is missing an id.';
  end if;

  next_title := coalesce(
    nullif(p_document_payload ->> 'title', ''),
    nullif(p_document_payload #>> '{data,songTitle}', ''),
    'Untitled SPLIT Sheet'
  );
  next_status := coalesce(nullif(p_document_payload ->> 'status', ''), 'Draft');
  next_version := coalesce(nullif(p_document_payload ->> 'version', '')::integer, 1);
  next_current_proposal_id := nullif(p_document_payload ->> 'currentProposalId', '');
  next_sent_at := nullif(p_document_payload ->> 'sentAt', '')::timestamptz;
  next_stored_at := nullif(p_document_payload ->> 'storedAt', '')::timestamptz;
  next_verified_at := nullif(p_document_payload ->> 'verifiedAt', '')::timestamptz;

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

  select round(coalesce(sum(coalesce(nullif(party ->> 'percent', '')::numeric, 0)), 0), 2)
    into next_total
  from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party;

  if next_total <> 100 then
    raise exception 'Ownership percentages must total exactly 100.';
  end if;

  select count(*)
    into collaborator_count
  from jsonb_array_elements(coalesce(p_document_payload #> '{data,parties}', '[]'::jsonb)) party
  where coalesce(nullif(party ->> 'isCurrentUser', '')::boolean, false) = false;

  select creator_user_id
    into existing_creator_user_id
  from public.split_sheets
  where id = sheet_id;

  if existing_creator_user_id is not null and existing_creator_user_id <> current_user_id then
    raise exception 'Only the split-sheet creator can save or send this split sheet.';
  end if;

  insert into public.split_sheets (
    id,
    creator_user_id,
    title,
    artist_project_name,
    work_title,
    status,
    version,
    current_proposal_id,
    document_number,
    split_total,
    document_payload,
    contract_delivery_status,
    contract_delivery_requested_at,
    contract_delivery_error,
    stored_at,
    sent_at,
    verified_at,
    created_at,
    updated_at
  )
  values (
    sheet_id,
    current_user_id,
    next_title,
    nullif(p_document_payload #>> '{data,artistProjectName}', ''),
    coalesce(nullif(p_document_payload #>> '{data,songTitle}', ''), next_title),
    next_status,
    next_version,
    next_current_proposal_id,
    coalesce(nullif(p_document_payload ->> 'documentNumber', ''), 'SPLIT-' || replace(sheet_id::text, '-', '')::text),
    next_total,
    p_document_payload,
    case when send_requested or next_sent_at is not null then 'queued' else 'not_requested' end,
    case when send_requested or next_sent_at is not null then coalesce(next_sent_at, now()) else null end,
    null,
    next_stored_at,
    next_sent_at,
    next_verified_at,
    coalesce(nullif(p_document_payload ->> 'createdAt', '')::timestamptz, now()),
    coalesce(nullif(p_document_payload ->> 'updatedAt', '')::timestamptz, now())
  )
  on conflict (id) do update
    set title = excluded.title,
        artist_project_name = excluded.artist_project_name,
        work_title = excluded.work_title,
        status = excluded.status,
        version = excluded.version,
        current_proposal_id = excluded.current_proposal_id,
        document_number = excluded.document_number,
        split_total = excluded.split_total,
        document_payload = excluded.document_payload,
        contract_delivery_status = case
          when send_requested or excluded.sent_at is not null then 'queued'
          else public.split_sheets.contract_delivery_status
        end,
        contract_delivery_requested_at = case
          when send_requested or excluded.sent_at is not null then coalesce(excluded.sent_at, public.split_sheets.contract_delivery_requested_at, now())
          else public.split_sheets.contract_delivery_requested_at
        end,
        contract_delivery_error = null,
        stored_at = coalesce(excluded.stored_at, public.split_sheets.stored_at),
        sent_at = coalesce(excluded.sent_at, public.split_sheets.sent_at),
        verified_at = excluded.verified_at,
        updated_at = now()
    where public.split_sheets.creator_user_id = current_user_id;

  if not found then
    raise exception 'Only the split-sheet creator can save or send this split sheet.';
  end if;

  perform public.sync_split_sheet_proposals_from_payload(sheet_id, p_document_payload, current_user_id);
  perform public.replace_split_sheet_collaborators_from_payload(sheet_id, p_document_payload, current_user_id);
  perform public.sync_split_sheet_audit_from_payload(sheet_id, p_document_payload);

  if send_requested or next_sent_at is not null then
    perform public.resolve_split_sheet_collaborators(sheet_id);

    insert into public.split_sheet_contract_deliveries (
      split_sheet_id,
      requested_by_user_id,
      requested_by_label,
      delivery_status,
      provider,
      payload
    )
    values (
      sheet_id,
      current_user_id,
      actor_label,
      'queued',
      'supabase_edge_function_placeholder',
      jsonb_build_object(
        'documentNumber', p_document_payload ->> 'documentNumber',
        'title', next_title,
        'collaboratorCount', collaborator_count
      )
    )
    on conflict (split_sheet_id) do update
      set requested_by_user_id = excluded.requested_by_user_id,
          requested_by_label = excluded.requested_by_label,
          delivery_status = 'queued',
          provider = excluded.provider,
          payload = excluded.payload,
          error_message = null,
          updated_at = now();

    perform public.notify_split_sheet_participants(
      sheet_id,
      current_user_id,
      actor_label,
      'split_invite',
      'New split sheet invite',
      actor_label || ' sent "' || next_title || '" for review.',
      'messages',
      jsonb_build_object('status', next_status, 'version', next_version),
      sheet_id::text || ':split_invite:' || coalesce(next_sent_at::text, 'sent'),
      false
    );
  end if;

  select document_payload
    into stored_payload
  from public.split_sheets
  where id = sheet_id;

  return stored_payload;
end;
$$;

grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated;
