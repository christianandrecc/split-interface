-- Deletion uses the same ownership boundary and lock as creator saves.
create function public.delete_split_sheet_draft(
  p_split_sheet_id uuid, p_expected_revision bigint
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  sheet public.split_sheets%rowtype;
begin
  if user_id is null then
    raise exception 'Sign in before deleting drafts.' using errcode = '42501';
  end if;
  if p_split_sheet_id is null then
    raise exception 'A draft id is required.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('split:' || p_split_sheet_id::text, 0));
  select * into sheet from public.split_sheets where id = p_split_sheet_id for update;
  -- An absent row also covers a local-only draft or retry after a lost response.
  if not found then return p_split_sheet_id; end if;
  if sheet.creator_user_id <> user_id then
    raise exception 'Only the creator can delete this draft.' using errcode = '42501';
  end if;
  if sheet.status <> 'Draft' or sheet.sent_at is not null or sheet.verified_at is not null
    or exists (select 1 from jsonb_array_elements(coalesce(sheet.document_payload -> 'splitSignatures', '[]'::jsonb)) s
      where s ->> 'status' = 'Signed' or nullif(s ->> 'signedAt', '') is not null)
    or exists (select 1 from public.split_sheet_responses r
      where r.split_sheet_id = p_split_sheet_id and r.response_type = 'signature')
    or exists (select 1 from public.split_sheet_contract_deliveries d where d.split_sheet_id = p_split_sheet_id) then
    raise exception 'Only unsent, unsigned drafts can be deleted.' using errcode = '55000';
  end if;
  if p_expected_revision is distinct from sheet.server_revision then
    raise exception 'This draft changed. Refresh before deleting it.' using errcode = '40001';
  end if;
  -- Draft-only dependent records are removed by their existing cascading foreign keys.
  delete from public.split_sheets where id = p_split_sheet_id;
  return p_split_sheet_id;
end;
$$;

revoke all on function public.delete_split_sheet_draft(uuid, bigint) from public, anon, authenticated;
grant execute on function public.delete_split_sheet_draft(uuid, bigint) to authenticated;

-- A saved draft deleted in another tab must not be recreated by a stale save/send.
create or replace function public.upsert_split_sheet_document(
  p_document_payload jsonb, p_mode text default 'update', p_actor_label text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  sheet_id uuid;
  sheet public.split_sheets%rowtype;
  profile public.profiles%rowtype;
  doc jsonb;
  parties jsonb;
  party jsonb;
  invites jsonb := '[]';
  allocations jsonb := '[]';
  approvals jsonb := '[]';
  signatures jsonb := '[]';
  proposal_id text := gen_random_uuid()::text;
  participant_id text;
  participant_name text;
  actor text;
  stamp timestamptz := clock_timestamp();
  sending boolean := p_mode in ('send', 'contract_delivery');
  next_status text;
  audit_action text;
begin
  if user_id is null then raise exception 'Sign in before saving split sheets.' using errcode = '42501'; end if;
  if p_mode is null or p_mode not in ('draft', 'send', 'update', 'contract_delivery') then
    raise exception 'Unsupported split sheet save mode.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_document_payload) is distinct from 'object' then
    raise exception 'Split sheet payload must be an object.' using errcode = '22023';
  end if;
  sheet_id := (p_document_payload ->> 'id')::uuid;
  if sheet_id is null then raise exception 'Split sheet id is required.' using errcode = '22023'; end if;
  -- Serialize same-id creation as well as updates; a missing row cannot be row-locked.
  perform pg_advisory_xact_lock(hashtextextended('split:' || sheet_id::text, 0));
  select * into sheet from public.split_sheets where id = sheet_id for update;
  if found then
    if sheet.creator_user_id <> user_id then raise exception 'Only the creator can save this draft.' using errcode = '42501'; end if;
    if sheet.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived') or sheet.verified_at is not null then
      raise exception 'Signed records cannot be changed.' using errcode = '55000';
    end if;
    if sheet.sent_at is not null or sheet.status <> 'Draft' then
      raise exception 'Use Messages actions to update a sent split sheet.' using errcode = '55000';
    end if;
    if (p_document_payload ->> 'serverRevision')::bigint is distinct from sheet.server_revision then
      raise exception 'This split sheet changed. Refresh it before trying again.' using errcode = '40001';
    end if;
  elsif p_document_payload ->> 'serverRevision' is not null then
    raise exception 'This draft no longer exists. Refresh before trying again.' using errcode = '40001';
  end if;
  parties := p_document_payload #> '{data,parties}';
  if jsonb_typeof(parties) is distinct from 'array' or jsonb_array_length(parties) not between 1 and 100 then
    raise exception 'A split sheet needs between 1 and 100 parties.' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(parties) p where p -> 'isCurrentUser' = 'true'::jsonb) <> 1
    or exists (select 1 from jsonb_array_elements(parties) p where jsonb_typeof(p -> 'isCurrentUser') is distinct from 'boolean')
    or exists (select 1 from jsonb_array_elements(parties) p where p ->> 'id' = 'creator' and p -> 'isCurrentUser' <> 'true'::jsonb)
    or exists (select 1 from jsonb_array_elements(parties) p where nullif(p ->> 'id', '') is null)
    or (select count(distinct p ->> 'id') from jsonb_array_elements(parties) p) <> jsonb_array_length(parties) then
    raise exception 'Parties need unique ids and exactly one creator.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(parties) p where jsonb_typeof(p -> 'percent') is distinct from 'number') then
    raise exception 'Ownership percentages must be numbers.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(parties) p where (p ->> 'percent')::numeric not between 0 and 100
    or round((p ->> 'percent')::numeric, 2) <> (p ->> 'percent')::numeric)
    or (select sum((p ->> 'percent')::numeric) from jsonb_array_elements(parties) p) <> 100 then
    raise exception 'Ownership percentages must total exactly 100 with at most two decimals.' using errcode = '22023';
  end if;
  select * into profile from public.profiles where profiles.user_id = auth.uid();
  actor := coalesce(nullif(profile.legal_name, ''), nullif(profile.display_name, ''), nullif(profile.username, ''), 'SPLIT user');
  for party in select value from jsonb_array_elements(parties) loop
    participant_name := coalesce(nullif(party ->> 'professionalName', ''), nullif(party ->> 'legalName', ''), 'Collaborator');
    if party -> 'isCurrentUser' = 'true'::jsonb then
      participant_id := 'creator';
      participant_name := actor;
    else
      if coalesce(party ->> 'inviteMethod', '') not in ('username', 'email', 'phone') or nullif(trim(party ->> 'inviteValue'), '') is null then
        raise exception 'Each collaborator needs a valid invite method and address.' using errcode = '22023';
      end if;
      participant_id := gen_random_uuid()::text;
      invites := invites || jsonb_build_array(jsonb_build_object(
        'id', participant_id, 'partyId', party ->> 'id', 'name', participant_name,
        'inviteMethod', party ->> 'inviteMethod', 'inviteValue', party ->> 'inviteValue', 'status', 'Pending'
      ));
    end if;
    allocations := allocations || jsonb_build_array(jsonb_build_object('partyId', party ->> 'id',
      'name', participant_name, 'role', coalesce(party ->> 'role', 'Collaborator'), 'percentage', party -> 'percent'));
    approvals := approvals || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', gen_random_uuid(), 'proposalVersionId', proposal_id, 'collaboratorId', participant_id,
      'collaboratorName', participant_name, 'status', case when participant_id = 'creator' then 'Approved' else 'Pending' end,
      'respondedAt', case when participant_id = 'creator' then stamp end,
      'responderUserId', case when participant_id = 'creator' then user_id end
    )));
    signatures := signatures || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
      'proposalVersionId', proposal_id, 'collaboratorId', participant_id, 'collaboratorName', participant_name, 'status', 'Pending'));
  end loop;
  next_status := case when not sending then 'Draft' when jsonb_array_length(invites) = 0 then 'Ready to Sign' else 'Pending Collaborator Acceptance' end;
  audit_action := case when sending then 'Sent the split sheet for review' else 'Stored draft in account' end;
  doc := (p_document_payload - array['verifiedAt', 'sentAt', 'storedAt', 'auditTrail']) || jsonb_build_object(
    'title', coalesce(nullif(p_document_payload ->> 'title', ''), nullif(p_document_payload #>> '{data,songTitle}', ''), 'Untitled SPLIT Sheet'),
    'creatorUserId', user_id, 'serverRevision', coalesce(sheet.server_revision, 0) + 1,
    'createdAt', coalesce(sheet.created_at, stamp), 'updatedAt', stamp, 'storedAt', coalesce(sheet.stored_at, stamp),
    'documentNumber', coalesce(sheet.document_number, 'SPLIT-' || to_char(stamp, 'YYYYMMDD') || '-' || upper(left(replace(sheet_id::text, '-', ''), 6))),
    'status', next_status, 'version', 1, 'currentProposalId', proposal_id,
    'creatorProfile', coalesce(p_document_payload -> 'creatorProfile', '{}'::jsonb) || jsonb_build_object(
      'authUserId', user_id, 'legalName', profile.legal_name, 'displayName', profile.display_name, 'username', profile.username),
    'collaboratorInvites', invites, 'splitApprovals', approvals, 'splitSignatures', signatures,
    'splitProposalVersions', jsonb_build_array(jsonb_build_object('id', proposal_id, 'versionNumber', 1,
      'proposedBy', actor, 'proposedByUserId', user_id, 'notes', 'Initial split proposal', 'createdAt', stamp, 'allocations', allocations)),
    'auditTrail', coalesce(sheet.document_payload -> 'auditTrail', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object('timestamp', stamp, 'actor', actor, 'actorUserId', user_id, 'action', audit_action))
  );
  if sending then doc := doc || jsonb_build_object('sentAt', stamp); end if;
  insert into public.split_sheets (id, creator_user_id, title, artist_project_name, work_title, status, version,
    current_proposal_id, document_number, split_total, document_payload, stored_at, sent_at, created_at, updated_at,
    contract_delivery_status, contract_delivery_requested_at, server_revision)
  values (sheet_id, user_id, doc ->> 'title', doc #>> '{data,artistProjectName}', doc #>> '{data,songTitle}', next_status, 1,
    proposal_id, doc ->> 'documentNumber', 100, doc, coalesce(sheet.stored_at, stamp), case when sending then stamp end,
    coalesce(sheet.created_at, stamp), stamp, case when sending then 'queued' else 'not_requested' end,
    case when sending then stamp end, coalesce(sheet.server_revision, 0) + 1)
  on conflict (id) do update set title = excluded.title, artist_project_name = excluded.artist_project_name,
    work_title = excluded.work_title, status = excluded.status, version = excluded.version,
    current_proposal_id = excluded.current_proposal_id, document_number = excluded.document_number,
    split_total = excluded.split_total, document_payload = excluded.document_payload, stored_at = excluded.stored_at,
    sent_at = excluded.sent_at, updated_at = excluded.updated_at, server_revision = excluded.server_revision,
    contract_delivery_status = excluded.contract_delivery_status,
    contract_delivery_requested_at = excluded.contract_delivery_requested_at;
  insert into public.split_sheet_proposal_versions (id, split_sheet_id, version_number, proposed_by_user_id,
    proposed_by_label, notes, allocations, total_percentage, created_at)
  values (proposal_id, sheet_id, 1, user_id, actor, 'Initial split proposal', allocations, 100, stamp);
  -- Draft edits may change invite addresses. Do not retain the old resolved user.
  delete from public.split_sheet_collaborators where split_sheet_id = sheet_id;
  perform public.replace_split_sheet_collaborators_from_payload(sheet_id, doc, user_id);
  if exists (select 1 from public.split_sheet_collaborators c where c.split_sheet_id = sheet_id
    and c.collaborator_user_id is not null group by c.collaborator_user_id having count(*) > 1) then
    raise exception 'Use one party per account on a split sheet.' using errcode = '22023';
  end if;
  insert into public.split_sheet_audit_records (split_sheet_id, actor_user_id, actor_label, action, metadata, created_at)
  values (sheet_id, user_id, actor, audit_action, jsonb_build_object('serverRevision', doc -> 'serverRevision'), stamp);
  if sending then
    perform public.resolve_split_sheet_collaborators(sheet_id);
    insert into public.split_sheet_contract_deliveries (split_sheet_id, requested_by_user_id, requested_by_label, delivery_status, provider, payload)
    values (sheet_id, user_id, actor, 'queued', 'supabase_edge_function_placeholder', jsonb_build_object(
      'documentNumber', doc ->> 'documentNumber', 'title', doc ->> 'title', 'collaboratorCount', jsonb_array_length(invites)))
    on conflict (split_sheet_id) do update set requested_by_user_id = excluded.requested_by_user_id,
      requested_by_label = excluded.requested_by_label, delivery_status = 'queued', payload = excluded.payload,
      error_message = null, updated_at = stamp;
    perform public.notify_split_sheet_participants(sheet_id, user_id, actor, 'split_invite', 'New split sheet invite',
      actor || ' sent "' || (doc ->> 'title') || '" for review.', 'messages', jsonb_build_object('status', next_status, 'version', 1),
      sheet_id::text || ':split_invite:' || stamp::text, false);
  end if;
  return doc;
end;
$$;
