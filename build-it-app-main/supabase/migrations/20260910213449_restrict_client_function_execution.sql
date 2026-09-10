-- Narrow the API surface without removing RPCs required by the authenticated UI
-- or RLS policies. This does not replace per-action document validation.
revoke execute on function public.is_split_sheet_creator(uuid) from public, anon;
revoke execute on function public.is_split_sheet_participant(uuid) from public, anon;
revoke execute on function public.load_my_split_sheets() from public, anon;
revoke execute on function public.load_my_split_notifications(integer) from public, anon;
revoke execute on function public.mark_split_notifications_read(uuid[], uuid) from public, anon;
revoke execute on function public.upsert_split_sheet_document(jsonb, text, text) from public, anon;
revoke execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) from public, anon;

grant execute on function public.is_split_sheet_creator(uuid) to authenticated;
grant execute on function public.is_split_sheet_participant(uuid) to authenticated;
grant execute on function public.load_my_split_sheets() to authenticated;
grant execute on function public.load_my_split_notifications(integer) to authenticated;
grant execute on function public.mark_split_notifications_read(uuid[], uuid) to authenticated;
grant execute on function public.upsert_split_sheet_document(jsonb, text, text) to authenticated;
grant execute on function public.apply_split_sheet_participant_update(uuid, jsonb, text, text, text, text) to authenticated;

-- Trigger execution remains available through the installed database triggers.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.link_pending_split_invites_for_profile() from public, anon, authenticated;
revoke execute on function public.notify_split_collaborator_invite() from public, anon, authenticated;
revoke execute on function public.set_split_collaborator_user_id() from public, anon, authenticated;
