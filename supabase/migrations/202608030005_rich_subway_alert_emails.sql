drop function if exists public.claim_alert_notification_candidates(integer);

create function public.claim_alert_notification_candidates(p_limit integer default 50)
returns table (
  candidate_id uuid,
  user_id uuid,
  email text,
  alert_id text,
  content_hash text,
  header_text text,
  description_text text,
  alert_url text,
  effect text,
  active_periods jsonb,
  route_ids text[],
  matched_station_ids text[],
  matched_station_names text[]
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 then
    return;
  end if;

  update public.alert_notification_candidates
  set status = 'pending', processing_started_at = null
  where status = 'processing'
    and processing_started_at < now() - interval '15 minutes';

  return query
  with available as (
    select id
    from public.alert_notification_candidates
    where status = 'pending'
    order by created_at
    for update skip locked
    limit least(p_limit, 100)
  ), claimed as (
    update public.alert_notification_candidates as candidate
    set status = 'processing', processing_started_at = now()
    from available
    where candidate.id = available.id
    returning candidate.*
  )
  select
    candidate.id,
    candidate.user_id,
    account.email::text,
    candidate.alert_id,
    candidate.content_hash,
    event.header_text,
    event.description_text,
    event.url,
    event.effect,
    event.active_periods,
    event.route_ids,
    candidate.matched_station_ids,
    array(
      select station.name
      from unnest(candidate.matched_station_ids)
        with ordinality as matched(station_id, position)
      join public.transit_stations as station on station.id = matched.station_id
      order by matched.position
    )::text[]
  from claimed as candidate
  join auth.users as account on account.id = candidate.user_id
  join public.alert_events as event on event.alert_id = candidate.alert_id;
end;
$$;

revoke all on function public.claim_alert_notification_candidates(integer)
from public, anon, authenticated;
grant execute on function public.claim_alert_notification_candidates(integer)
to service_role;

create or replace function public.mark_alert_notification_skipped(
  p_candidate_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.alert_notification_candidates
  set status = 'skipped',
      last_error = left(coalesce(p_reason, 'Notification excluded.'), 500),
      processing_started_at = null
  where id = p_candidate_id and status = 'processing';
  return found;
end;
$$;

revoke all on function public.mark_alert_notification_skipped(uuid, text)
from public, anon, authenticated;
grant execute on function public.mark_alert_notification_skipped(uuid, text)
to service_role;
