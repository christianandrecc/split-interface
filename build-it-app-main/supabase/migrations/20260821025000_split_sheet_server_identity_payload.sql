-- SPLIT server identity payload hardening.
-- Return the real Supabase creator_user_id with every loaded split sheet and
-- inject it into the JSON payload so the frontend can prefer auth ownership
-- over mutable username/email fields.

drop function if exists public.load_my_split_sheets();

create or replace function public.load_my_split_sheets()
returns table (
  id uuid,
  updated_at timestamptz,
  creator_user_id uuid,
  document_payload jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    sheet.id,
    sheet.updated_at,
    sheet.creator_user_id,
    jsonb_set(
      sheet.document_payload,
      '{creatorUserId}',
      to_jsonb(sheet.creator_user_id::text),
      true
    ) as document_payload
  from public.split_sheets sheet
  where sheet.creator_user_id = (select auth.uid())
    or exists (
      select 1
      from public.split_sheet_collaborators collaborator
      where collaborator.split_sheet_id = sheet.id
        and collaborator.collaborator_user_id = (select auth.uid())
        and (sheet.status <> 'Draft' or sheet.sent_at is not null)
    )
  order by sheet.updated_at desc;
$$;

grant execute on function public.load_my_split_sheets() to authenticated;
