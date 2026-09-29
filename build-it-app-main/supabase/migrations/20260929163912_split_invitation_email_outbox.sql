-- Delivery is opt-in at rollout. Existing invitations are never backfilled.
create table split_private.invitation_email_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  activated_at timestamptz,
  worker_token_hash text
);
insert into split_private.invitation_email_config(singleton) values (true);

create table split_private.invitation_emails (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null unique references public.split_sheet_collaborators(id) on delete cascade,
  split_sheet_id uuid not null references public.split_sheets(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text,
  work_title text not null,
  inviter_name text not null,
  status text not null check (status in ('waiting_address','queued','processing','sent','skipped','failed')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  available_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitation_emails_queue_idx on split_private.invitation_emails(available_at,created_at)
  where status in ('queued','processing');
create index invitation_emails_creator_idx on split_private.invitation_emails(creator_user_id,created_at);
create index invitation_emails_sheet_idx on split_private.invitation_emails(split_sheet_id);
alter table split_private.invitation_email_config enable row level security;
alter table split_private.invitation_emails enable row level security;
revoke all on split_private.invitation_email_config, split_private.invitation_emails from public,anon,authenticated,service_role;

create function split_private.invitation_email_address(p_collaborator uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when c.collaborator_user_id is not null then
      case when u.email_confirmed_at is not null then lower(trim(u.email)) end
    when c.invite_method = 'email' then lower(trim(c.invite_value))
    end
  from public.split_sheet_collaborators c
  left join auth.users u on u.id = c.collaborator_user_id
  where c.id = p_collaborator and c.invite_method <> 'creator';
$$;

create function split_private.queue_invitation_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  sheet public.split_sheets%rowtype;
  cfg split_private.invitation_email_config%rowtype;
  recipient text;
  state text := 'queued';
  limited boolean := false;
begin
  select * into cfg from split_private.invitation_email_config where singleton;
  if not cfg.enabled or cfg.activated_at is null or new.invite_method = 'creator' or new.invite_status <> 'Pending' then return new; end if;
  select * into sheet from public.split_sheets where id = new.split_sheet_id;
  if sheet.sent_at is null or sheet.sent_at < cfg.activated_at or sheet.status = 'Draft'
    or sheet.verified_at is not null or sheet.status in ('Fully Signed','Verified and Stored','Executed','Archived')
    or sheet.creator_user_id = new.collaborator_user_id
    or not exists (select 1 from auth.users where id=sheet.creator_user_id and email_confirmed_at is not null) then return new; end if;
  recipient := split_private.invitation_email_address(new.id);
  if recipient is not null and (length(recipient) > 254 or recipient !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$') then
    recipient := null;
  end if;
  if recipient is null then state := 'waiting_address'; end if;
  -- Serialize the abuse cap without ever failing an otherwise valid split save.
  perform pg_advisory_xact_lock(hashtextextended('invitation-email:' || sheet.creator_user_id::text,0));
  if not exists (select 1 from split_private.invitation_emails where collaborator_id=new.id) then
    select count(*) >= 100 or count(*) filter(where recipient_email=recipient) >= 5 into limited
    from split_private.invitation_emails where creator_user_id=sheet.creator_user_id and created_at > now()-interval '1 day';
  end if;
  if limited then state := 'skipped'; end if;
  insert into split_private.invitation_emails(collaborator_id,split_sheet_id,creator_user_id,recipient_email,work_title,inviter_name,status,error_code)
  values(new.id,sheet.id,sheet.creator_user_id,recipient,left(coalesce(nullif(sheet.work_title,''),sheet.title),200),
    coalesce((select left(coalesce(nullif(display_name,''),nullif(username,''),'A collaborator'),100) from public.profiles where user_id=sheet.creator_user_id),'A collaborator'),
    state,case when limited then 'invitation_limit' end)
  on conflict(collaborator_id) do nothing;
  return new;
end;
$$;
create trigger queue_invitation_email after insert or update of collaborator_user_id,invite_status
on public.split_sheet_collaborators for each row execute function split_private.queue_invitation_email();

create function split_private.invitation_worker_authorized(p_token text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(length(p_token)=64 and worker_token_hash=encode(extensions.digest(p_token,'sha256'),'hex'),false)
  from split_private.invitation_email_config where singleton;
$$;

create function split_private.claim_invitation_emails(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare jobs jsonb; waiting record; recipient text; limited boolean;
begin
  if split_private.invitation_worker_authorized(p_token) is not true then raise exception 'Worker authorization required.' using errcode='42501'; end if;
  if not (select enabled from split_private.invitation_email_config where singleton) then return '[]'::jsonb; end if;
  if not pg_try_advisory_xact_lock(hashtextextended('split-invitation-email-worker',0)) then return '[]'::jsonb; end if;
  -- Username invitations may predate the recipient's email confirmation.
  update split_private.invitation_emails set status='skipped',error_code='recipient_unavailable',updated_at=now()
    where status='waiting_address' and created_at < now()-interval '7 days';
  for waiting in select * from split_private.invitation_emails where status='waiting_address' order by created_at limit 100 loop
    recipient := split_private.invitation_email_address(waiting.collaborator_id);
    if length(recipient)<=254 and recipient ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$' then
      perform pg_advisory_xact_lock(hashtextextended('invitation-email:' || waiting.creator_user_id::text,0));
      select count(*)>=5 into limited from split_private.invitation_emails
        where creator_user_id=waiting.creator_user_id and recipient_email=recipient
          and status in ('queued','processing','sent') and created_at>now()-interval '1 day';
      update split_private.invitation_emails set recipient_email=recipient,status=case when limited then 'skipped' else 'queued' end,
        error_code=case when limited then 'invitation_limit' end,updated_at=now() where id=waiting.id;
    end if;
  end loop;
  update split_private.invitation_emails set status='failed',error_code='retry_window_expired',lease_id=null,lease_until=null,updated_at=now()
  where status in ('queued','processing') and (attempts >= 8 or first_attempt_at < now()-interval '20 hours')
    and (lease_until is null or lease_until < now());
  update split_private.invitation_emails set status='queued',lease_id=null,lease_until=null
  where status='processing' and lease_until < now();
  if exists(select 1 from split_private.invitation_emails where status='processing') then return '[]'::jsonb; end if;
  with candidates as (
    select id from split_private.invitation_emails where status='queued' and available_at<=now()
    order by created_at limit 5 for update skip locked
  ), claimed as (
    update split_private.invitation_emails j set status='processing',lease_id=gen_random_uuid(),lease_until=now()+interval '5 minutes',
      attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),updated_at=now()
    from candidates c where j.id=c.id returning j.id,j.lease_id
  ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'leaseId',lease_id)),'[]'::jsonb) into jobs from claimed;
  return jobs;
end;
$$;

create function split_private.prepare_invitation_email(p_token text,p_job uuid,p_lease uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare job split_private.invitation_emails%rowtype; valid boolean;
begin
  if split_private.invitation_worker_authorized(p_token) is not true then raise exception 'Worker authorization required.' using errcode='42501'; end if;
  select * into job from split_private.invitation_emails where id=p_job and status='processing' and lease_id=p_lease and lease_until>now() for update;
  if not found then return null; end if;
  select cfg.enabled and c.invite_status='Pending' and s.sent_at is not null and s.verified_at is null
    and s.status not in ('Draft','Fully Signed','Verified and Stored','Executed','Archived')
    and split_private.invitation_email_address(c.id)=job.recipient_email
    and exists(select 1 from auth.users where id=s.creator_user_id and email_confirmed_at is not null)
    into valid from public.split_sheet_collaborators c join public.split_sheets s on s.id=c.split_sheet_id
    cross join split_private.invitation_email_config cfg where c.id=job.collaborator_id and cfg.singleton;
  if valid is not true then
    update split_private.invitation_emails set status='skipped',error_code='invitation_no_longer_pending',lease_id=null,lease_until=null,updated_at=now() where id=job.id;
    return null;
  end if;
  return jsonb_build_object('id',job.id,'splitId',job.split_sheet_id,'to',job.recipient_email,'workTitle',job.work_title,'inviterName',job.inviter_name);
end;
$$;

create function split_private.finish_invitation_email(p_token text,p_job uuid,p_lease uuid,p_outcome text,p_provider_id text default null,p_error_code text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare job split_private.invitation_emails%rowtype;
begin
  if split_private.invitation_worker_authorized(p_token) is not true then raise exception 'Worker authorization required.' using errcode='42501'; end if;
  if p_outcome not in ('sent','retry','failed') or coalesce(p_error_code,'') !~ '^[a-z0-9_]{0,64}$'
    or (p_outcome='sent' and (p_provider_id is null or p_provider_id !~ '^[a-zA-Z0-9_-]{1,128}$')) then raise exception 'Invalid delivery result.' using errcode='22023'; end if;
  select * into job from split_private.invitation_emails where id=p_job and status='processing' and lease_id=p_lease and lease_until>now() for update;
  if not found then return false; end if;
  update split_private.invitation_emails set
    status=case when p_outcome='retry' and job.attempts<8 and job.first_attempt_at>now()-interval '20 hours' then 'queued' when p_outcome='retry' then 'failed' else p_outcome end,
    available_at=now()+make_interval(secs=>least(3600,60*power(2,job.attempts)::integer)),
    provider_id=p_provider_id,error_code=p_error_code,lease_id=null,lease_until=null,updated_at=now() where id=job.id;
  return true;
end;
$$;

revoke all on function split_private.invitation_email_address(uuid),split_private.queue_invitation_email(),
  split_private.invitation_worker_authorized(text),split_private.claim_invitation_emails(text),
  split_private.prepare_invitation_email(text,uuid,uuid),split_private.finish_invitation_email(text,uuid,uuid,text,text,text)
from public,anon,authenticated;
grant usage on schema split_private to service_role;
grant execute on function split_private.invitation_worker_authorized(text),split_private.claim_invitation_emails(text),
  split_private.prepare_invitation_email(text,uuid,uuid),split_private.finish_invitation_email(text,uuid,uuid,text,text,text) to service_role;

create function public.verify_split_invitation_worker(p_token text) returns boolean language sql security invoker set search_path='' as $$select split_private.invitation_worker_authorized(p_token)$$;
create function public.claim_split_invitation_emails(p_token text) returns jsonb language sql security invoker set search_path='' as $$select split_private.claim_invitation_emails(p_token)$$;
create function public.prepare_split_invitation_email(p_token text,p_job uuid,p_lease uuid) returns jsonb language sql security invoker set search_path='' as $$select split_private.prepare_invitation_email(p_token,p_job,p_lease)$$;
create function public.finish_split_invitation_email(p_token text,p_job uuid,p_lease uuid,p_outcome text,p_provider_id text default null,p_error_code text default null)
returns boolean language sql security invoker set search_path='' as $$select split_private.finish_invitation_email(p_token,p_job,p_lease,p_outcome,p_provider_id,p_error_code)$$;
revoke all on function public.verify_split_invitation_worker(text),public.claim_split_invitation_emails(text),public.prepare_split_invitation_email(text,uuid,uuid),
  public.finish_split_invitation_email(text,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.verify_split_invitation_worker(text),public.claim_split_invitation_emails(text),public.prepare_split_invitation_email(text,uuid,uuid),
  public.finish_split_invitation_email(text,uuid,uuid,text,text,text) to service_role;
