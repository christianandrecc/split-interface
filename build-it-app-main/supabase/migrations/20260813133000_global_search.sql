-- SPLIT global search.
-- Adds a safe profile search endpoint for the dashboard search bar.
-- It can match by public handle/name and exact email, but returns only public profile fields.

create or replace function public.search_split_profiles(
  search_query text,
  result_limit integer default 8
)
returns table (
  user_id uuid,
  username text,
  display_name text,
  role_tags text,
  profile_image_url text,
  profile_location text
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      lower(trim(both '@' from coalesce(search_query, ''))) as query_text,
      greatest(1, least(coalesce(result_limit, 8), 20)) as max_results
  )
  select
    profile.user_id,
    profile.username,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(profile.stage_name, ''),
      nullif(profile.pka_names, ''),
      nullif(profile.username, ''),
      'SPLIT user'
    ) as display_name,
    profile.role_tags,
    profile.profile_image_url,
    coalesce(
      nullif(profile.profile_location, ''),
      nullif(
        concat_ws(
          ', ',
          nullif(profile.city, ''),
          nullif(profile.state, '')
        ),
        ''
      ),
      nullif(profile.country, '')
    ) as profile_location
  from public.profiles profile
  cross join normalized
  where length(normalized.query_text) >= 2
    and profile.user_id is not null
    and lower(coalesce(profile.profile_visibility, 'public')) <> 'private'
    and (
      lower(coalesce(profile.username, '')) like normalized.query_text || '%'
      or lower(coalesce(profile.display_name, '')) like normalized.query_text || '%'
      or lower(coalesce(profile.stage_name, '')) like normalized.query_text || '%'
      or lower(coalesce(profile.pka_names, '')) like normalized.query_text || '%'
      or lower(coalesce(profile.email, '')) = normalized.query_text
    )
  order by
    case
      when lower(coalesce(profile.username, '')) = normalized.query_text then 0
      when lower(coalesce(profile.username, '')) like normalized.query_text || '%' then 1
      when lower(coalesce(profile.display_name, '')) like normalized.query_text || '%' then 2
      when lower(coalesce(profile.stage_name, '')) like normalized.query_text || '%' then 3
      else 4
    end,
    profile.updated_at desc
  limit (select max_results from normalized);
$$;

revoke all on function public.search_split_profiles(text, integer) from public, anon, authenticated;
grant execute on function public.search_split_profiles(text, integer) to authenticated;
