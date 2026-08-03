alter table public.alert_notification_candidates
  add column processing_started_at timestamptz,
  add column sent_at timestamptz,
  add column last_error text;

alter table public.alert_notification_candidates
  drop constraint alert_notification_candidates_status;

alter table public.alert_notification_candidates
  add constraint alert_notification_candidates_status
  check (status in ('pending', 'processing', 'sent', 'skipped', 'failed'));

create index alert_notification_candidates_processing_idx
  on public.alert_notification_candidates (status, processing_started_at);

create table public.subscription_email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  status text not null default 'pending',
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint subscription_email_events_type
    check (event_type in ('preference_confirmation', 'unsubscribe_confirmation')),
  constraint subscription_email_events_status
    check (status in ('pending', 'processing', 'sent', 'failed'))
);

create index subscription_email_events_processing_idx
  on public.subscription_email_events (status, processing_started_at);

alter table public.subscription_email_events enable row level security;
alter table public.subscription_email_events force row level security;
revoke all on table public.subscription_email_events from public, anon, authenticated;

create or replace function public.queue_my_subscription_email(p_event_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
  v_is_anonymous boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if v_user_id is null
     or v_is_anonymous
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

  if p_event_type not in ('preference_confirmation', 'unsubscribe_confirmation') then
    raise exception using
      errcode = '22023',
      message = 'Unsupported subscription email event.';
  end if;

  insert into public.subscription_email_events (user_id, event_type)
  values (v_user_id, p_event_type)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.queue_my_subscription_email(text)
from public, anon, authenticated;
grant execute on function public.queue_my_subscription_email(text)
to authenticated;

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

create or replace function public.mark_alert_notification_sent(p_candidate_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.alert_notification_candidates
  set status = 'sent', sent_at = now(), processing_started_at = null
  where id = p_candidate_id and status = 'processing';
  return found;
end;
$$;

create or replace function public.mark_alert_notification_failed(
  p_candidate_id uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.alert_notification_candidates
  set status = 'failed',
      last_error = left(coalesce(p_error, 'Delivery failed.'), 500),
      processing_started_at = null
  where id = p_candidate_id and status = 'processing';
  return found;
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

create or replace function public.mark_subscription_email_sent(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscription_email_events
  set status = 'sent', sent_at = now(), processing_started_at = null
  where id = p_event_id and status = 'processing';
  return found;
end;
$$;

create or replace function public.mark_subscription_email_failed(
  p_event_id uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscription_email_events
  set status = 'failed',
      last_error = left(coalesce(p_error, 'Delivery failed.'), 500),
      processing_started_at = null
  where id = p_event_id and status = 'processing';
  return found;
end;
$$;

revoke all on function public.claim_alert_notification_candidates(integer)
from public, anon, authenticated;
revoke all on function public.mark_alert_notification_sent(uuid)
from public, anon, authenticated;
revoke all on function public.mark_alert_notification_failed(uuid, text)
from public, anon, authenticated;
revoke all on function public.claim_subscription_email_events(integer)
from public, anon, authenticated;
revoke all on function public.mark_subscription_email_sent(uuid)
from public, anon, authenticated;
revoke all on function public.mark_subscription_email_failed(uuid, text)
from public, anon, authenticated;

grant execute on function public.claim_alert_notification_candidates(integer)
to service_role;
grant execute on function public.mark_alert_notification_sent(uuid)
to service_role;
grant execute on function public.mark_alert_notification_failed(uuid, text)
to service_role;
grant execute on function public.claim_subscription_email_events(integer)
to service_role;
grant execute on function public.mark_subscription_email_sent(uuid)
to service_role;
grant execute on function public.mark_subscription_email_failed(uuid, text)
to service_role;
