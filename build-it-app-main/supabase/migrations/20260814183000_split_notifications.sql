-- SPLIT notification storage.
-- Keeps top-right bell notifications durable, recipient-scoped, and realtime-ready.

create table if not exists public.split_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  split_sheet_id uuid references public.split_sheets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null default 'SPLIT',
  event_type text not null,
  title text not null,
  body text not null,
  action_target text not null default 'messages',
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'split_notifications_event_type_check'
      and conrelid = 'public.split_notifications'::regclass
  ) then
    alter table public.split_notifications
      add constraint split_notifications_event_type_check
      check (event_type in (
        'split_invite',
        'split_sent',
        'chat_message',
        'invite_accept',
        'invite_decline',
        'split_accept',
        'split_reject',
        'counter_offer',
        'signature',
        'split_verified',
        'contract_delivery',
        'split_updated'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'split_notifications_action_target_check'
      and conrelid = 'public.split_notifications'::regclass
  ) then
    alter table public.split_notifications
      add constraint split_notifications_action_target_check
      check (action_target in ('messages', 'agreement', 'activity'));
  end if;
end $$;

create index if not exists split_notifications_recipient_created_idx
  on public.split_notifications (recipient_user_id, created_at desc);
create index if not exists split_notifications_recipient_unread_idx
  on public.split_notifications (recipient_user_id, created_at desc)
  where read_at is null;
create index if not exists split_notifications_split_sheet_idx
  on public.split_notifications (split_sheet_id, created_at desc);

alter table public.split_notifications enable row level security;

drop policy if exists "split notification recipients can view" on public.split_notifications;
drop policy if exists "split notification recipients can update read state" on public.split_notifications;
drop policy if exists "split notification recipients can delete" on public.split_notifications;

create policy "split notification recipients can view"
  on public.split_notifications for select
  to authenticated
  using (recipient_user_id = (select auth.uid()));

create or replace function public.insert_split_notification(
  p_recipient_user_id uuid,
  p_split_sheet_id uuid,
  p_actor_user_id uuid,
  p_actor_label text,
  p_event_type text,
  p_title text,
  p_body text,
  p_action_target text default 'messages',
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_recipient_user_id is null then
    return null;
  end if;

  insert into public.split_notifications (
    recipient_user_id,
    split_sheet_id,
    actor_user_id,
    actor_label,
    event_type,
    title,
    body,
    action_target,
    metadata,
    dedupe_key
  )
  values (
    p_recipient_user_id,
    p_split_sheet_id,
    p_actor_user_id,
    coalesce(nullif(trim(p_actor_label), ''), 'SPLIT'),
    p_event_type,
    coalesce(nullif(trim(p_title), ''), 'SPLIT update'),
    coalesce(nullif(trim(p_body), ''), 'Open SPLIT to review the latest update.'),
    coalesce(nullif(trim(p_action_target), ''), 'messages'),
    coalesce(p_metadata, '{}'::jsonb),
    nullif(trim(p_dedupe_key), '')
  )
  on conflict (dedupe_key) do nothing
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.insert_split_notification(uuid, uuid, uuid, text, text, text, text, text, jsonb, text) from public, anon, authenticated;

create or replace function public.notify_split_sheet_participants(
  p_split_sheet_id uuid,
  p_actor_user_id uuid,
  p_actor_label text,
  p_event_type text,
  p_title text,
  p_body text,
  p_action_target text default 'messages',
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_prefix text default null,
  p_include_actor boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
  created_count integer := 0;
  notification_id uuid;
begin
  if p_event_type not in (
    'split_invite',
    'split_sent',
    'chat_message',
    'invite_accept',
    'invite_decline',
    'split_accept',
    'split_reject',
    'counter_offer',
    'signature',
    'split_verified',
    'contract_delivery',
    'split_updated'
  ) then
    raise exception 'Unsupported split notification type.';
  end if;

  for recipient in
    select distinct participant_user_id
    from (
      select sheet.creator_user_id as participant_user_id
      from public.split_sheets sheet
      where sheet.id = p_split_sheet_id

      union

      select collaborator.collaborator_user_id as participant_user_id
      from public.split_sheet_collaborators collaborator
      where collaborator.split_sheet_id = p_split_sheet_id
        and collaborator.collaborator_user_id is not null
    ) participants
    where participant_user_id is not null
      and (p_include_actor or p_actor_user_id is null or participant_user_id <> p_actor_user_id)
  loop
    notification_id := public.insert_split_notification(
      recipient.participant_user_id,
      p_split_sheet_id,
      p_actor_user_id,
      p_actor_label,
      p_event_type,
      p_title,
      p_body,
      p_action_target,
      p_metadata,
      case
        when p_dedupe_prefix is null then null
        else p_dedupe_prefix || ':' || recipient.participant_user_id::text
      end
    );

    if notification_id is not null then
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

revoke all on function public.notify_split_sheet_participants(uuid, uuid, text, text, text, text, text, jsonb, text, boolean) from public, anon, authenticated;

create or replace function public.notify_split_sheet_event(
  p_split_sheet_id uuid,
  p_event_type text,
  p_actor_label text,
  p_title text,
  p_body text,
  p_action_target text default 'messages',
  p_dedupe_prefix text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Sign in before creating split notifications.';
  end if;

  if not (select public.is_split_sheet_participant(p_split_sheet_id)) then
    raise exception 'You are not a participant on this split sheet.';
  end if;

  return public.notify_split_sheet_participants(
    p_split_sheet_id,
    current_user_id,
    p_actor_label,
    p_event_type,
    p_title,
    p_body,
    p_action_target,
    p_metadata,
    p_dedupe_prefix,
    false
  );
end;
$$;

grant execute on function public.notify_split_sheet_event(uuid, text, text, text, text, text, text, jsonb) to authenticated;

create or replace function public.load_my_split_notifications(p_limit integer default 30)
returns table (
  id uuid,
  recipient_user_id uuid,
  split_sheet_id uuid,
  actor_user_id uuid,
  actor_label text,
  event_type text,
  title text,
  body text,
  action_target text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    notification.id,
    notification.recipient_user_id,
    notification.split_sheet_id,
    notification.actor_user_id,
    notification.actor_label,
    notification.event_type,
    notification.title,
    notification.body,
    notification.action_target,
    notification.metadata,
    notification.read_at,
    notification.created_at
  from public.split_notifications notification
  where notification.recipient_user_id = (select auth.uid())
  order by notification.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

grant execute on function public.load_my_split_notifications(integer) to authenticated;

create or replace function public.mark_split_notifications_read(
  p_notification_ids uuid[] default null,
  p_split_sheet_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  update public.split_notifications notification
    set read_at = coalesce(notification.read_at, now())
  where notification.recipient_user_id = (select auth.uid())
    and (p_notification_ids is null or notification.id = any(p_notification_ids))
    and (p_split_sheet_id is null or notification.split_sheet_id = p_split_sheet_id);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.mark_split_notifications_read(uuid[], uuid) to authenticated;

create or replace function public.notify_split_collaborator_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sheet record;
  actor_label text;
begin
  if new.collaborator_user_id is null or new.invite_method = 'creator' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.collaborator_user_id is not distinct from new.collaborator_user_id then
    return new;
  end if;

  select
    split_sheets.id,
    split_sheets.title,
    split_sheets.status,
    split_sheets.sent_at,
    split_sheets.creator_user_id,
    split_sheets.document_payload
  into sheet
  from public.split_sheets
  where split_sheets.id = new.split_sheet_id;

  if sheet.id is null or (sheet.sent_at is null and sheet.status = 'Draft') then
    return new;
  end if;

  actor_label := coalesce(
    nullif(sheet.document_payload #>> '{creatorProfile,displayName}', ''),
    nullif(sheet.document_payload #>> '{creatorProfile,pkaNames}', ''),
    nullif(sheet.document_payload #>> '{creatorProfile,username}', ''),
    'SPLIT collaborator'
  );

  perform public.insert_split_notification(
    new.collaborator_user_id,
    new.split_sheet_id,
    sheet.creator_user_id,
    actor_label,
    'split_invite',
    'New split sheet invite',
    actor_label || ' sent "' || coalesce(sheet.title, 'a SPLIT Sheet') || '" for review.',
    'messages',
    jsonb_build_object(
      'status', sheet.status,
      'partyId', new.party_id,
      'role', new.role,
      'percentage', new.percentage
    ),
    new.split_sheet_id::text || ':split_invite:' || new.collaborator_user_id::text
  );

  return new;
end;
$$;

drop trigger if exists notify_split_collaborator_invite on public.split_sheet_collaborators;
create trigger notify_split_collaborator_invite
  after insert or update of collaborator_user_id
  on public.split_sheet_collaborators
  for each row
  execute function public.notify_split_collaborator_invite();

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
  sheet_title text;
  notification_event_type text;
  notification_title text;
  notification_body text;
  notification_action_target text := 'messages';
  notification_dedupe_prefix text;
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
  sheet_title := coalesce(nullif(p_document_payload #>> '{data,songTitle}', ''), p_document_payload ->> 'title', 'this split sheet');

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

  notification_event_type := case
    when p_action = 'local_chat' then 'chat_message'
    when p_action = 'sign' and next_status in ('Fully Signed', 'Verified and Stored', 'Executed') then 'split_verified'
    when p_action = 'sign' then 'signature'
    else p_action
  end;

  notification_title := case
    when p_action = 'local_chat' then actor_label || ' sent a message'
    when p_action = 'invite_accept' then actor_label || ' accepted the invite'
    when p_action = 'invite_decline' then actor_label || ' declined the invite'
    when p_action = 'split_accept' then actor_label || ' accepted the split'
    when p_action = 'split_reject' then actor_label || ' disputed the split'
    when p_action = 'counter_offer' then actor_label || ' sent a counter-offer'
    when p_action = 'sign' and next_status in ('Fully Signed', 'Verified and Stored', 'Executed') then 'Split sheet fully signed'
    when p_action = 'sign' then actor_label || ' signed the split'
    else 'SPLIT update'
  end;

  notification_body := case
    when p_action = 'local_chat' then coalesce(nullif(trim(p_notes), ''), 'Open Messages to read the latest note.')
    when p_action = 'invite_accept' then actor_label || ' joined "' || sheet_title || '".'
    when p_action = 'invite_decline' then actor_label || ' declined "' || sheet_title || '".'
    when p_action = 'split_accept' then actor_label || ' accepted the current terms for "' || sheet_title || '".'
    when p_action = 'split_reject' then actor_label || ' requested changes on "' || sheet_title || '".'
    when p_action = 'counter_offer' then actor_label || ' proposed new terms for "' || sheet_title || '".'
    when p_action = 'sign' and next_status in ('Fully Signed', 'Verified and Stored', 'Executed') then '"' || sheet_title || '" is now locked as a verified SPLIT record.'
    when p_action = 'sign' then actor_label || ' signed "' || sheet_title || '".'
    else 'Open SPLIT to review the latest update.'
  end;

  notification_dedupe_prefix := case
    when p_action = 'local_chat' then null
    else p_split_sheet_id::text || ':' || p_action || ':' || current_user_id::text || ':' || coalesce(next_current_proposal_id, 'sheet') || ':' || next_version::text || ':' || next_status
  end;

  perform public.notify_split_sheet_participants(
    p_split_sheet_id,
    current_user_id,
    actor_label,
    notification_event_type,
    notification_title,
    notification_body,
    notification_action_target,
    jsonb_build_object(
      'status', next_status,
      'version', next_version,
      'proposalVersionId', next_current_proposal_id,
      'notes', nullif(p_notes, '')
    ),
    notification_dedupe_prefix,
    false
  );

  select document_payload
    into stored_payload
  from public.split_sheets
  where id = p_split_sheet_id;

  return stored_payload;
end;
$$;

grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.split_notifications;
  end if;
exception
  when duplicate_object then null;
end $$;
