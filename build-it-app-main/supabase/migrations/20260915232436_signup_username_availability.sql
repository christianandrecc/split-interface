-- Exact handle availability only. Signup cannot use profile SELECT policies,
-- and must never receive the identity or private details behind a taken handle.
create function public.is_signup_username_available(p_username text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_username is null or p_username !~ '^[a-z0-9._]{3,24}$' then false
    else not exists (
      select 1 from public.profiles p
      where lower(p.username) = p_username
        and p.username is not null and p.username <> ''
    )
  end;
$$;
revoke all on function public.is_signup_username_available(text) from public;
grant execute on function public.is_signup_username_available(text) to anon, authenticated;

-- The unique index remains authoritative when two signups race. This read
-- neither reserves a username nor changes existing accounts or invitations.
