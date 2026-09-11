-- Auth owns the account email. Pending changes remain in auth.users.email_change.
-- Internal triggers only: no client may invoke these privileged functions.
create function split_private.canonical_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare account_email text;
begin
  select lower(trim(u.email)) into account_email from auth.users u where u.id = new.user_id;
  new.email := nullif(account_email, '');
  new.profile_data := jsonb_set(
    case when jsonb_typeof(new.profile_data) = 'object' then new.profile_data else '{}'::jsonb end,
    '{emailAddress}', to_jsonb(coalesce(account_email, '')), true);
  return new;
end;
$$;
revoke all on function split_private.canonical_profile_email() from public, anon, authenticated;
create trigger canonical_profile_email before insert or update on public.profiles
  for each row execute function split_private.canonical_profile_email();

create function split_private.sync_profile_account_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = nullif(lower(trim(new.email)), '')
  where user_id = new.id;
  return new;
end;
$$;
revoke all on function split_private.sync_profile_account_email() from public, anon, authenticated;
create trigger sync_profile_account_email after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function split_private.sync_profile_account_email();

-- Repair account profiles only. Signed documents and their snapshots are not rewritten.
update public.profiles p set email = nullif(lower(trim(u.email)), '')
from auth.users u where u.id = p.user_id
  and (p.email is distinct from nullif(lower(trim(u.email)), '')
    or p.profile_data ->> 'emailAddress' is distinct from coalesce(lower(trim(u.email)), ''));
