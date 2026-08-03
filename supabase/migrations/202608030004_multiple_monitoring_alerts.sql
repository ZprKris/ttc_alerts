alter table public.monitoring_preferences
  drop constraint monitoring_preferences_user_id_key;

create index monitoring_preferences_user_id_idx
  on public.monitoring_preferences (user_id, created_at);

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
     ) <> cardinality(p_iso_weekdays) then
    raise exception using
      errcode = '22023',
      message = 'Monitoring weekdays must contain unique ISO days from 1 to 7.';
  end if;

  if p_station_ids is null
     or cardinality(p_station_ids) not between 1 and 100
     or (
       select count(distinct station_id)
       from unnest(p_station_ids) as stations(station_id)
     ) <> cardinality(p_station_ids)
     or (
       select count(*)
       from public.transit_stations
       where id = any(p_station_ids) and is_active
     ) <> cardinality(p_station_ids) then
    raise exception using
      errcode = '22023',
      message = 'Every station must be unique and active.';
  end if;

  if (
    select count(*)
    from public.monitoring_preferences
    where user_id = v_user_id
  ) >= 20 then
    raise exception using
      errcode = '22023',
      message = 'No more than 20 monitoring alerts may be active.';
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
  returning id into v_preference_id;

  insert into public.monitoring_weekdays (preference_id, iso_weekday)
  select v_preference_id, iso_weekday
  from unnest(p_iso_weekdays) as days(iso_weekday);

  insert into public.monitoring_stations (preference_id, station_id)
  select v_preference_id, station_id
  from unnest(p_station_ids) as stations(station_id);

  return v_preference_id;
end;
$$;

create or replace function public.delete_my_monitoring_preference(
  p_preference_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_count integer;
  v_remaining_count integer;
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
  where id = p_preference_id
    and user_id = v_user_id;

  get diagnostics v_deleted_count = row_count;

  select count(*)
  into v_remaining_count
  from public.monitoring_preferences
  where user_id = v_user_id;

  if v_deleted_count = 1 and v_remaining_count = 0 then
    update public.subscribers
    set
      status = 'unsubscribed',
      unsubscribed_at = now()
    where user_id = v_user_id;
  end if;

  return jsonb_build_object(
    'deleted', v_deleted_count = 1,
    'remainingCount', v_remaining_count
  );
end;
$$;

revoke all on function public.delete_my_monitoring_preference(uuid)
from public, anon, authenticated;
grant execute on function public.delete_my_monitoring_preference(uuid)
to authenticated;
