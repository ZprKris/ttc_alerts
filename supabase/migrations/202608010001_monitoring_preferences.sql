create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.transit_stations (
  id text primary key,
  network_code text not null default 'ttc',
  name text not null,
  official_stop_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_stations_id_length check (char_length(id) between 1 and 100),
  constraint transit_stations_name_length check (char_length(name) between 1 and 160),
  constraint transit_stations_network check (network_code = 'ttc')
);

create table public.subscribers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null,
  consent_version text not null,
  consented_at timestamptz not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscribers_status check (status in ('active', 'unsubscribed')),
  constraint subscribers_consent_version_length
    check (char_length(consent_version) between 1 and 80),
  constraint subscribers_status_timestamp check (
    (status = 'active' and unsubscribed_at is null)
    or (status = 'unsubscribed' and unsubscribed_at is not null)
  )
);

create table public.monitoring_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.subscribers (user_id) on delete cascade,
  start_time time without time zone not null,
  end_time time without time zone not null,
  time_zone text not null,
  crosses_midnight boolean generated always as (end_time < start_time) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitoring_preferences_time_range check (start_time <> end_time),
  constraint monitoring_preferences_time_zone_length
    check (char_length(time_zone) between 1 and 100)
);

create table public.monitoring_weekdays (
  preference_id uuid not null references public.monitoring_preferences (id) on delete cascade,
  iso_weekday smallint not null,
  primary key (preference_id, iso_weekday),
  constraint monitoring_weekdays_iso_range check (iso_weekday between 1 and 7)
);

create table public.monitoring_stations (
  preference_id uuid not null references public.monitoring_preferences (id) on delete cascade,
  station_id text not null references public.transit_stations (id) on delete restrict,
  primary key (preference_id, station_id)
);

create index monitoring_stations_station_id_idx
  on public.monitoring_stations (station_id);

create index monitoring_weekdays_iso_weekday_idx
  on public.monitoring_weekdays (iso_weekday);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger transit_stations_set_updated_at
before update on public.transit_stations
for each row execute function private.set_updated_at();

create trigger subscribers_set_updated_at
before update on public.subscribers
for each row execute function private.set_updated_at();

create trigger monitoring_preferences_set_updated_at
before update on public.monitoring_preferences
for each row execute function private.set_updated_at();

alter table public.transit_stations enable row level security;
alter table public.transit_stations force row level security;
alter table public.subscribers enable row level security;
alter table public.subscribers force row level security;
alter table public.monitoring_preferences enable row level security;
alter table public.monitoring_preferences force row level security;
alter table public.monitoring_weekdays enable row level security;
alter table public.monitoring_weekdays force row level security;
alter table public.monitoring_stations enable row level security;
alter table public.monitoring_stations force row level security;

revoke all on table public.transit_stations from public, anon, authenticated;
revoke all on table public.subscribers from public, anon, authenticated;
revoke all on table public.monitoring_preferences from public, anon, authenticated;
revoke all on table public.monitoring_weekdays from public, anon, authenticated;
revoke all on table public.monitoring_stations from public, anon, authenticated;

grant select on table public.transit_stations to anon, authenticated;
grant select on table public.subscribers to authenticated;
grant select on table public.monitoring_preferences to authenticated;
grant select on table public.monitoring_weekdays to authenticated;
grant select on table public.monitoring_stations to authenticated;

create policy "Active stations are readable"
on public.transit_stations
for select
to anon, authenticated
using (is_active);

create policy "Subscribers read their own profile"
on public.subscribers
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Subscribers read their own preference"
on public.monitoring_preferences
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

create policy "Subscribers read their own weekdays"
on public.monitoring_weekdays
for select
to authenticated
using (
  exists (
    select 1
    from public.monitoring_preferences as preference
    where preference.id = monitoring_weekdays.preference_id
      and preference.user_id = (select auth.uid())
  )
);

create policy "Subscribers read their own stations"
on public.monitoring_stations
for select
to authenticated
using (
  exists (
    select 1
    from public.monitoring_preferences as preference
    where preference.id = monitoring_stations.preference_id
      and preference.user_id = (select auth.uid())
  )
);

create or replace function public.save_my_monitoring_preference(
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_time_zone text,
  p_iso_weekdays smallint[],
  p_station_ids text[],
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_preference_id uuid;
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if v_user_id is null
     or v_is_anonymous
     or coalesce(auth.jwt() ->> 'email', '') = ''
     or not exists (
       select 1
       from auth.users
       where id = v_user_id
         and email is not null
         and email_confirmed_at is not null
     ) then
    raise exception using
      errcode = '42501',
      message = 'A verified email session is required.';
  end if;

  if p_consent is distinct from true then
    raise exception using
      errcode = '22023',
      message = 'Email consent is required.';
  end if;

  if p_start_time is null or p_end_time is null or p_start_time = p_end_time then
    raise exception using
      errcode = '22023',
      message = 'Start and end times must be present and different.';
  end if;

  if p_time_zone is null
     or char_length(p_time_zone) > 100
     or not exists (
       select 1
       from pg_catalog.pg_timezone_names
       where name = p_time_zone
     ) then
    raise exception using
      errcode = '22023',
      message = 'A supported IANA time zone is required.';
  end if;

  if p_iso_weekdays is null
     or cardinality(p_iso_weekdays) not between 1 and 7
     or exists (
       select 1
       from unnest(p_iso_weekdays) as days(iso_weekday)
       where iso_weekday not between 1 and 7
     )
     or (
       select count(distinct iso_weekday)
       from unnest(p_iso_weekdays) as days(iso_weekday)
     )
       <> cardinality(p_iso_weekdays) then
    raise exception using
      errcode = '22023',
      message = 'Monitoring weekdays must contain unique ISO days from 1 to 7.';
  end if;

  if p_station_ids is null
     or cardinality(p_station_ids) not between 1 and 100
     or (
       select count(distinct station_id)
       from unnest(p_station_ids) as stations(station_id)
     )
       <> cardinality(p_station_ids)
     or (
       select count(*)
       from public.transit_stations
       where id = any(p_station_ids) and is_active
     ) <> cardinality(p_station_ids) then
    raise exception using
      errcode = '22023',
      message = 'Every station must be unique and active.';
  end if;

  insert into public.subscribers (
    user_id,
    status,
    consent_version,
    consented_at,
    unsubscribed_at
  )
  values (
    v_user_id,
    'active',
    'v1-2026-08-01',
    now(),
    null
  )
  on conflict (user_id) do update
  set
    status = excluded.status,
    consent_version = excluded.consent_version,
    consented_at = excluded.consented_at,
    unsubscribed_at = null;

  insert into public.monitoring_preferences (
    user_id,
    start_time,
    end_time,
    time_zone
  )
  values (
    v_user_id,
    p_start_time,
    p_end_time,
    p_time_zone
  )
  on conflict (user_id) do update
  set
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    time_zone = excluded.time_zone
  returning id into v_preference_id;

  delete from public.monitoring_weekdays
  where preference_id = v_preference_id;

  insert into public.monitoring_weekdays (preference_id, iso_weekday)
  select v_preference_id, iso_weekday
  from unnest(p_iso_weekdays) as days(iso_weekday);

  delete from public.monitoring_stations
  where preference_id = v_preference_id;

  insert into public.monitoring_stations (preference_id, station_id)
  select v_preference_id, station_id
  from unnest(p_station_ids) as stations(station_id);

  return v_preference_id;
end;
$$;

create or replace function public.unsubscribe_my_monitoring()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_count integer;
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if v_user_id is null
     or v_is_anonymous
     or coalesce(auth.jwt() ->> 'email', '') = ''
     or not exists (
       select 1
       from auth.users
       where id = v_user_id
         and email is not null
         and email_confirmed_at is not null
     ) then
    raise exception using
      errcode = '42501',
      message = 'A verified email session is required.';
  end if;

  delete from public.monitoring_preferences
  where user_id = v_user_id;

  update public.subscribers
  set
    status = 'unsubscribed',
    unsubscribed_at = now()
  where user_id = v_user_id;

  get diagnostics v_updated_count = row_count;
  return v_updated_count = 1;
end;
$$;

revoke all on function public.save_my_monitoring_preference(
  time without time zone,
  time without time zone,
  text,
  smallint[],
  text[],
  boolean
) from public, anon, authenticated;

revoke all on function public.unsubscribe_my_monitoring()
from public, anon, authenticated;

grant execute on function public.save_my_monitoring_preference(
  time without time zone,
  time without time zone,
  text,
  smallint[],
  text[],
  boolean
) to authenticated;

grant execute on function public.unsubscribe_my_monitoring()
to authenticated;
