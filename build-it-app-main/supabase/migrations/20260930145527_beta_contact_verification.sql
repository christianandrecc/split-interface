-- Activation is separate from rollout: configure and test SMS before setting required=true.
create table split_private.phone_verification_config (
  singleton boolean primary key default true check (singleton),
  required boolean not null default false
);
insert into split_private.phone_verification_config(singleton) values (true);
alter table split_private.phone_verification_config enable row level security;
revoke all on split_private.phone_verification_config from public, anon, authenticated, service_role;

create function public.my_phone_verification_status()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in again.' using errcode='42501'; end if;
  select jsonb_build_object('userId',u.id,'required',c.required,
    'verified',u.phone_confirmed_at is not null and nullif(u.phone,'') is not null,
    'phone',coalesce(u.phone,''),'pendingPhone',coalesce(to_jsonb(u)->>'phone_change','')) into result
  from auth.users u cross join split_private.phone_verification_config c where u.id=auth.uid();
  if result is null then raise exception 'Sign in again.' using errcode='42501'; end if;
  return result;
end;
$$;

create function public.sync_my_verified_phone(p_country_code text,p_national_number text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_country_code !~ '^\+[1-9][0-9]{0,2}$' or p_national_number !~ '^[0-9]{4,14}$'
    or not exists(select 1 from auth.users where id=auth.uid() and phone_confirmed_at is not null
      and public.split_invite_digits(phone)=public.split_invite_digits(p_country_code||p_national_number)) then
    raise exception 'Verify this phone number first.' using errcode='42501';
  end if;
  update public.profiles set phone_country_code=p_country_code,phone_number=p_national_number,
    profile_data=coalesce(profile_data,'{}'::jsonb)||jsonb_build_object('phoneCountryCode',p_country_code,'phoneNumber',p_national_number)
    where user_id=auth.uid() and (phone_country_code is distinct from p_country_code or phone_number is distinct from p_national_number
      or profile_data->>'phoneCountryCode' is distinct from p_country_code or profile_data->>'phoneNumber' is distinct from p_national_number);
end;
$$;

create function split_private.require_verified_phone_for_split()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null and (select required from split_private.phone_verification_config where singleton)
    and not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null
      and phone_confirmed_at is not null and nullif(phone,'') is not null) then
    raise exception 'Verify your phone number before creating or updating a split.' using errcode='42501';
  end if;
  return new;
end;
$$;
create trigger require_verified_phone_for_split before insert or update on public.split_sheets
for each row execute function split_private.require_verified_phone_for_split();

create function split_private.require_beta_invite_identity()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.invite_method not in ('creator','username','email') then
    raise exception 'Use email or @username for beta invitations.' using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger require_beta_invite_identity before insert or update of invite_method,invite_value,invite_phone
on public.split_sheet_collaborators for each row execute function split_private.require_beta_invite_identity();

revoke all on function split_private.require_verified_phone_for_split(),split_private.require_beta_invite_identity() from public,anon,authenticated;
revoke all on function public.my_phone_verification_status(),public.sync_my_verified_phone(text,text) from public,anon;
grant execute on function public.my_phone_verification_status(),public.sync_my_verified_phone(text,text) to authenticated;
