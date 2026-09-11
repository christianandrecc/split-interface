create table public.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_split_method text not null default 'Custom' check (default_split_method in ('Equal', 'Custom')),
  default_territory text not null default 'Worldwide'
    check (length(trim(default_territory)) between 1 and 100 and default_territory = trim(default_territory)),
  default_user_role text not null default 'Songwriter' check (default_user_role in (
    'Songwriter', 'Composer', 'Lyricist', 'Topliner', 'Beatmaker (Composition)',
    'Producer (Composition Only)', 'Arranger', 'Translator / Adapter', 'Contributor', 'Other')),
  include_audit_trail boolean not null default true,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.account_settings enable row level security;
revoke all on public.account_settings from public, anon, authenticated;
grant select on public.account_settings to authenticated;
grant insert (user_id, default_split_method, default_territory, default_user_role, include_audit_trail)
  on public.account_settings to authenticated;
grant update (default_split_method, default_territory, default_user_role, include_audit_trail)
  on public.account_settings to authenticated;

create policy "Read own settings" on public.account_settings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own settings" on public.account_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own settings" on public.account_settings for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function split_private.advance_settings_revision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function split_private.advance_settings_revision() from public, anon, authenticated;
create trigger advance_settings_revision before update on public.account_settings
  for each row execute function split_private.advance_settings_revision();
