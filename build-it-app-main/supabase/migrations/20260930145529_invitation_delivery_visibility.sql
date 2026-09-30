-- Minimal signed webhook receipts. Never store recipient addresses or raw webhook bodies.
create table split_private.invitation_delivery_events (
  event_id text primary key,
  provider_id text not null,
  event_type text not null check(event_type in ('delivered','delivery_delayed','bounced','complained','failed','suppressed')),
  event_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index invitation_delivery_provider_idx on split_private.invitation_delivery_events(provider_id);
create index invitation_delivery_received_idx on split_private.invitation_delivery_events(received_at);
create index invitation_emails_provider_idx on split_private.invitation_emails(provider_id) where provider_id is not null;
alter table split_private.invitation_delivery_events enable row level security;
revoke all on split_private.invitation_delivery_events from public,anon,authenticated,service_role;
alter table split_private.invitation_emails add column manual_retry_at timestamptz;

create function split_private.invitation_delivery_state(p_provider_id text)
returns text language sql stable security definer set search_path='' as $$
  select event_type from split_private.invitation_delivery_events where provider_id=p_provider_id
  order by case event_type when 'complained' then 6 when 'suppressed' then 5 when 'bounced' then 4
    when 'failed' then 3 when 'delivered' then 2 else 1 end desc,event_at desc limit 1;
$$;

create function split_private.notify_invitation_email_problem(p_job uuid)
returns void language plpgsql security definer set search_path='' as $$
declare job split_private.invitation_emails%rowtype;
begin
  select * into job from split_private.invitation_emails where id=p_job;
  if found and (job.status='failed' or job.error_code in ('invitation_limit','recipient_unavailable')
    or split_private.invitation_delivery_state(job.provider_id) in ('bounced','complained','failed','suppressed')) then
    perform public.insert_split_notification(job.creator_user_id,job.split_sheet_id,null,'SPLIT','split_updated',
      'Invitation email needs attention','An invitation email for "'||job.work_title||'" needs review. Check email status in Messages.',
      'messages','{}'::jsonb,'invitation-email-problem/'||job.id::text);
  end if;
end;
$$;

create function split_private.invitation_email_result_changed()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.provider_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('invitation-provider:'||new.provider_id,0));
  end if;
  perform split_private.notify_invitation_email_problem(new.id);
  return new;
end;
$$;
create trigger invitation_email_result_changed after insert or update of status,provider_id,error_code
on split_private.invitation_emails for each row execute function split_private.invitation_email_result_changed();

create function public.record_split_invitation_delivery(p_event_id text,p_provider_id text,p_event_type text,p_event_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare job record;
begin
  if p_event_id is null or p_event_id !~ '^[a-zA-Z0-9_-]{1,200}$'
    or p_provider_id is null or p_provider_id !~ '^[a-zA-Z0-9_-]{1,128}$'
    or p_event_type is null or p_event_type not in ('delivered','delivery_delayed','bounced','complained','failed','suppressed')
    or p_event_at is null or p_event_at>now()+interval '10 minutes' then
    raise exception 'Invalid delivery event.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('invitation-provider:'||p_provider_id,0));
  -- Resend may also report Auth emails. Keep unmatched receipts briefly for worker races, not forever.
  delete from split_private.invitation_delivery_events e where e.received_at<now()-interval '30 days'
    and not exists(select 1 from split_private.invitation_emails j where j.provider_id=e.provider_id);
  insert into split_private.invitation_delivery_events(event_id,provider_id,event_type,event_at)
    values(p_event_id,p_provider_id,p_event_type,p_event_at) on conflict(event_id) do nothing;
  -- Events can arrive before the sending worker stores its provider ID.
  for job in select id from split_private.invitation_emails where provider_id=p_provider_id loop
    perform split_private.notify_invitation_email_problem(job.id);
  end loop;
  return true;
end;
$$;
revoke all on function public.record_split_invitation_delivery(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_split_invitation_delivery(text,text,text,timestamptz) to service_role;

create function split_private.invitation_email_can_retry(p_job uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(j.status='failed' and j.provider_id is null and j.error_code in ('resend_400','resend_401','resend_403','resend_422')
    and j.attempts<8 and j.first_attempt_at>now()-interval '20 hours'
    and (j.manual_retry_at is null or j.manual_retry_at<now()-interval '5 minutes')
    and c.invite_status='Pending' and s.verified_at is null and s.sent_at is not null
    and s.status not in ('Draft','Fully Signed','Verified and Stored','Executed','Archived')
    and split_private.invitation_email_address(c.id)=j.recipient_email
    and (select enabled from split_private.invitation_email_config where singleton),false)
  from split_private.invitation_emails j join public.split_sheet_collaborators c on c.id=j.collaborator_id
    join public.split_sheets s on s.id=j.split_sheet_id where j.id=p_job;
$$;

create function public.load_split_invitation_delivery(p_split_sheet_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.split_sheets where id=p_split_sheet_id and creator_user_id=auth.uid()) then
    raise exception 'Only the split creator can view invitation delivery.' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'partyId',c.party_id,
    'name',coalesce(nullif(c.display_name,''),nullif(c.username,''),'Collaborator'),
    'status',coalesce(split_private.invitation_delivery_state(j.provider_id),j.status),
    'updatedAt',j.updated_at,'canRetry',coalesce(split_private.invitation_email_can_retry(j.id),false),
    'reason',case when j.error_code='invitation_limit' then 'limit' when j.error_code='recipient_unavailable' then 'unavailable'
      when j.error_code='invitation_no_longer_pending' then 'closed' when j.error_code in ('retry_window_expired','network_error','invalid_provider_response')
        or j.error_code like 'resend_5%' then 'review' else null end
  ) order by c.signing_order,c.created_at),'[]'::jsonb) into result
  from public.split_sheet_collaborators c left join split_private.invitation_emails j on j.collaborator_id=c.id
  where c.split_sheet_id=p_split_sheet_id and c.invite_method<>'creator';
  return result;
end;
$$;

create function public.retry_split_invitation_email(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare job split_private.invitation_emails%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in again.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('invitation-email:'||auth.uid()::text,0));
  select * into job from split_private.invitation_emails where id=p_job_id and creator_user_id=auth.uid() for update;
  if not found then raise exception 'Invitation unavailable.' using errcode='42501'; end if;
  if split_private.invitation_email_can_retry(job.id) is not true then
    raise exception 'This email cannot be safely retried. Refresh its status or contact SPLIT.' using errcode='22023';
  end if;
  -- Keep the same job, body, idempotency key and first-attempt deadline. Never reset an ambiguous send.
  update split_private.invitation_emails set status='queued',available_at=now(),manual_retry_at=now(),updated_at=now()
    where id=job.id;
  return true;
end;
$$;
revoke all on function public.load_split_invitation_delivery(uuid),public.retry_split_invitation_email(uuid) from public,anon;
grant execute on function public.load_split_invitation_delivery(uuid),public.retry_split_invitation_email(uuid) to authenticated;
revoke all on function split_private.invitation_delivery_state(text),split_private.notify_invitation_email_problem(uuid),
  split_private.invitation_email_result_changed(),split_private.invitation_email_can_retry(uuid) from public,anon,authenticated,service_role;
