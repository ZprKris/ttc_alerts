create or replace function public.claim_alert_notification_candidates(p_limit integer default 50)
returns table (
  candidate_id uuid,
  user_id uuid,
  email text,
  alert_id text,
  content_hash text,
  header_text text,
  description_text text,
  alert_url text,
  matched_station_ids text[]
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
    candidate.matched_station_ids
  from claimed as candidate
  join auth.users as account on account.id = candidate.user_id
  join public.alert_events as event on event.alert_id = candidate.alert_id;
end;
$$;

create or replace function public.claim_subscription_email_events(p_limit integer default 50)
returns table (
  event_id uuid,
  user_id uuid,
  email text,
  event_type text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 then
    return;
  end if;

  update public.subscription_email_events
  set status = 'pending', processing_started_at = null
  where status = 'processing'
    and processing_started_at < now() - interval '15 minutes';

  return query
  with available as (
    select id
    from public.subscription_email_events
    where status = 'pending'
    order by created_at
    for update skip locked
    limit least(p_limit, 100)
  ), claimed as (
    update public.subscription_email_events as event
    set status = 'processing', processing_started_at = now()
    from available
    where event.id = available.id
    returning event.*
  )
  select event.id, event.user_id, account.email::text, event.event_type
  from claimed as event
  join auth.users as account on account.id = event.user_id;
end;
$$;
