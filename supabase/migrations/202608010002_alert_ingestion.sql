create table public.transit_lines (
  id text primary key,
  network_code text not null default 'ttc',
  official_route_id text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transit_lines_id_length check (char_length(id) between 1 and 100),
  constraint transit_lines_route_length check (char_length(official_route_id) between 1 and 100),
  constraint transit_lines_network check (network_code = 'ttc')
);

create table public.transit_line_stations (
  line_id text not null references public.transit_lines (id) on delete cascade,
  station_id text not null references public.transit_stations (id) on delete restrict,
  branch_id text not null default '',
  station_sequence integer not null,
  primary key (line_id, branch_id, station_sequence),
  unique (line_id, branch_id, station_id),
  constraint transit_line_stations_branch_length check (char_length(branch_id) <= 100),
  constraint transit_line_stations_sequence check (station_sequence > 0)
);

create index transit_line_stations_station_id_idx
  on public.transit_line_stations (station_id);

create table public.alert_events (
  alert_id text primary key,
  feed_name text not null default 'subway',
  content_hash text not null,
  header_text text not null default '',
  description_text text not null default '',
  url text not null default '',
  cause text,
  effect text,
  route_ids text[] not null default '{}',
  stop_ids text[] not null default '{}',
  affected_station_ids text[] not null default '{}',
  match_kind text not null default 'unknown',
  active_periods jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  feed_timestamp timestamptz,
  constraint alert_events_id_length check (char_length(alert_id) between 1 and 500),
  constraint alert_events_hash_length check (char_length(content_hash) = 64),
  constraint alert_events_match_kind check (match_kind in ('station', 'line', 'unknown'))
);

create index alert_events_active_idx
  on public.alert_events (is_active, last_seen_at);

create table public.alert_poll_runs (
  id uuid primary key default gen_random_uuid(),
  feed_name text not null,
  feed_timestamp timestamptz,
  fetched_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  alert_count integer not null default 0,
  candidate_count integer not null default 0,
  error_message text,
  constraint alert_poll_runs_status check (status in ('running', 'succeeded', 'failed'))
);

create index alert_poll_runs_feed_fetched_idx
  on public.alert_poll_runs (feed_name, fetched_at desc);

create table public.alert_notification_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_id text not null references public.alert_events (alert_id) on delete cascade,
  content_hash text not null,
  matched_station_ids text[] not null default '{}',
  matched_at timestamptz not null default now(),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint alert_notification_candidates_hash_length check (char_length(content_hash) = 64),
  constraint alert_notification_candidates_status check (status in ('pending', 'sent', 'skipped', 'failed')),
  unique (user_id, alert_id, content_hash)
);

create index alert_notification_candidates_pending_idx
  on public.alert_notification_candidates (status, created_at);

alter table public.transit_lines enable row level security;
alter table public.transit_lines force row level security;
alter table public.transit_line_stations enable row level security;
alter table public.transit_line_stations force row level security;
alter table public.alert_events enable row level security;
alter table public.alert_events force row level security;
alter table public.alert_poll_runs enable row level security;
alter table public.alert_poll_runs force row level security;
alter table public.alert_notification_candidates enable row level security;
alter table public.alert_notification_candidates force row level security;

revoke all on table public.transit_lines from public, anon, authenticated;
revoke all on table public.transit_line_stations from public, anon, authenticated;
revoke all on table public.alert_events from public, anon, authenticated;
revoke all on table public.alert_poll_runs from public, anon, authenticated;
revoke all on table public.alert_notification_candidates from public, anon, authenticated;
