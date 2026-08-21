-- SPLIT split-sheet RLS hardening.
-- Browser clients should read participant-scoped data and write through validated
-- SECURITY DEFINER RPCs only. This keeps raw split-sheet tables from becoming
-- an accidental source of truth during beta testing.

grant select on public.split_sheets to authenticated;
grant select on public.split_sheet_collaborators to authenticated;
grant select on public.split_sheet_proposal_versions to authenticated;
grant select on public.split_sheet_responses to authenticated;
grant select on public.split_sheet_audit_records to authenticated;
grant select on public.split_sheet_contract_deliveries to authenticated;
grant select on public.split_notifications to authenticated;

revoke insert, update, delete on public.split_sheets from anon, authenticated;
revoke insert, update, delete on public.split_sheet_collaborators from anon, authenticated;
revoke insert, update, delete on public.split_sheet_proposal_versions from anon, authenticated;
revoke insert, update, delete on public.split_sheet_responses from anon, authenticated;
revoke insert, update, delete on public.split_sheet_audit_records from anon, authenticated;
revoke insert, update, delete on public.split_sheet_contract_deliveries from anon, authenticated;
revoke insert, update, delete on public.split_notifications from anon, authenticated;

drop policy if exists "split sheet creators can insert" on public.split_sheets;
drop policy if exists "split sheet creators can update" on public.split_sheets;
drop policy if exists "split creators manage collaborators" on public.split_sheet_collaborators;
drop policy if exists "split creators manage proposals" on public.split_sheet_proposal_versions;
drop policy if exists "split participants can respond" on public.split_sheet_responses;
drop policy if exists "split participants can insert audit" on public.split_sheet_audit_records;
drop policy if exists "split creators manage audit" on public.split_sheet_audit_records;
drop policy if exists "split contract creators can queue delivery" on public.split_sheet_contract_deliveries;

revoke execute on function public.resolve_split_sheet_collaborators(uuid) from public, anon, authenticated;
revoke execute on function public.resolve_all_pending_split_sheet_collaborators() from public, anon, authenticated;
revoke execute on function public.notify_split_sheet_event(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.load_my_split_sheets() to authenticated;
grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated;
grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;
grant execute on function public.load_my_split_notifications(integer) to authenticated;
grant execute on function public.mark_split_notifications_read(uuid[], uuid) to authenticated;
