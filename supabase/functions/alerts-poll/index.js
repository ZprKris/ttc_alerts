import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
import GtfsRealtimeBindings from 'npm:gtfs-realtime-bindings@1.1.1'
import {
  createNetworkCatalog,
  expandAffectedStations,
  extractAlertDetails,
  matchesMonitoringWindow,
} from '../_shared/alertMatching.js'

const supabaseUrl = globalThis.Deno.env.get('SUPABASE_URL')
const serviceRoleKey = globalThis.Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const pollSecret = globalThis.Deno.env.get('ALERTS_POLL_SECRET')
const feedUrl =
  globalThis.Deno.env.get('TTC_ALERTS_FEED_URL') ??
  'https://gtfsrt.ttc.ca/alerts/subway?format=binary'
const feedName = 'subway'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function requirePollSecret(request) {
  return Boolean(
    pollSecret &&
    request.headers.get('x-alerts-poll-secret') &&
    request.headers.get('x-alerts-poll-secret') === pollSecret,
  )
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function fetchFeed() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: 'application/octet-stream',
        'User-Agent': 'TTC-Station-Watch/0.1 (+service-alert-monitor)',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`TTC feed returned HTTP ${response.status}.`)
    }
    return new Uint8Array(await response.arrayBuffer())
  } finally {
    clearTimeout(timeout)
  }
}

function decodeFeed(bytes) {
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes)
}

async function loadNetworkCatalog(admin) {
  const [stationsResult, linesResult, lineStationsResult] = await Promise.all([
    admin
      .from('transit_stations')
      .select('id, name, official_stop_id, official_stop_ids')
      .eq('is_active', true),
    admin
      .from('transit_lines')
      .select('id, name, official_route_id')
      .eq('is_active', true),
    admin
      .from('transit_line_stations')
      .select('line_id, station_id, station_sequence, branch_id')
      .order('line_id')
      .order('branch_id')
      .order('station_sequence'),
  ])
  const error =
    stationsResult.error || linesResult.error || lineStationsResult.error
  if (error) {
    throw new Error('The TTC network catalog could not be loaded.')
  }

  return createNetworkCatalog({
    stations: stationsResult.data.map((station) => ({
      id: station.id,
      name: station.name,
      officialStopId: station.official_stop_id,
      officialStopIds: station.official_stop_ids,
    })),
    lines: linesResult.data.map((line) => ({
      id: line.id,
      name: line.name,
      officialRouteId: line.official_route_id,
    })),
    lineStations: lineStationsResult.data.map((lineStation) => ({
      lineId: lineStation.line_id,
      stationId: lineStation.station_id,
      sequence: lineStation.station_sequence,
      branchId: lineStation.branch_id,
    })),
  })
}

function isoTimestamp(seconds) {
  return seconds ? new Date(Number(seconds) * 1000).toISOString() : null
}

function normalizeAlertEntity(entity, catalog, now) {
  const details = extractAlertDetails(entity, now.getTime())
  const matching = expandAffectedStations(details, catalog)
  const fingerprintSource = JSON.stringify({
    ...details,
    activePeriods: details.activePeriods,
    ...matching,
  })

  return {
    details,
    matching,
    fingerprintSource,
  }
}

function activePreferenceRows(rows) {
  return rows
    .filter((row) => row.status === 'active')
    .map((row) => {
      const preference = Array.isArray(row.monitoring_preferences)
        ? row.monitoring_preferences[0]
        : row.monitoring_preferences
      if (!preference) {
        return null
      }
      return {
        userId: row.user_id,
        startTime: preference.start_time,
        endTime: preference.end_time,
        timeZone: preference.time_zone,
        isoWeekdays: (preference.monitoring_weekdays ?? []).map(
          (weekday) => weekday.iso_weekday,
        ),
        stationIds: (preference.monitoring_stations ?? []).map(
          (station) => station.station_id,
        ),
      }
    })
    .filter(Boolean)
}

async function loadActivePreferences(admin) {
  const { data, error } = await admin
    .from('subscribers')
    .select(
      'user_id, status, monitoring_preferences(start_time, end_time, time_zone, monitoring_weekdays(iso_weekday), monitoring_stations(station_id))',
    )
    .eq('status', 'active')
  if (error) {
    throw new Error('Active monitoring preferences could not be loaded.')
  }
  return activePreferenceRows(data)
}

async function insertCandidates(admin, alert, preferences, now) {
  const rows = []
  const affected = new Set(alert.affectedStationIds)

  for (const preference of preferences) {
    if (!matchesMonitoringWindow(preference, now)) {
      continue
    }
    const matchedStationIds = preference.stationIds.filter((stationId) =>
      affected.has(stationId),
    )
    if (matchedStationIds.length === 0) {
      continue
    }
    rows.push({
      user_id: preference.userId,
      alert_id: alert.alertId,
      content_hash: alert.contentHash,
      matched_station_ids: matchedStationIds,
      matched_at: now.toISOString(),
      status: 'pending',
    })
  }

  if (rows.length === 0) {
    return 0
  }

  const { error } = await admin
    .from('alert_notification_candidates')
    .upsert(rows, {
      onConflict: 'user_id,alert_id,content_hash',
      ignoreDuplicates: true,
    })
  if (error) {
    throw new Error('Alert notification candidates could not be recorded.')
  }
  return rows.length
}

async function pollAlerts() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Alert poller service configuration is incomplete.')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const now = new Date()
  const { data: run, error: runError } = await admin
    .from('alert_poll_runs')
    .insert({ feed_name: feedName, status: 'running' })
    .select('id')
    .single()
  if (runError) {
    throw new Error('Alert poll run could not be recorded.')
  }

  try {
    const [bytes, catalog, preferences] = await Promise.all([
      fetchFeed(),
      loadNetworkCatalog(admin),
      loadActivePreferences(admin),
    ])
    const feed = decodeFeed(bytes)
    const feedTimestamp = feed.header?.timestamp
      ? isoTimestamp(feed.header.timestamp)
      : null
    const normalizedAlerts = []

    for (const entity of feed.entity ?? []) {
      if (!entity.alert || !entity.id) {
        continue
      }
      const normalized = normalizeAlertEntity(entity, catalog, now)
      if (normalized.matching.affectedStationIds.length === 0) {
        continue
      }
      normalizedAlerts.push({
        alert_id: normalized.details.entityId,
        feed_name: feedName,
        content_hash: await sha256Hex(normalized.fingerprintSource),
        header_text: normalized.details.headerText,
        description_text: normalized.details.descriptionText,
        url: normalized.details.url,
        cause: normalized.details.cause,
        effect: normalized.details.effect,
        route_ids: normalized.details.routeIds,
        stop_ids: normalized.details.stopIds,
        affected_station_ids: normalized.matching.affectedStationIds,
        match_kind: normalized.matching.matchKind,
        active_periods: normalized.details.activePeriods,
        last_seen_at: now.toISOString(),
        is_active: normalized.details.isActive,
        feed_timestamp: feedTimestamp,
      })
    }

    if (normalizedAlerts.length > 0) {
      const { error } = await admin
        .from('alert_events')
        .upsert(normalizedAlerts, { onConflict: 'alert_id' })
      if (error) {
        throw new Error('Alert events could not be recorded.')
      }
    }

    await admin
      .from('alert_events')
      .update({ is_active: false })
      .eq('feed_name', feedName)
      .lt('last_seen_at', now.toISOString())

    let candidateCount = 0
    for (const alert of normalizedAlerts) {
      if (!alert.is_active) {
        continue
      }
      candidateCount += await insertCandidates(
        admin,
        {
          alertId: alert.alert_id,
          contentHash: alert.content_hash,
          affectedStationIds: alert.affected_station_ids,
        },
        preferences,
        now,
      )
    }

    await admin
      .from('alert_poll_runs')
      .update({
        status: 'succeeded',
        completed_at: new Date().toISOString(),
        feed_timestamp: feedTimestamp,
        alert_count: normalizedAlerts.length,
        candidate_count: candidateCount,
      })
      .eq('id', run.id)

    return {
      runId: run.id,
      feedTimestamp,
      alertCount: normalizedAlerts.length,
      candidateCount,
    }
  } catch (error) {
    await admin
      .from('alert_poll_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message.slice(0, 500),
      })
      .eq('id', run.id)
    throw error
  }
}

globalThis.Deno.serve(async (request) => {
  if (request.method !== 'POST' || !requirePollSecret(request)) {
    return jsonResponse({ error: 'Not found.' }, 404)
  }

  try {
    return jsonResponse({ ok: true, ...(await pollAlerts()) })
  } catch (error) {
    console.error('TTC alert poll failed', error)
    return jsonResponse({ error: 'The TTC alert poll failed.' }, 500)
  }
})
