-- Hosted-only extensions. Delivery remains disabled until explicitly activated.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

alter table split_private.invitation_email_config add column worker_url text
  check (worker_url ~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/send-split-invitations$');

do $$
declare worker_secret text;
begin
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='split_invitation_worker_token';
  if worker_secret is null then
    worker_secret := encode(extensions.gen_random_bytes(32),'hex');
    perform vault.create_secret(worker_secret,'split_invitation_worker_token','Private scheduled invitation sender');
  end if;
  update split_private.invitation_email_config set worker_token_hash=encode(extensions.digest(worker_secret,'sha256'),'hex');
end;
$$;

create function split_private.dispatch_invitation_emails(p_health boolean default false)
returns bigint language plpgsql security definer set search_path='' as $$
declare cfg split_private.invitation_email_config%rowtype; worker_secret text; request_id bigint;
begin
  select * into cfg from split_private.invitation_email_config where singleton;
  if cfg.worker_url is null or (not cfg.enabled and not p_health) then return null; end if;
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name='split_invitation_worker_token';
  if worker_secret is null then raise exception 'Invitation worker secret is not configured.'; end if;
  select net.http_post(
    url:=cfg.worker_url || case when p_health then '?health=1' else '' end,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || worker_secret),
    body:='{}'::jsonb,timeout_milliseconds:=140000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function split_private.dispatch_invitation_emails(boolean) from public,anon,authenticated,service_role;
select cron.schedule('split-invitation-emails','* * * * *','select split_private.dispatch_invitation_emails();');
