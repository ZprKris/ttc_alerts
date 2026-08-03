import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const gtfsDirectory = process.env.TTC_GTFS_DIR
if (!gtfsDirectory) {
  throw new Error('Set TTC_GTFS_DIR to an extracted TTC static GTFS directory.')
}

function parseCsvLine(line) {
  const fields = []
  let field = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      fields.push(field)
      field = ''
    } else {
      field += character
    }
  }
  fields.push(field)
  return fields
}

function readCsv(fileName) {
  const lines = readFileSync(join(gtfsDirectory, fileName), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean)
  const headers = parseCsvLine(lines.shift())
  return lines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    )
  })
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanStationName(value) {
  return value
    .replace(/\s+-\s+(?:Northbound|Southbound|Eastbound|Westbound).*$/i, '')
    .replace(/\s+(?:Subway|LRT) Platform$/i, '')
    .replace(/\s+Station$/i, '')
    .trim()
}

function quoteSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

const routes = readCsv('routes.txt').filter((route) => route.route_type === '1')
const routeIds = new Set(routes.map((route) => route.route_id))
const trips = readCsv('trips.txt').filter((trip) => routeIds.has(trip.route_id))
const routeByTrip = new Map(trips.map((trip) => [trip.trip_id, trip]))
const stopTimes = readCsv('stop_times.txt').filter((stopTime) =>
  routeByTrip.has(stopTime.trip_id),
)
const stopsByTrip = new Map()
stopTimes.forEach((stopTime) => {
  const entries = stopsByTrip.get(stopTime.trip_id) ?? []
  entries.push(stopTime)
  stopsByTrip.set(stopTime.trip_id, entries)
})

const bestTripByDirection = new Map()
stopsByTrip.forEach((entries, tripId) => {
  const trip = routeByTrip.get(tripId)
  const key = `${trip.route_id}:${trip.direction_id}`
  const current = bestTripByDirection.get(key)
  if (!current || entries.length > current.entries.length) {
    bestTripByDirection.set(key, { trip, entries })
  }
})

const stopRows = new Map(
  readCsv('stops.txt').map((stop) => [stop.stop_id, stop]),
)
const stationGroups = new Map()
const lineRows = []
const lineStationRows = []

routes.forEach((route) => {
  const selected =
    bestTripByDirection.get(`${route.route_id}:0`) ??
    bestTripByDirection.get(`${route.route_id}:1`)
  if (!selected) {
    return
  }
  const orderedIds = []
  selected.entries
    .sort(
      (first, second) =>
        Number(first.stop_sequence) - Number(second.stop_sequence),
    )
    .forEach((stopTime, index) => {
      const stop = stopRows.get(stopTime.stop_id)
      if (!stop) {
        return
      }
      const name = cleanStationName(stop.stop_name)
      const stationId = slugify(name)
      const group = stationGroups.get(stationId) ?? {
        id: stationId,
        name,
        lineIds: [],
        stopIds: [],
        coordinates: [],
      }
      if (!group.lineIds.includes(`line-${route.route_id}`)) {
        group.lineIds.push(`line-${route.route_id}`)
      }
      if (!group.stopIds.includes(stop.stop_id)) {
        group.stopIds.push(stop.stop_id)
      }
      group.coordinates.push({
        lat: Number(stop.stop_lat),
        lon: Number(stop.stop_lon),
      })
      stationGroups.set(stationId, group)
      if (!orderedIds.includes(stationId)) {
        orderedIds.push(stationId)
      }
      lineStationRows.push({
        lineId: `line-${route.route_id}`,
        stationId,
        sequence: index + 1,
      })
    })
  lineRows.push({
    id: `line-${route.route_id}`,
    shortName: route.route_short_name,
    name: route.route_long_name,
    officialRouteId: route.route_id,
    color: `#${route.route_color || '64748B'}`,
    textColor: `#${route.route_text_color || 'FFFFFF'}`,
    orderedStationIds: orderedIds,
  })
})

const groups = [...stationGroups.values()]
const minLat = Math.min(
  ...groups.flatMap((group) => group.coordinates.map((point) => point.lat)),
)
const maxLat = Math.max(
  ...groups.flatMap((group) => group.coordinates.map((point) => point.lat)),
)
const minLon = Math.min(
  ...groups.flatMap((group) => group.coordinates.map((point) => point.lon)),
)
const maxLon = Math.max(
  ...groups.flatMap((group) => group.coordinates.map((point) => point.lon)),
)
const coordinate = (group) => {
  const lat =
    group.coordinates.reduce((sum, point) => sum + point.lat, 0) /
    group.coordinates.length
  const lon =
    group.coordinates.reduce((sum, point) => sum + point.lon, 0) /
    group.coordinates.length
  return {
    x: Math.round(70 + ((lon - minLon) / (maxLon - minLon)) * 930),
    y: Math.round(55 + ((maxLat - lat) / (maxLat - minLat)) * 510),
  }
}
const stations = groups.map((group) => ({
  id: group.id,
  name: group.name,
  lineIds: group.lineIds,
  officialStopId: group.stopIds[0],
  officialStopIds: group.stopIds,
  position: coordinate(group),
  labelPlacement: group.lineIds.length > 1 ? 'top-right' : 'right',
  ...(group.lineIds.length > 1
    ? { interchange: { lineIds: group.lineIds } }
    : {}),
}))
const connections = lineRows.flatMap((line) =>
  line.orderedStationIds.slice(1).map((stationId, index) => ({
    id: `${line.id}-${index}`,
    lineId: line.id,
    source: line.orderedStationIds[index],
    target: stationId,
  })),
)
const network = {
  metadata: {
    id: 'ttc-subway',
    name: 'Toronto TTC subway',
    coordinateSystem: 'schematic-from-GTFS-coordinates',
    isPrototype: false,
    source: 'TTC Routes and Schedules GTFS via Toronto Open Data',
  },
  lines: lineRows.map(({ officialRouteId, ...line }) => ({
    ...line,
    officialRouteId,
  })),
  stations,
  connections,
}

const outputDirectory = join(process.cwd(), 'src', 'data')
mkdirSync(outputDirectory, { recursive: true })
writeFileSync(
  join(outputDirectory, 'ttcNetwork.js'),
  `export const networkMetadata = Object.freeze(${JSON.stringify(network.metadata, null, 2)})\n\nexport const lines = ${JSON.stringify(network.lines, null, 2)}\n\nexport const stations = ${JSON.stringify(network.stations, null, 2)}\n\nexport const connections = ${JSON.stringify(network.connections, null, 2)}\n\nexport const sampleNetwork = Object.freeze({ metadata: networkMetadata, lines, stations, connections })\n`,
)

const seedLines = [
  '-- Generated from the official TTC static GTFS snapshot. Run the importer again when the feed is refreshed.',
  'insert into public.transit_stations (id, network_code, name, official_stop_id, official_stop_ids)',
  'values',
  stations
    .map(
      (station) =>
        `  (${quoteSql(station.id)}, 'ttc', ${quoteSql(station.name)}, ${quoteSql(station.officialStopId)}, ARRAY[${station.officialStopIds.map(quoteSql).join(', ')}])`,
    )
    .join(',\n'),
  'on conflict (id) do update set name = excluded.name, official_stop_id = excluded.official_stop_id, official_stop_ids = excluded.official_stop_ids, is_active = true;',
  '',
  'insert into public.transit_lines (id, network_code, official_route_id, name)',
  'values',
  lineRows
    .map(
      (line) =>
        `  (${quoteSql(line.id)}, 'ttc', ${quoteSql(line.officialRouteId)}, ${quoteSql(line.name)})`,
    )
    .join(',\n'),
  'on conflict (id) do update set official_route_id = excluded.official_route_id, name = excluded.name, is_active = true;',
  '',
  'insert into public.transit_line_stations (line_id, station_id, branch_id, station_sequence)',
  'values',
  lineStationRows
    .map(
      (row) =>
        `  (${quoteSql(row.lineId)}, ${quoteSql(row.stationId)}, '', ${row.sequence})`,
    )
    .join(',\n'),
  'on conflict (line_id, branch_id, station_sequence) do update set station_id = excluded.station_id;',
  '',
].join('\n')
writeFileSync(join(process.cwd(), 'supabase', 'seed-ttc.sql'), `${seedLines}\n`)

console.log(
  `Generated ${stations.length} stations across ${lineRows.length} subway lines.`,
)
