-- Unresolvable handles must not hold up confirmed recipients behind them.
create or replace function split_private.claim_invitation_emails(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare jobs jsonb; waiting record; recipient text; limited boolean;
begin
  if split_private.invitation_worker_authorized(p_token) is not true then raise exception 'Worker authorization required.' using errcode='42501'; end if;
  if not (select enabled from split_private.invitation_email_config where singleton) then return '[]'::jsonb; end if;
  if not pg_try_advisory_xact_lock(hashtextextended('split-invitation-email-worker',0)) then return '[]'::jsonb; end if;
  update split_private.invitation_emails set status='skipped',error_code='recipient_unavailable',updated_at=now()
    where status='waiting_address' and created_at < now()-interval '7 days';
  for waiting in select j.*,split_private.invitation_email_address(j.collaborator_id) as resolved_email
    from split_private.invitation_emails j where j.status='waiting_address'
      and length(split_private.invitation_email_address(j.collaborator_id))<=254
      and split_private.invitation_email_address(j.collaborator_id) ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
    order by j.created_at limit 100 loop
    recipient := waiting.resolved_email;
    perform pg_advisory_xact_lock(hashtextextended('invitation-email:' || waiting.creator_user_id::text,0));
    select count(*)>=5 into limited from split_private.invitation_emails
      where creator_user_id=waiting.creator_user_id and recipient_email=recipient
        and status in ('queued','processing','sent') and greatest(created_at,updated_at)>now()-interval '1 day';
    update split_private.invitation_emails set recipient_email=recipient,status=case when limited then 'skipped' else 'queued' end,
      error_code=case when limited then 'invitation_limit' end,updated_at=now() where id=waiting.id;
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
revoke all on function split_private.claim_invitation_emails(text) from public,anon,authenticated;
grant execute on function split_private.claim_invitation_emails(text) to service_role;
