-- Development-only prototype stations. Production station data is added in Phase 9.
insert into public.transit_stations (id, network_code, name, official_stop_id)
values
  ('northgate', 'ttc', 'Northgate', 'sample-northgate'),
  ('cedar', 'ttc', 'Cedar', 'sample-cedar'),
  ('central', 'ttc', 'Central', 'sample-central'),
  ('harbour', 'ttc', 'Harbour', 'sample-harbour'),
  ('west-park', 'ttc', 'West Park', 'sample-west-park'),
  ('market', 'ttc', 'Market', 'sample-market'),
  ('riverside', 'ttc', 'Riverside', 'sample-riverside'),
  ('hillcrest', 'ttc', 'Hillcrest', 'sample-hillcrest')
on conflict (id) do update
set
  name = excluded.name,
  network_code = excluded.network_code,
  official_stop_id = excluded.official_stop_id,
  is_active = true;

insert into public.transit_lines (id, network_code, official_route_id, name)
values
  ('line-amber', 'ttc', 'sample-amber', 'Amber line'),
  ('line-green', 'ttc', 'sample-green', 'Green line')
on conflict (id) do update
set
  official_route_id = excluded.official_route_id,
  name = excluded.name,
  is_active = true;

insert into public.transit_line_stations (line_id, station_id, branch_id, station_sequence)
values
  ('line-amber', 'northgate', '', 1),
  ('line-amber', 'cedar', '', 2),
  ('line-amber', 'central', '', 3),
  ('line-amber', 'harbour', '', 4),
  ('line-green', 'west-park', '', 1),
  ('line-green', 'central', '', 2),
  ('line-green', 'market', '', 3),
  ('line-green', 'riverside', '', 4),
  ('line-green', 'market', 'green-hill-branch', 1),
  ('line-green', 'hillcrest', 'green-hill-branch', 2)
on conflict (line_id, branch_id, station_sequence) do update
set station_id = excluded.station_id;
