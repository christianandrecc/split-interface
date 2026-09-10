-- Browser payloads are proposals, not authority for signatures or final status.
-- Keep the existing RPC signatures; return canonical state after each action.
alter table public.split_sheets add column server_revision bigint not null default 0;

-- Unfinished records from the older client-authored signing flow need an
-- authenticated acknowledgement. Already-finalized historical records stay intact.
create function public.normalize_pending_split_signatures(p_document jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select p_document || jsonb_build_object('splitSignatures', coalesce((
    select jsonb_agg(case when s ->> 'status' = 'Signed' and nullif(s ->> 'signerUserId', '') is null
      and s ->> 'proposalVersionId' = p_document ->> 'currentProposalId'
      then (s - array['signedAt', 'signatureMethod', 'signerLegalName', 'signerArtistName']) || '{"status":"Pending"}'::jsonb
      else s end order by ordinal)
    from jsonb_array_elements(coalesce(p_document -> 'splitSignatures', '[]')) with ordinality as signatures(s, ordinal)
  ), '[]'::jsonb));
$$;
revoke all on function public.normalize_pending_split_signatures(jsonb) from public, anon, authenticated;

create or replace function public.load_my_split_sheets()
returns table (id uuid, updated_at timestamptz, creator_user_id uuid, document_payload jsonb)
language sql security definer set search_path = '' as $$
  select s.id, s.updated_at, s.creator_user_id,
    (case when s.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived') or s.verified_at is not null
      then s.document_payload else public.normalize_pending_split_signatures(s.document_payload) end)
    || jsonb_build_object('creatorUserId', s.creator_user_id, 'serverRevision', s.server_revision)
  from public.split_sheets s
  where s.creator_user_id = (select auth.uid()) or (
    s.sent_at is not null and exists (
      select 1 from public.split_sheet_collaborators c
      where c.split_sheet_id = s.id and c.collaborator_user_id = (select auth.uid())
    )
  )
  order by s.updated_at desc;
$$;

-- Match table RLS to the RPC: pending invitees cannot read unsent drafts.
create or replace function public.is_split_sheet_participant(sheet_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.split_sheets s where s.id = sheet_id
    and (s.creator_user_id = (select auth.uid()) or (s.sent_at is not null and exists (
      select 1 from public.split_sheet_collaborators c
      where c.split_sheet_id = s.id and c.collaborator_user_id = (select auth.uid())
    )))
  );
$$;

-- Preserve signed document content even if another internal writer is added later.
-- Delivery worker bookkeeping is deliberately outside the protected record.
create function public.protect_final_split_sheet()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived') or old.verified_at is not null then
    if tg_op = 'DELETE' then
      raise exception 'Signed records cannot be deleted.' using errcode = '55000';
    end if;
    if (to_jsonb(new) - array['contract_delivery_status', 'contract_delivery_requested_at', 'contract_delivery_error', 'updated_at'])
      is distinct from
      (to_jsonb(old) - array['contract_delivery_status', 'contract_delivery_requested_at', 'contract_delivery_error', 'updated_at']) then
      raise exception 'Signed records cannot be changed.' using errcode = '55000';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.protect_final_split_sheet() from public, anon, authenticated;
create trigger protect_final_split_sheet before update or delete on public.split_sheets
for each row execute function public.protect_final_split_sheet();

-- Creator saves initialize unsigned drafts. Sent records use action-specific
-- updates below; no save path imports client approval, signature or audit state.
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

create or replace function public.apply_split_sheet_participant_update(
  p_split_sheet_id uuid, p_document_payload jsonb, p_action text,
  p_actor_label text default null, p_response_type text default null, p_notes text default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid := auth.uid();
  sheet public.split_sheets%rowtype;
  collaborator public.split_sheet_collaborators%rowtype;
  member public.split_sheet_collaborators%rowtype;
  profile public.profiles%rowtype;
  doc jsonb;
  participant_id text;
  member_id text;
  proposal_id text;
  actor text;
  legal_name text;
  stamp timestamptz := clock_timestamp();
  audit_action text;
  response_kind text;
  event_type text;
  next_status text;
  proposed_parties jsonb;
  parties jsonb := '[]';
  party jsonb;
  allocation jsonb;
  allocations jsonb := '[]';
  approvals jsonb;
  signatures jsonb;
  invites jsonb;
  current_record jsonb;
  all_accepted boolean := true;
  all_approved boolean := true;
  all_signed boolean := true;
  any_signed boolean := false;
  any_rejected boolean := false;
begin
  if user_id is null then raise exception 'Sign in before responding to a split sheet.' using errcode = '42501'; end if;
  if p_action is null or p_action not in ('invite_accept', 'invite_decline', 'split_accept', 'split_reject', 'counter_offer', 'sign', 'local_chat') then
    raise exception 'Unsupported split-sheet action.' using errcode = '22023';
  end if;
  select * into sheet from public.split_sheets where id = p_split_sheet_id for update;
  if not found or not public.is_split_sheet_participant(p_split_sheet_id) then
    raise exception 'You are not a participant on this split sheet.' using errcode = '42501';
  end if;
  if sheet.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived') or sheet.verified_at is not null then
    raise exception 'Signed records cannot be changed.' using errcode = '55000';
  end if;
  if sheet.sent_at is null then raise exception 'Send this draft before responding to it.' using errcode = '55000'; end if;
  if p_document_payload ->> 'id' is distinct from p_split_sheet_id::text then
    raise exception 'Split sheet payload does not match the requested record.' using errcode = '22023';
  end if;
  if (p_document_payload ->> 'serverRevision')::bigint is distinct from sheet.server_revision then
    raise exception 'This split sheet changed. Refresh it before trying again.' using errcode = '40001';
  end if;
  if p_action <> 'counter_offer' and p_document_payload ->> 'currentProposalId' is distinct from sheet.current_proposal_id then
    raise exception 'The proposal changed. Refresh before responding.' using errcode = '40001';
  end if;
  if length(coalesce(p_notes, '')) > 10000 then raise exception 'Notes are too long.' using errcode = '22023'; end if;
  if (select count(*) from public.split_sheet_collaborators c where c.split_sheet_id = p_split_sheet_id and c.collaborator_user_id = user_id) <> 1 then
    raise exception 'This account must match exactly one party.' using errcode = '42501';
  end if;
  select * into collaborator from public.split_sheet_collaborators c
  where c.split_sheet_id = p_split_sheet_id and c.collaborator_user_id = user_id;
  doc := public.normalize_pending_split_signatures(sheet.document_payload);
  proposal_id := sheet.current_proposal_id;
  if sheet.creator_user_id = user_id then participant_id := 'creator';
  else
    select i ->> 'id' into participant_id from jsonb_array_elements(doc -> 'collaboratorInvites') i
    where i ->> 'partyId' = collaborator.party_id;
  end if;
  if participant_id is null then raise exception 'Participant record is missing.' using errcode = '55000'; end if;
  if p_action in ('invite_accept', 'invite_decline') then
    if participant_id = 'creator' or collaborator.invite_status <> 'Pending' then
      raise exception 'Only a pending invitee can respond to this invitation.' using errcode = '55000';
    end if;
  elsif collaborator.invite_status <> 'Accepted' and p_action <> 'local_chat' then
    raise exception 'Accept the collaboration invite before responding to the split.' using errcode = '55000';
  end if;
  if collaborator.invite_status = 'Declined' then raise exception 'This invitation was declined.' using errcode = '55000'; end if;
  select * into profile from public.profiles where profiles.user_id = auth.uid();
  legal_name := nullif(trim(profile.legal_name), '');
  actor := coalesce(legal_name, nullif(profile.display_name, ''), nullif(profile.username, ''), 'SPLIT user');
  invites := coalesce(doc -> 'collaboratorInvites', '[]');
  approvals := coalesce(doc -> 'splitApprovals', '[]');
  signatures := coalesce(doc -> 'splitSignatures', '[]');

  if p_action in ('invite_accept', 'invite_decline') then
    select coalesce(jsonb_agg(case when i ->> 'id' = participant_id then i || jsonb_build_object(
      'status', case when p_action = 'invite_accept' then 'Accepted' else 'Declined' end,
      'respondedAt', stamp, 'profileSnapshot', jsonb_build_object('username', profile.username,
        'displayName', coalesce(nullif(profile.display_name, ''), actor))) else i end), '[]') into invites
    from jsonb_array_elements(invites) i;
    update public.split_sheet_collaborators set invite_status = case when p_action = 'invite_accept' then 'Accepted' else 'Declined' end,
      responded_at = stamp where id = collaborator.id;
    audit_action := case when p_action = 'invite_accept' then 'Accepted the collaboration invite' else 'Declined the collaboration invite' end;
    response_kind := case when p_action = 'invite_accept' then 'invite_accept' else 'invite_reject' end;
  elsif p_action = 'counter_offer' then
    proposed_parties := p_document_payload #> '{data,parties}';
    if jsonb_typeof(proposed_parties) is distinct from 'array' or
      jsonb_array_length(proposed_parties) <> jsonb_array_length(doc #> '{data,parties}') then
      raise exception 'A counter-offer must keep the same parties.' using errcode = '22023';
    end if;
    if (select count(distinct p ->> 'id') from jsonb_array_elements(proposed_parties) p) <> jsonb_array_length(proposed_parties)
      or exists (select 1 from jsonb_array_elements(proposed_parties) p where jsonb_typeof(p -> 'percent') is distinct from 'number'
        or not exists (select 1 from jsonb_array_elements(doc #> '{data,parties}') old_party where old_party ->> 'id' = p ->> 'id')) then
      raise exception 'Counter-offer parties or percentages are invalid.' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(proposed_parties) p where (p ->> 'percent')::numeric not between 0 and 100
      or round((p ->> 'percent')::numeric, 2) <> (p ->> 'percent')::numeric)
      or (select sum((p ->> 'percent')::numeric) from jsonb_array_elements(proposed_parties) p) <> 100 then
      raise exception 'Ownership percentages must total exactly 100 with at most two decimals.' using errcode = '22023';
    end if;
    proposal_id := gen_random_uuid()::text;
    for party in select value from jsonb_array_elements(doc #> '{data,parties}') loop
      select p -> 'percent' into allocation from jsonb_array_elements(proposed_parties) p where p ->> 'id' = party ->> 'id';
      party := party || jsonb_build_object('percent', allocation);
      parties := parties || jsonb_build_array(party);
      allocations := allocations || jsonb_build_array(jsonb_build_object('partyId', party ->> 'id',
        'name', coalesce(nullif(party ->> 'professionalName', ''), party ->> 'legalName', 'Collaborator'),
        'role', coalesce(party ->> 'role', 'Collaborator'), 'percentage', allocation));
    end loop;
    doc := jsonb_set(doc, '{data,parties}', parties) || jsonb_build_object('version', sheet.version + 1, 'currentProposalId', proposal_id,
      'splitProposalVersions', coalesce(doc -> 'splitProposalVersions', '[]') || jsonb_build_array(jsonb_build_object(
        'id', proposal_id, 'versionNumber', sheet.version + 1, 'proposedBy', actor, 'proposedByUserId', user_id,
        'notes', coalesce(nullif(trim(p_notes), ''), 'Counter-offer from Messages'), 'createdAt', stamp, 'allocations', allocations)));
    insert into public.split_sheet_proposal_versions (id, split_sheet_id, version_number, proposed_by_user_id, proposed_by_label, notes, allocations, total_percentage, created_at)
    values (proposal_id, p_split_sheet_id, sheet.version + 1, user_id, actor, p_notes, allocations, 100, stamp);
    for member in select * from public.split_sheet_collaborators where split_sheet_id = p_split_sheet_id loop
      if member.collaborator_user_id = sheet.creator_user_id then member_id := 'creator';
      else select i ->> 'id' into member_id from jsonb_array_elements(invites) i where i ->> 'partyId' = member.party_id; end if;
      approvals := approvals || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('id', gen_random_uuid(),
        'proposalVersionId', proposal_id, 'collaboratorId', member_id, 'collaboratorName', member.display_name,
        'status', case when member.id = collaborator.id then 'Approved' else 'Pending' end,
        'respondedAt', case when member.id = collaborator.id then stamp end,
        'responderUserId', case when member.id = collaborator.id then user_id end)));
      signatures := signatures || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(),
        'proposalVersionId', proposal_id, 'collaboratorId', member_id, 'collaboratorName', member.display_name, 'status', 'Pending'));
    end loop;
    audit_action := 'Created split proposal v' || (sheet.version + 1)::text || ' from Messages';
    response_kind := 'split_reject';
  elsif p_action in ('split_accept', 'split_reject') then
    if exists (select 1 from jsonb_array_elements(signatures) s where s ->> 'proposalVersionId' = proposal_id and s ->> 'status' = 'Signed') then
      raise exception 'Signatures have started. Create a counter-offer to change these terms.' using errcode = '55000';
    end if;
    select coalesce(jsonb_agg(a), '[]') into approvals from jsonb_array_elements(approvals) a
    where not (a ->> 'proposalVersionId' = proposal_id and a ->> 'collaboratorId' in (participant_id, collaborator.party_id));
    approvals := approvals || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'proposalVersionId', proposal_id,
      'collaboratorId', participant_id, 'collaboratorName', actor, 'responderUserId', user_id,
      'status', case when p_action = 'split_accept' then 'Approved' else 'Rejected' end, 'notes', p_notes, 'respondedAt', stamp));
    audit_action := case when p_action = 'split_accept' then 'Accepted the current split proposal' else 'Rejected the current split proposal' end;
    response_kind := p_action;
  elsif p_action = 'local_chat' then
    if nullif(trim(p_notes), '') is null then raise exception 'A message cannot be empty.' using errcode = '22023'; end if;
    doc := jsonb_set(doc, '{auditTrail}', coalesce(doc -> 'auditTrail', '[]') || jsonb_build_array(jsonb_build_object(
      'timestamp', stamp, 'actor', actor, 'actorUserId', user_id,
      'action', '__splitChatMessages:' || jsonb_build_object('id', gen_random_uuid(), 'senderId', participant_id,
        'senderName', actor, 'body', trim(p_notes), 'createdAt', stamp)::text)));
    audit_action := 'Sent a negotiation message';
  end if;

  -- Consensus is checked against every stored party, never a client-supplied list.
  for member in select * from public.split_sheet_collaborators where split_sheet_id = p_split_sheet_id loop
    if member.collaborator_user_id = sheet.creator_user_id then member_id := 'creator';
    else select i ->> 'id' into member_id from jsonb_array_elements(invites) i where i ->> 'partyId' = member.party_id; end if;
    all_accepted := all_accepted and member.invite_status = 'Accepted';
    all_approved := all_approved and exists (select 1 from jsonb_array_elements(approvals) a
      where a ->> 'proposalVersionId' = proposal_id and a ->> 'collaboratorId' in (member_id, member.party_id) and a ->> 'status' = 'Approved');
  end loop;
  if p_action = 'sign' then
    if not all_accepted or not all_approved then
      raise exception 'Every party must accept the invite and approve the current proposal before signing.' using errcode = '55000';
    end if;
    if legal_name is null then raise exception 'Add your legal name to your profile before signing.' using errcode = '55000'; end if;
    if exists (select 1 from jsonb_array_elements(signatures) s where s ->> 'proposalVersionId' = proposal_id
      and s ->> 'collaboratorId' in (participant_id, collaborator.party_id) and s ->> 'status' = 'Signed' and s ->> 'signerUserId' = user_id::text) then
      raise exception 'You already signed this proposal.' using errcode = '55000';
    end if;
    select coalesce(jsonb_agg(s), '[]') into signatures from jsonb_array_elements(signatures) s
    where not (s ->> 'proposalVersionId' = proposal_id and s ->> 'collaboratorId' in (participant_id, collaborator.party_id));
    signatures := signatures || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', gen_random_uuid(), 'proposalVersionId', proposal_id, 'collaboratorId', participant_id,
      'collaboratorName', actor, 'status', 'Signed', 'signedAt', stamp, 'signerUserId', user_id,
      'signatureMethod', 'SPLIT in-app acknowledgement', 'signerLegalName', legal_name,
      'signerArtistName', nullif(profile.pka_names, '')
    )));
    audit_action := 'Signed the split sheet';
    response_kind := 'signature';
  end if;
  for member in select * from public.split_sheet_collaborators where split_sheet_id = p_split_sheet_id loop
    if member.collaborator_user_id = sheet.creator_user_id then member_id := 'creator';
    else select i ->> 'id' into member_id from jsonb_array_elements(invites) i where i ->> 'partyId' = member.party_id; end if;
    select s into current_record from jsonb_array_elements(signatures) s where s ->> 'proposalVersionId' = proposal_id
      and s ->> 'collaboratorId' in (member_id, member.party_id) and s ->> 'status' = 'Signed'
      and s ->> 'signerUserId' = member.collaborator_user_id::text limit 1;
    all_signed := all_signed and current_record is not null;
    any_signed := any_signed or current_record is not null;
  end loop;
  any_rejected := exists (select 1 from jsonb_array_elements(approvals) a where a ->> 'proposalVersionId' = proposal_id and a ->> 'status' = 'Rejected');
  next_status := case
    when all_accepted and all_approved and all_signed then 'Verified and Stored'
    when any_rejected or exists (select 1 from jsonb_array_elements(invites) i where i ->> 'status' = 'Declined') then 'Disputed'
    when not all_accepted then 'Pending Collaborator Acceptance'
    when not all_approved then 'Pending Split Approval'
    when any_signed then 'Pending Signatures' else 'Ready to Sign' end;
  if p_action = 'sign' and next_status = 'Verified and Stored' then
    doc := doc || jsonb_build_object('verifiedAt', stamp);
    audit_action := 'Signed and verified the split sheet';
  end if;
  doc := doc || jsonb_build_object('creatorUserId', sheet.creator_user_id, 'serverRevision', sheet.server_revision + 1,
    'updatedAt', stamp, 'status', next_status, 'collaboratorInvites', invites, 'splitApprovals', approvals, 'splitSignatures', signatures,
    'auditTrail', coalesce(doc -> 'auditTrail', '[]') || jsonb_build_array(jsonb_build_object(
      'timestamp', stamp, 'actor', actor, 'actorUserId', user_id, 'action', audit_action)));
  update public.split_sheets set document_payload = doc, status = next_status, version = (doc ->> 'version')::integer,
    current_proposal_id = proposal_id, server_revision = sheet.server_revision + 1, updated_at = stamp,
    verified_at = case when next_status = 'Verified and Stored' then stamp else null end
  where id = p_split_sheet_id;
  perform public.sync_split_sheet_collaborators_from_payload(p_split_sheet_id, doc);
  update public.split_sheet_collaborators set signed_at = null
  where split_sheet_id = p_split_sheet_id and signature_status = 'Pending';
  -- The legacy sync helper preserves missing values. Explicitly reset current
  -- signing state when moving to a new proposal; old evidence stays in history.
  if p_action = 'counter_offer' then
    update public.split_sheet_collaborators set signature_status = 'Pending', signed_at = null where split_sheet_id = p_split_sheet_id;
  end if;
  if response_kind is not null then
    insert into public.split_sheet_responses (split_sheet_id, proposal_version_id, collaborator_id, responder_user_id, response_type, notes, created_at)
    values (p_split_sheet_id, proposal_id, collaborator.id, user_id, response_kind, p_notes, stamp);
  end if;
  insert into public.split_sheet_audit_records (split_sheet_id, actor_user_id, actor_label, action, metadata, created_at)
  values (p_split_sheet_id, user_id, actor, audit_action, jsonb_build_object('proposalVersionId', proposal_id,
    'version', doc -> 'version', 'status', next_status, 'serverRevision', sheet.server_revision + 1), stamp);
  event_type := case when p_action = 'local_chat' then 'chat_message' when p_action = 'sign' and next_status = 'Verified and Stored' then 'split_verified'
    when p_action = 'sign' then 'signature' else p_action end;
  perform public.notify_split_sheet_participants(p_split_sheet_id, user_id, actor, event_type,
    case when next_status = 'Verified and Stored' then 'Split sheet signed' else actor || ': ' || lower(audit_action) end,
    case when p_action = 'local_chat' then trim(p_notes) else sheet.title end, 'messages',
    jsonb_build_object('status', next_status, 'version', doc -> 'version', 'proposalVersionId', proposal_id),
    p_split_sheet_id::text || ':revision:' || (sheet.server_revision + 1)::text, false);
  return doc;
end;
$$;

revoke all on function public.load_my_split_sheets() from public, anon;
revoke all on function public.is_split_sheet_participant(uuid) from public, anon;
revoke all on function public.upsert_split_sheet_document(jsonb, text, text) from public, anon;
revoke all on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.load_my_split_sheets() to authenticated;
grant execute on function public.is_split_sheet_participant(uuid) to authenticated;
grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated;
grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;
