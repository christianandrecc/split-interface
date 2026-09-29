-- pg_net request headers contain the Vault-backed worker bearer token.
-- Its default grants must not make queued headers readable to application users.
-- Hosted Supabase may own these grants as supabase_admin: postgres can receive a
-- warning and leave them unchanged. Verify effective privileges after applying;
-- keep net excluded from the Data API and request provider-side hardening if needed.
revoke all on table net.http_request_queue,net._http_response from public,anon,authenticated;
