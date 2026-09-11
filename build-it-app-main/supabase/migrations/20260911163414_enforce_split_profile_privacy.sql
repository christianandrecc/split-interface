-- Project shared records for the authenticated viewer; never rewrite signed data.
create schema if not exists split_private;
revoke all on schema split_private from public, anon, authenticated;

create function split_private.pick_fields(value jsonb, allowed text[])
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(key, val), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(value) = 'object' then value else '{}'::jsonb end) fields(key, val)
  where key = any(allowed);
$$;
revoke all on function split_private.pick_fields(jsonb, text[]) from public, anon, authenticated;

-- Older email/phone invites sometimes copied their address into display labels.
-- Only mask those labels; never search/replace user-authored notes or chat text.
create function split_private.mask_contact_labels(value jsonb, contacts text[], field text default '')
returns jsonb language plpgsql immutable set search_path = '' as $$
declare result jsonb; item record;
begin
  if jsonb_typeof(value) = 'object' then
    result := '{}';
    for item in select * from jsonb_each(value) loop
      result := result || jsonb_build_object(item.key, split_private.mask_contact_labels(item.value, contacts, item.key));
    end loop;
    return result;
  elsif jsonb_typeof(value) = 'array' then
    result := '[]';
    for item in select v from jsonb_array_elements(value) v loop
      result := result || jsonb_build_array(split_private.mask_contact_labels(item.v, contacts, field));
    end loop;
    return result;
  elsif jsonb_typeof(value) = 'string' and field = any(array['collaborators', 'name', 'professionalName',
    'legalName', 'displayName', 'collaboratorName', 'proposedBy', 'actor'])
    and lower(trim(value #>> '{}')) = any(contacts) then
    return '"Collaborator"'::jsonb;
  end if;
  return value;
end;
$$;
revoke all on function split_private.mask_contact_labels(jsonb, text[], text) from public, anon, authenticated;

create or replace function public.search_split_profiles(search_query text, result_limit integer default 8)
returns table (user_id uuid, username text, display_name text, role_tags text, profile_image_url text, profile_location text)
language sql stable security definer set search_path = '' as $$
  with normalized as (
    select lower(trim(both '@' from trim(coalesce(search_query, '')))) as query_text,
      greatest(1, least(coalesce(result_limit, 8), 20)) as max_results
  )
  select p.user_id, p.username,
    coalesce(nullif(p.display_name, ''), nullif(p.stage_name, ''), nullif(p.pka_names, ''), nullif(p.username, ''), 'SPLIT user'),
    p.role_tags, p.profile_image_url, p.profile_location
  from public.profiles p cross join normalized q
  where auth.uid() is not null and length(q.query_text) >= 2 and p.user_id is not null
    and (p.user_id = auth.uid() or lower(trim(p.profile_visibility)) = 'public'
      or (lower(trim(coalesce(p.profile_visibility, 'Collaborators only'))) = 'collaborators only' and exists (
        select 1 from public.split_sheet_collaborators mine
        join public.split_sheet_collaborators theirs on theirs.split_sheet_id = mine.split_sheet_id
        join public.split_sheets s on s.id = mine.split_sheet_id
        where mine.collaborator_user_id = auth.uid() and theirs.collaborator_user_id = p.user_id
          and mine.invite_status = 'Accepted' and theirs.invite_status = 'Accepted' and s.sent_at is not null
      )))
    and (lower(coalesce(p.username, '')) like q.query_text || '%'
      or lower(coalesce(p.display_name, '')) like q.query_text || '%'
      or lower(coalesce(p.stage_name, '')) like q.query_text || '%'
      or lower(coalesce(p.pka_names, '')) like q.query_text || '%'
      or lower(coalesce(p.email, '')) = q.query_text)
  order by case when lower(p.username) = q.query_text then 0
    when lower(p.username) like q.query_text || '%' then 1
    when lower(p.display_name) like q.query_text || '%' then 2 else 3 end, p.updated_at desc
  limit (select max_results from normalized);
$$;
revoke all on function public.search_split_profiles(text, integer) from public, anon;
grant execute on function public.search_split_profiles(text, integer) to authenticated;

-- Editable profile contact fields are not proof of ownership of an invitation.
create or replace function public.resolve_split_invite_user_id(
  invite_username text, invite_email text, invite_phone text, invite_value text, invite_method text
)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u join public.profiles p on p.user_id = u.id
  where (invite_method = 'username' and nullif(trim(both '@' from trim(coalesce(invite_username, invite_value, ''))), '') is not null
      and lower(p.username) = lower(trim(both '@' from trim(coalesce(invite_username, invite_value, '')))))
    or (invite_method = 'email' and u.email_confirmed_at is not null
      and nullif(trim(coalesce(invite_email, invite_value, '')), '') is not null
      and lower(u.email) = lower(trim(coalesce(invite_email, invite_value, ''))))
    or (invite_method = 'phone' and u.phone_confirmed_at is not null
      and length(public.split_invite_digits(coalesce(invite_phone, invite_value, ''))) >= 7
      and public.split_invite_digits(u.phone) = public.split_invite_digits(coalesce(invite_phone, invite_value, '')))
  order by p.updated_at desc limit 1;
$$;
revoke all on function public.resolve_split_invite_user_id(text, text, text, text, text) from public, anon, authenticated;

create function split_private.link_pending_invites(user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.split_sheet_collaborators c set collaborator_user_id = user_id, updated_at = now()
  where c.collaborator_user_id is null and c.invite_method <> 'creator'
    and c.invite_status = 'Pending' and c.approval_status = 'Pending' and c.signature_status = 'Pending'
    and c.responded_at is null and c.signed_at is null
    and public.resolve_split_invite_user_id(c.username, c.invite_email, c.invite_phone, c.invite_value, c.invite_method) = user_id;
$$;
revoke all on function split_private.link_pending_invites(uuid) from public, anon, authenticated;

create or replace function public.link_pending_split_invites_for_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform split_private.link_pending_invites(new.user_id);
  return new;
end;
$$;
revoke all on function public.link_pending_split_invites_for_profile() from public, anon, authenticated;

create function split_private.link_verified_split_invites()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform split_private.link_pending_invites(new.id);
  return new;
end;
$$;
revoke all on function split_private.link_verified_split_invites() from public, anon, authenticated;
create trigger split_link_verified_contacts
  after update of email, email_confirmed_at, phone, phone_confirmed_at on auth.users
  for each row execute function split_private.link_verified_split_invites();

create function split_private.visible_document(p_document jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  sheet public.split_sheets%rowtype;
  member public.split_sheet_collaborators%rowtype;
  result jsonb;
  party jsonb;
  invite jsonb;
  parties jsonb := '[]';
  invites jsonb := '[]';
  contacts text[] := '{}';
  public_profile_fields text[] := array['authUserId', 'splitId', 'username', 'displayName', 'profileImageUrl',
    'roleTags', 'legalName', 'legalFirstName', 'legalMiddleName', 'legalLastName', 'pkaNames'];
begin
  select * into sheet from public.split_sheets where id = (p_document ->> 'id')::uuid;
  if viewer is null or not found or not public.is_split_sheet_participant(sheet.id) then
    raise exception 'You are not a participant on this split sheet.' using errcode = '42501';
  end if;
  -- Unsent drafts contain the creator's own input and are visible only to them.
  if sheet.sent_at is null and sheet.creator_user_id = viewer then return p_document; end if;
  result := split_private.pick_fields(p_document, array['id', 'creatorUserId', 'serverRevision', 'title', 'status', 'version',
    'createdAt', 'updatedAt', 'storedAt', 'sentAt', 'verifiedAt', 'documentNumber', 'data', 'creatorProfile', 'collaborators',
    'collaboratorInvites', 'currentProposalId', 'splitProposalVersions', 'splitApprovals', 'splitSignatures', 'auditTrail']);
  if sheet.creator_user_id <> viewer then
    contacts := contacts || array[p_document #>> '{creatorProfile,emailAddress}', p_document #>> '{creatorProfile,phoneNumber}'];
    result := jsonb_set(result, '{creatorProfile}', split_private.pick_fields(p_document -> 'creatorProfile', public_profile_fields));
  end if;
  result := jsonb_set(result, '{data}', split_private.pick_fields(p_document -> 'data', array[
    'songTitle', 'alternateTitles', 'artistProjectName', 'creationDate', 'creationLocation', 'studioName', 'workNotes',
    'lyricLanguage', 'compositionType', 'iswc', 'relatedIsrc', 'parties', 'splitType', 'agreementStatus',
    'recordingArtist', 'recordingTitle', 'releaseStatus', 'releaseDate', 'expectedReleaseDate', 'distributor', 'label', 'upc',
    'registrationContactType', 'designatedContactName', 'designatedContactRole', 'designatedContactEmail',
    'designatedContactAuthority', 'registrationDeadline', 'sampleStatus', 'sampleNotes', 'sampleOriginalWork',
    'sampleOriginalArtist', 'sampleOriginalWriters', 'sampleOriginalPublishers', 'sampleMasterOwner', 'samplePortion',
    'sampleClearanceStatus', 'sampleAgreedShare', 'publicDomainStatus', 'publicDomainSource', 'publicDomainJurisdiction',
    'publicDomainClaim', 'disputeStatus', 'disputeContributor', 'disputePercent', 'disputeReason', 'disputeEvidence',
    'freezeRegistration', 'exportUndisputedShares', 'authorizeSplitPercent', 'authorizePersonalMetadata',
    'authorizeContributionDescription', 'authorizeProIpi', 'authorizePublisherAdmin', 'authorizeRegistrationUse',
    'exportPacket', 'sendToPRO', 'sendToMLC', 'sendToPublisherAdmin', 'requireApprovalBeforeSubmission',
    'allowDesignatedSubmitter', 'requireAllSignatures', 'signingOrderEnabled', 'conditionalSignatures', 'includeAuditTrail']));
  for party in select value from jsonb_array_elements(p_document #> '{data,parties}') loop
    select * into member from public.split_sheet_collaborators
      where split_sheet_id = sheet.id and party_id = party ->> 'id';
    if member.collaborator_user_id is distinct from viewer then
      contacts := contacts || array[party ->> 'email', party ->> 'phoneNumber', member.invite_email, member.invite_phone,
        case when party ->> 'inviteMethod' in ('email', 'phone') then party ->> 'inviteValue' end];
      party := split_private.pick_fields(party, array['id', 'splitId', 'inviteMethod', 'accountLinked', 'isCurrentUser',
        'legalName', 'professionalName', 'country', 'role', 'percent', 'proAffiliation', 'customProName', 'ipiNumber',
        'proMemberNumber', 'societyTerritory', 'contributionCategories', 'contributionDescription', 'isSigner', 'signingOrder'])
        || jsonb_build_object('email', '', 'phoneNumber', '', 'inviteValue',
          case when party ->> 'inviteMethod' = 'username' then coalesce(party ->> 'inviteValue', '') else '' end);
    end if;
    parties := parties || jsonb_build_array(party);
  end loop;
  for invite in select value from jsonb_array_elements(coalesce(p_document -> 'collaboratorInvites', '[]')) loop
    select * into member from public.split_sheet_collaborators
      where split_sheet_id = sheet.id and party_id = invite ->> 'partyId';
    if member.collaborator_user_id is distinct from viewer then
      contacts := contacts || array[invite #>> '{profileSnapshot,email}', invite #>> '{profileSnapshot,phoneNumber}',
        case when invite ->> 'inviteMethod' in ('email', 'phone') then invite ->> 'inviteValue' end];
      invite := split_private.pick_fields(invite, array['id', 'partyId', 'name', 'inviteMethod', 'status', 'respondedAt'])
        || jsonb_build_object('inviteValue', case when invite ->> 'inviteMethod' = 'username' then coalesce(invite ->> 'inviteValue', '') else '' end,
          'profileSnapshot', split_private.pick_fields(invite -> 'profileSnapshot', array['username', 'displayName', 'role', 'splitId']));
    end if;
    -- The stable account link replaces contact matching after fields are redacted.
    invite := invite || jsonb_build_object('collaboratorUserId', member.collaborator_user_id);
    invites := invites || jsonb_build_array(invite);
  end loop;
  result := jsonb_set(result, '{data,parties}', parties);
  result := jsonb_set(result, '{collaboratorInvites}', invites);
  select coalesce(array_agg(distinct lower(trim(contact))), '{}'::text[]) into contacts
    from unnest(contacts) contact where nullif(trim(contact), '') is not null;
  return split_private.mask_contact_labels(result, contacts);
end;
$$;
revoke all on function split_private.visible_document(jsonb) from public, anon, authenticated;

-- Keep the tested write/identity checks intact, but hide their unfiltered return values.
alter function public.upsert_split_sheet_document(jsonb, text, text) set schema split_private;
alter function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) set schema split_private;
revoke all on function split_private.upsert_split_sheet_document(jsonb, text, text) from public, anon, authenticated;
revoke all on function split_private.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) from public, anon, authenticated;

create function public.upsert_split_sheet_document(p_document_payload jsonb, p_mode text default 'update', p_actor_label text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return split_private.visible_document(split_private.upsert_split_sheet_document(p_document_payload, p_mode, p_actor_label));
end;
$$;
revoke all on function public.upsert_split_sheet_document(jsonb, text, text) from public, anon;
grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated;

create function public.apply_split_sheet_participant_update(p_split_sheet_id uuid, p_document_payload jsonb, p_action text,
  p_actor_label text default null, p_response_type text default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return split_private.visible_document(split_private.apply_split_sheet_participant_update(
    p_split_sheet_id, p_document_payload, p_action, p_actor_label, p_response_type, p_notes));
end;
$$;
revoke all on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) from public, anon;
grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;

create or replace function public.load_my_split_sheets()
returns table (id uuid, updated_at timestamptz, creator_user_id uuid, document_payload jsonb)
language sql security definer set search_path = '' as $$
  select s.id, s.updated_at, s.creator_user_id,
    split_private.visible_document((case when s.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived') or s.verified_at is not null
      then s.document_payload else public.normalize_pending_split_signatures(s.document_payload) end)
      || jsonb_build_object('creatorUserId', s.creator_user_id, 'serverRevision', s.server_revision))
  from public.split_sheets s
  where s.creator_user_id = (select auth.uid()) or (s.sent_at is not null and exists (
    select 1 from public.split_sheet_collaborators c where c.split_sheet_id = s.id and c.collaborator_user_id = (select auth.uid())))
  order by s.updated_at desc;
$$;

-- RLS limits rows, not fields. Do not allow raw JSON/contact columns to bypass the RPC projection.
revoke select on public.split_sheets, public.split_sheet_collaborators, public.split_sheet_proposal_versions,
  public.split_sheet_responses, public.split_sheet_audit_records, public.split_sheet_contract_deliveries from public, anon, authenticated;
grant select (id, creator_user_id, status, created_at, updated_at, server_revision) on public.split_sheets to authenticated;
grant select (id, split_sheet_id, party_id, collaborator_user_id, invite_status, approval_status, signature_status,
  responded_at, signed_at, created_at, updated_at) on public.split_sheet_collaborators to authenticated;
grant select (id, split_sheet_id, version_number, proposed_by_user_id, total_percentage, created_at)
  on public.split_sheet_proposal_versions to authenticated;
grant select (id, split_sheet_id, proposal_version_id, collaborator_id, responder_user_id, response_type, created_at)
  on public.split_sheet_responses to authenticated;
grant select (id, split_sheet_id, actor_user_id, created_at) on public.split_sheet_audit_records to authenticated;
grant select (id, split_sheet_id, delivery_status, created_at, updated_at) on public.split_sheet_contract_deliveries to authenticated;
