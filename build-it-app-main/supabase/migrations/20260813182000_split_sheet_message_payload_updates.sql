-- SPLIT message payload updates.
-- Lets Messages persist chat-only document payload changes without writing chat payloads
-- into the legal response or audit tables.

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

  if p_action not in ('invite_accept', 'invite_decline', 'split_accept', 'split_reject', 'counter_offer', 'sign', 'local_chat') then
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

  if p_action <> 'local_chat' then
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
  end if;

  select document_payload
    into stored_payload
  from public.split_sheets
  where id = p_split_sheet_id;

  return stored_payload;
end;
$$;

grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;
