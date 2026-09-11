-- Capture only the authenticated collaborator's registration details within the existing action transaction.
-- The public privacy projection wrapper remains unchanged.
create or replace function split_private.apply_split_sheet_participant_update(
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
  profile_pro text;
  profile_custom_pro text;
  profile_ipi text;
  registration jsonb;
  prior_registration jsonb;
  registration_changed boolean := false;
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
  -- The locked, stored proposal decides whose turn it is, never client attribution.
  if p_action in ('split_accept', 'split_reject', 'counter_offer') then
    if not exists (select 1 from public.split_sheet_proposal_versions p
      where p.id = proposal_id and p.split_sheet_id = p_split_sheet_id and p.proposed_by_user_id is not null) then
      raise exception 'The proposal author could not be verified. Refresh before responding.' using errcode = '55000';
    end if;
    if exists (select 1 from public.split_sheet_proposal_versions p
      where p.id = proposal_id and p.split_sheet_id = p_split_sheet_id and p.proposed_by_user_id = user_id) then
      raise exception 'You cannot accept, dispute, or counter your own proposal. Wait for another collaborator to respond.' using errcode = '55000';
    end if;
  end if;
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
        'id', proposal_id, 'versionNumber', sheet.version + 1, 'proposedBy', actor, 'proposedByUserId', user_id, 'proposedByParticipantId', participant_id,
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
  -- Read the saved account, never contact matches or metadata submitted with this request.
  -- Blank/unknown account fields do not erase usable details already on the sheet.
  if p_action in ('invite_accept', 'sign') then
    select p into party from jsonb_array_elements(doc #> '{data,parties}') p where p ->> 'id' = collaborator.party_id;
    if party is null then raise exception 'Participant record is missing.' using errcode = '55000'; end if;
    prior_registration := split_private.pick_fields(party, array['proAffiliation', 'customProName', 'ipiNumber']);
    registration := prior_registration;
    profile_pro := nullif(trim(coalesce(profile.pro_affiliation, profile.profile_data ->> 'proAffiliation')), '');
    profile_custom_pro := nullif(trim(coalesce(profile.custom_pro_name, profile.profile_data ->> 'customProName')), '');
    profile_ipi := nullif(trim(coalesce(profile.ipi_number, profile.profile_data ->> 'ipiNumber')), '');
    if profile_pro is not null and lower(profile_pro) <> 'unknown' then
      registration := registration || jsonb_build_object('proAffiliation', profile_pro, 'customProName',
        case when profile_pro = 'Other' then coalesce(profile_custom_pro,
          case when party ->> 'proAffiliation' = 'Other' then party ->> 'customProName' end, '') else '' end);
    end if;
    if profile_ipi is not null then registration := registration || jsonb_build_object('ipiNumber', profile_ipi); end if;
    registration_changed := registration is distinct from prior_registration;
    select jsonb_agg(case when p ->> 'id' = collaborator.party_id then p || registration else p end order by ordinal)
      into parties from jsonb_array_elements(doc #> '{data,parties}') with ordinality as entries(p, ordinal);
    doc := jsonb_set(doc, '{data,parties}', parties);
    select coalesce(jsonb_agg(case when i ->> 'id' = participant_id then i || jsonb_build_object('profileSnapshot',
      (case when jsonb_typeof(i -> 'profileSnapshot') = 'object' then i -> 'profileSnapshot' else '{}'::jsonb end) || registration)
      else i end order by ordinal), '[]') into invites from jsonb_array_elements(invites) with ordinality as entries(i, ordinal);
    if p_action = 'sign' then
      select jsonb_agg(case when s ->> 'proposalVersionId' = proposal_id and s ->> 'signerUserId' = user_id::text
        and s ->> 'status' = 'Signed' then s || jsonb_build_object('registrationSnapshot', registration) else s end order by ordinal)
        into signatures from jsonb_array_elements(signatures) with ordinality as entries(s, ordinal);
    end if;
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
  if registration_changed then audit_action := audit_action || ' (PRO/IPI updated from account)'; end if;
  doc := doc || jsonb_build_object('creatorUserId', sheet.creator_user_id, 'serverRevision', sheet.server_revision + 1,
    'updatedAt', stamp, 'status', next_status, 'collaboratorInvites', invites, 'splitApprovals', approvals, 'splitSignatures', signatures,
    'auditTrail', coalesce(doc -> 'auditTrail', '[]') || jsonb_build_array(jsonb_build_object(
      'timestamp', stamp, 'actor', actor, 'actorUserId', user_id, 'action', audit_action)));
  update public.split_sheets set document_payload = doc, status = next_status, version = (doc ->> 'version')::integer,
    current_proposal_id = proposal_id, server_revision = sheet.server_revision + 1, updated_at = stamp,
    verified_at = case when next_status = 'Verified and Stored' then stamp else null end
  where id = p_split_sheet_id;
  perform public.sync_split_sheet_collaborators_from_payload(p_split_sheet_id, doc);
  if p_action in ('invite_accept', 'sign') then
    update public.split_sheet_collaborators set profile_snapshot =
      (case when jsonb_typeof(profile_snapshot) = 'object' then profile_snapshot else '{}'::jsonb end) || registration
      where id = collaborator.id;
  end if;
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

revoke all on function split_private.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) from public, anon, authenticated;
