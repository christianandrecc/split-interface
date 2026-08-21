-- SPLIT delivery queue guard.
-- Regular updates to an already-sent split sheet should preserve sent metadata
-- without re-queuing contract delivery or re-sending invite notifications.

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
    case when send_requested then 'queued' else 'not_requested' end,
    case when send_requested then coalesce(next_sent_at, now()) else null end,
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
          when send_requested then 'queued'
          else public.split_sheets.contract_delivery_status
        end,
        contract_delivery_requested_at = case
          when send_requested then coalesce(excluded.sent_at, public.split_sheets.contract_delivery_requested_at, now())
          else public.split_sheets.contract_delivery_requested_at
        end,
        contract_delivery_error = case
          when send_requested then null
          else public.split_sheets.contract_delivery_error
        end,
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

  if send_requested then
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
