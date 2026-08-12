-- SPLIT full profile signup storage.
-- Ensures email-confirmation signups populate public.profiles from auth metadata.

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone_number text,
  add column if not exists legal_name text,
  add column if not exists stage_name text,
  add column if not exists ipi_number text,
  add column if not exists pro_affiliation text,
  add column if not exists publisher_name text,
  add column if not exists tax_id text,
  add column if not exists address_street text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_zip text,
  add column if not exists address_country text,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists profile_image_url text,
  add column if not exists role_tags text,
  add column if not exists social_instagram text,
  add column if not exists social_tiktok text,
  add column if not exists social_x text,
  add column if not exists social_website text,
  add column if not exists profile_location text,
  add column if not exists profile_visibility text,
  add column if not exists legal_first_name text,
  add column if not exists legal_middle_name text,
  add column if not exists legal_last_name text,
  add column if not exists pka_names text,
  add column if not exists phone_country_code text,
  add column if not exists legal_address text,
  add column if not exists address_line text,
  add column if not exists zip_code text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists mlc_number text,
  add column if not exists custom_pro_name text,
  add column if not exists publishing_status text,
  add column if not exists publisher_ipi text,
  add column if not exists publisher_pro text,
  add column if not exists publishing_share text,
  add column if not exists admin_company_name text,
  add column if not exists admin_ipi text,
  add column if not exists admin_collection_share text,
  add column if not exists publisher_contact text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists privacy_policy_version text,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

create or replace function public.split_meta_text(metadata jsonb, snake_key text, camel_key text default null)
returns text
language sql
stable
set search_path = public
as $$
  select nullif(coalesce(metadata ->> snake_key, metadata ->> camel_key), '');
$$;

create or replace function public.split_meta_timestamptz(metadata jsonb, snake_key text, camel_key text default null)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select nullif(coalesce(metadata ->> snake_key, metadata ->> camel_key), '')::timestamptz;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_payload jsonb := case
    when jsonb_typeof(metadata -> 'profile_data') = 'object' then metadata -> 'profile_data'
    else '{}'::jsonb
  end;
  metadata_with_payload jsonb := profile_payload || metadata;
begin
  insert into public.profiles (
    user_id,
    username,
    display_name,
    profile_image_url,
    role_tags,
    social_instagram,
    social_tiktok,
    social_x,
    social_website,
    profile_location,
    profile_visibility,
    email,
    phone_country_code,
    phone_number,
    legal_name,
    legal_first_name,
    legal_middle_name,
    legal_last_name,
    pka_names,
    stage_name,
    legal_address,
    address_street,
    address_line,
    address_city,
    address_state,
    address_zip,
    address_country,
    zip_code,
    city,
    state,
    country,
    mlc_number,
    pro_affiliation,
    ipi_number,
    custom_pro_name,
    publishing_status,
    publisher_name,
    publisher_ipi,
    publisher_pro,
    publishing_share,
    admin_company_name,
    admin_ipi,
    admin_collection_share,
    publisher_contact,
    terms_accepted_at,
    terms_version,
    privacy_acknowledged_at,
    privacy_policy_version,
    profile_data
  )
  values (
    new.id,
    public.split_meta_text(metadata_with_payload, 'username'),
    public.split_meta_text(metadata_with_payload, 'display_name', 'displayName'),
    public.split_meta_text(metadata_with_payload, 'profile_image_url', 'profileImageUrl'),
    public.split_meta_text(metadata_with_payload, 'role_tags', 'roleTags'),
    public.split_meta_text(metadata_with_payload, 'social_instagram', 'socialInstagram'),
    public.split_meta_text(metadata_with_payload, 'social_tiktok', 'socialTikTok'),
    public.split_meta_text(metadata_with_payload, 'social_x', 'socialX'),
    public.split_meta_text(metadata_with_payload, 'social_website', 'socialWebsite'),
    public.split_meta_text(metadata_with_payload, 'profile_location', 'profileLocation'),
    public.split_meta_text(metadata_with_payload, 'profile_visibility', 'profileVisibility'),
    coalesce(public.split_meta_text(metadata_with_payload, 'email', 'emailAddress'), new.email),
    public.split_meta_text(metadata_with_payload, 'phone_country_code', 'phoneCountryCode'),
    coalesce(public.split_meta_text(metadata_with_payload, 'phone_number', 'phoneNumber'), new.phone),
    public.split_meta_text(metadata_with_payload, 'legal_name', 'legalName'),
    public.split_meta_text(metadata_with_payload, 'legal_first_name', 'legalFirstName'),
    public.split_meta_text(metadata_with_payload, 'legal_middle_name', 'legalMiddleName'),
    public.split_meta_text(metadata_with_payload, 'legal_last_name', 'legalLastName'),
    public.split_meta_text(metadata_with_payload, 'pka_names', 'pkaNames'),
    coalesce(
      public.split_meta_text(metadata_with_payload, 'stage_name', 'stageName'),
      public.split_meta_text(metadata_with_payload, 'pka_names', 'pkaNames'),
      public.split_meta_text(metadata_with_payload, 'display_name', 'displayName')
    ),
    public.split_meta_text(metadata_with_payload, 'legal_address', 'legalAddress'),
    public.split_meta_text(metadata_with_payload, 'address_street', 'addressLine'),
    public.split_meta_text(metadata_with_payload, 'address_line', 'addressLine'),
    public.split_meta_text(metadata_with_payload, 'address_city', 'city'),
    public.split_meta_text(metadata_with_payload, 'address_state', 'state'),
    public.split_meta_text(metadata_with_payload, 'address_zip', 'zipCode'),
    public.split_meta_text(metadata_with_payload, 'address_country', 'country'),
    public.split_meta_text(metadata_with_payload, 'zip_code', 'zipCode'),
    public.split_meta_text(metadata_with_payload, 'city'),
    public.split_meta_text(metadata_with_payload, 'state'),
    public.split_meta_text(metadata_with_payload, 'country'),
    public.split_meta_text(metadata_with_payload, 'mlc_number', 'mlcNumber'),
    public.split_meta_text(metadata_with_payload, 'pro_affiliation', 'proAffiliation'),
    public.split_meta_text(metadata_with_payload, 'ipi_number', 'ipiNumber'),
    public.split_meta_text(metadata_with_payload, 'custom_pro_name', 'customProName'),
    public.split_meta_text(metadata_with_payload, 'publishing_status', 'publishingStatus'),
    public.split_meta_text(metadata_with_payload, 'publisher_name', 'publisherName'),
    public.split_meta_text(metadata_with_payload, 'publisher_ipi', 'publisherIpi'),
    public.split_meta_text(metadata_with_payload, 'publisher_pro', 'publisherPro'),
    public.split_meta_text(metadata_with_payload, 'publishing_share', 'publishingShare'),
    public.split_meta_text(metadata_with_payload, 'admin_company_name', 'adminCompanyName'),
    public.split_meta_text(metadata_with_payload, 'admin_ipi', 'adminIpi'),
    public.split_meta_text(metadata_with_payload, 'admin_collection_share', 'adminCollectionShare'),
    public.split_meta_text(metadata_with_payload, 'publisher_contact', 'publisherContact'),
    public.split_meta_timestamptz(metadata_with_payload, 'terms_accepted_at', 'termsAcceptedAt'),
    public.split_meta_text(metadata_with_payload, 'terms_version', 'termsVersion'),
    public.split_meta_timestamptz(metadata_with_payload, 'privacy_acknowledged_at', 'privacyAcknowledgedAt'),
    public.split_meta_text(metadata_with_payload, 'privacy_policy_version', 'privacyPolicyVersion'),
    jsonb_strip_nulls(profile_payload)
  )
  on conflict (user_id) do update
    set username = coalesce(excluded.username, public.profiles.username),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        profile_image_url = coalesce(excluded.profile_image_url, public.profiles.profile_image_url),
        role_tags = coalesce(excluded.role_tags, public.profiles.role_tags),
        social_instagram = coalesce(excluded.social_instagram, public.profiles.social_instagram),
        social_tiktok = coalesce(excluded.social_tiktok, public.profiles.social_tiktok),
        social_x = coalesce(excluded.social_x, public.profiles.social_x),
        social_website = coalesce(excluded.social_website, public.profiles.social_website),
        profile_location = coalesce(excluded.profile_location, public.profiles.profile_location),
        profile_visibility = coalesce(excluded.profile_visibility, public.profiles.profile_visibility),
        email = coalesce(excluded.email, public.profiles.email),
        phone_country_code = coalesce(excluded.phone_country_code, public.profiles.phone_country_code),
        phone_number = coalesce(excluded.phone_number, public.profiles.phone_number),
        legal_name = coalesce(excluded.legal_name, public.profiles.legal_name),
        legal_first_name = coalesce(excluded.legal_first_name, public.profiles.legal_first_name),
        legal_middle_name = coalesce(excluded.legal_middle_name, public.profiles.legal_middle_name),
        legal_last_name = coalesce(excluded.legal_last_name, public.profiles.legal_last_name),
        pka_names = coalesce(excluded.pka_names, public.profiles.pka_names),
        stage_name = coalesce(excluded.stage_name, public.profiles.stage_name),
        legal_address = coalesce(excluded.legal_address, public.profiles.legal_address),
        address_street = coalesce(excluded.address_street, public.profiles.address_street),
        address_line = coalesce(excluded.address_line, public.profiles.address_line),
        address_city = coalesce(excluded.address_city, public.profiles.address_city),
        address_state = coalesce(excluded.address_state, public.profiles.address_state),
        address_zip = coalesce(excluded.address_zip, public.profiles.address_zip),
        address_country = coalesce(excluded.address_country, public.profiles.address_country),
        zip_code = coalesce(excluded.zip_code, public.profiles.zip_code),
        city = coalesce(excluded.city, public.profiles.city),
        state = coalesce(excluded.state, public.profiles.state),
        country = coalesce(excluded.country, public.profiles.country),
        mlc_number = coalesce(excluded.mlc_number, public.profiles.mlc_number),
        pro_affiliation = coalesce(excluded.pro_affiliation, public.profiles.pro_affiliation),
        ipi_number = coalesce(excluded.ipi_number, public.profiles.ipi_number),
        custom_pro_name = coalesce(excluded.custom_pro_name, public.profiles.custom_pro_name),
        publishing_status = coalesce(excluded.publishing_status, public.profiles.publishing_status),
        publisher_name = coalesce(excluded.publisher_name, public.profiles.publisher_name),
        publisher_ipi = coalesce(excluded.publisher_ipi, public.profiles.publisher_ipi),
        publisher_pro = coalesce(excluded.publisher_pro, public.profiles.publisher_pro),
        publishing_share = coalesce(excluded.publishing_share, public.profiles.publishing_share),
        admin_company_name = coalesce(excluded.admin_company_name, public.profiles.admin_company_name),
        admin_ipi = coalesce(excluded.admin_ipi, public.profiles.admin_ipi),
        admin_collection_share = coalesce(excluded.admin_collection_share, public.profiles.admin_collection_share),
        publisher_contact = coalesce(excluded.publisher_contact, public.profiles.publisher_contact),
        terms_accepted_at = coalesce(excluded.terms_accepted_at, public.profiles.terms_accepted_at),
        terms_version = coalesce(excluded.terms_version, public.profiles.terms_version),
        privacy_acknowledged_at = coalesce(excluded.privacy_acknowledged_at, public.profiles.privacy_acknowledged_at),
        privacy_policy_version = coalesce(excluded.privacy_policy_version, public.profiles.privacy_policy_version),
        profile_data = case
          when excluded.profile_data = '{}'::jsonb then public.profiles.profile_data
          else excluded.profile_data
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

update public.profiles
set legal_name = coalesce(legal_name, public.split_meta_text(profile_data, 'legalName')),
    legal_first_name = coalesce(legal_first_name, public.split_meta_text(profile_data, 'legalFirstName')),
    legal_middle_name = coalesce(legal_middle_name, public.split_meta_text(profile_data, 'legalMiddleName')),
    legal_last_name = coalesce(legal_last_name, public.split_meta_text(profile_data, 'legalLastName')),
    role_tags = coalesce(role_tags, public.split_meta_text(profile_data, 'roleTags')),
    pro_affiliation = coalesce(pro_affiliation, public.split_meta_text(profile_data, 'proAffiliation')),
    ipi_number = coalesce(ipi_number, public.split_meta_text(profile_data, 'ipiNumber')),
    custom_pro_name = coalesce(custom_pro_name, public.split_meta_text(profile_data, 'customProName')),
    publishing_status = coalesce(publishing_status, public.split_meta_text(profile_data, 'publishingStatus')),
    publisher_name = coalesce(publisher_name, public.split_meta_text(profile_data, 'publisherName')),
    publisher_ipi = coalesce(publisher_ipi, public.split_meta_text(profile_data, 'publisherIpi')),
    publisher_pro = coalesce(publisher_pro, public.split_meta_text(profile_data, 'publisherPro')),
    publishing_share = coalesce(publishing_share, public.split_meta_text(profile_data, 'publishingShare')),
    address_line = coalesce(address_line, public.split_meta_text(profile_data, 'addressLine')),
    address_street = coalesce(address_street, public.split_meta_text(profile_data, 'addressLine')),
    city = coalesce(city, public.split_meta_text(profile_data, 'city')),
    address_city = coalesce(address_city, public.split_meta_text(profile_data, 'city')),
    state = coalesce(state, public.split_meta_text(profile_data, 'state')),
    address_state = coalesce(address_state, public.split_meta_text(profile_data, 'state')),
    zip_code = coalesce(zip_code, public.split_meta_text(profile_data, 'zipCode')),
    address_zip = coalesce(address_zip, public.split_meta_text(profile_data, 'zipCode')),
    country = coalesce(country, public.split_meta_text(profile_data, 'country')),
    address_country = coalesce(address_country, public.split_meta_text(profile_data, 'country')),
    legal_address = coalesce(legal_address, public.split_meta_text(profile_data, 'legalAddress')),
    pka_names = coalesce(pka_names, public.split_meta_text(profile_data, 'pkaNames')),
    stage_name = coalesce(stage_name, public.split_meta_text(profile_data, 'pkaNames'), display_name),
    phone_country_code = coalesce(phone_country_code, public.split_meta_text(profile_data, 'phoneCountryCode')),
    phone_number = coalesce(phone_number, public.split_meta_text(profile_data, 'phoneNumber')),
    terms_accepted_at = coalesce(terms_accepted_at, public.split_meta_timestamptz(profile_data, 'termsAcceptedAt')),
    terms_version = coalesce(terms_version, public.split_meta_text(profile_data, 'termsVersion')),
    privacy_acknowledged_at = coalesce(privacy_acknowledged_at, public.split_meta_timestamptz(profile_data, 'privacyAcknowledgedAt')),
    privacy_policy_version = coalesce(privacy_policy_version, public.split_meta_text(profile_data, 'privacyPolicyVersion')),
    updated_at = now()
where profile_data <> '{}'::jsonb;
