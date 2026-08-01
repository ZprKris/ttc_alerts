alter table public.transit_stations
  add column if not exists official_stop_ids text[] not null default '{}';

update public.transit_stations
set official_stop_ids = array[official_stop_id]
where official_stop_id is not null
  and cardinality(official_stop_ids) = 0;

alter table public.transit_stations
  add constraint transit_stations_official_stop_ids_length
  check (cardinality(official_stop_ids) <= 100);
