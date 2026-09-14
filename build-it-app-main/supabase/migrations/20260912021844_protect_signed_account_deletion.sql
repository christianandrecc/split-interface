-- An Auth cascade must not remove collaborators or response evidence while the
-- signed parent document remains. Account closure needs a separate workflow.
create function split_private.protect_signed_account_deletion()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sheet public.split_sheets%rowtype;
begin
  -- Lock the parent before inspecting consent, as signing also locks this row.
  for sheet in
    select s.* from public.split_sheets s
    where s.creator_user_id = old.id
      or exists (
        select 1 from public.split_sheet_collaborators c
        where c.split_sheet_id = s.id and c.collaborator_user_id = old.id
      )
      or exists (
        select 1 from public.split_sheet_responses r
        where r.split_sheet_id = s.id and r.responder_user_id = old.id
      )
      or exists (
        select 1 from jsonb_array_elements(case
          when jsonb_typeof(s.document_payload -> 'splitSignatures') = 'array'
          then s.document_payload -> 'splitSignatures' else '[]'::jsonb end) signature
        where signature ->> 'signerUserId' = old.id::text
      )
    order by s.id
    for update of s
  loop
    if sheet.status in ('Fully Signed', 'Verified and Stored', 'Executed', 'Archived')
      or sheet.verified_at is not null
      or exists (
        select 1 from jsonb_array_elements(case
          when jsonb_typeof(sheet.document_payload -> 'splitSignatures') = 'array'
          then sheet.document_payload -> 'splitSignatures' else '[]'::jsonb end) signature
        where signature ->> 'status' = 'Signed'
      )
      or exists (
        select 1 from public.split_sheet_collaborators c
        where c.split_sheet_id = sheet.id and (c.signature_status = 'Signed' or c.signed_at is not null)
      )
      or exists (
        select 1 from public.split_sheet_responses r
        where r.split_sheet_id = sheet.id and r.response_type = 'signature'
      )
    then
      raise exception 'Account deletion is blocked to preserve signed split records. Use the reviewed account-closure process.'
        using errcode = '55000';
    end if;
  end loop;
  return old;
end;
$$;

revoke all on function split_private.protect_signed_account_deletion() from public, anon, authenticated, service_role;
create trigger protect_signed_account_deletion before delete on auth.users
for each row execute function split_private.protect_signed_account_deletion();
