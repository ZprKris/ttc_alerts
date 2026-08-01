import { createClient } from 'npm:@supabase/supabase-js@2.111.0'

const supabaseUrl = globalThis.Deno.env.get('SUPABASE_URL')
const publishableKey = globalThis.Deno.env.get('SUPABASE_ANON_KEY')
const allowedOrigins = new Set(
  (globalThis.Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isValidPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }

  const weekdaysAreValid =
    Array.isArray(payload.isoWeekdays) &&
    payload.isoWeekdays.length >= 1 &&
    payload.isoWeekdays.length <= 7 &&
    payload.isoWeekdays.every(
      (weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7,
    ) &&
    new Set(payload.isoWeekdays).size === payload.isoWeekdays.length

  const stationsAreValid =
    Array.isArray(payload.stationIds) &&
    payload.stationIds.length >= 1 &&
    payload.stationIds.length <= 100 &&
    payload.stationIds.every(
      (stationId) =>
        typeof stationId === 'string' &&
        stationId.length >= 1 &&
        stationId.length <= 100,
    ) &&
    new Set(payload.stationIds).size === payload.stationIds.length

  return (
    timePattern.test(payload.startTime) &&
    timePattern.test(payload.endTime) &&
    payload.startTime !== payload.endTime &&
    typeof payload.timeZone === 'string' &&
    payload.timeZone.length >= 1 &&
    payload.timeZone.length <= 100 &&
    weekdaysAreValid &&
    stationsAreValid &&
    payload.consent === true
  )
}

async function authenticate(request) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return { error: 'A verified session is required.' }
  }

  const accessToken = authorization.slice('Bearer '.length)
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (
    error ||
    !user ||
    !user.email ||
    !user.email_confirmed_at ||
    user.is_anonymous
  ) {
    return { error: 'A verified email session is required.' }
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { userClient }
}

async function loadPreferences(userClient) {
  const [subscriberResult, preferenceResult] = await Promise.all([
    userClient
      .from('subscribers')
      .select('status, consented_at, consent_version, unsubscribed_at')
      .maybeSingle(),
    userClient
      .from('monitoring_preferences')
      .select(
        'id, start_time, end_time, time_zone, crosses_midnight, updated_at, monitoring_weekdays(iso_weekday), monitoring_stations(station_id)',
      )
      .maybeSingle(),
  ])

  if (subscriberResult.error || preferenceResult.error) {
    console.error('Preference read failed', {
      subscriber: subscriberResult.error,
      preference: preferenceResult.error,
    })
    throw new Error('Preference read failed')
  }

  const preference = preferenceResult.data

  return {
    subscriptionStatus: subscriberResult.data?.status ?? 'none',
    consentedAt: subscriberResult.data?.consented_at ?? null,
    preference: preference
      ? {
          id: preference.id,
          startTime: preference.start_time.slice(0, 5),
          endTime: preference.end_time.slice(0, 5),
          timeZone: preference.time_zone,
          crossesMidnight: preference.crosses_midnight,
          updatedAt: preference.updated_at,
          isoWeekdays: preference.monitoring_weekdays
            .map((weekday) => weekday.iso_weekday)
            .sort((first, second) => first - second),
          stationIds: preference.monitoring_stations.map(
            (station) => station.station_id,
          ),
        }
      : null,
  }
}

globalThis.Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') ?? ''

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'Origin is not allowed.' }, 403, 'null')
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  if (!supabaseUrl || !publishableKey) {
    console.error('Supabase function environment is incomplete')
    return jsonResponse(
      { error: 'Service configuration is incomplete.' },
      500,
      origin,
    )
  }

  const { userClient, error: authError } = await authenticate(request)

  if (authError) {
    return jsonResponse({ error: authError }, 401, origin)
  }

  try {
    if (request.method === 'GET') {
      return jsonResponse(await loadPreferences(userClient), 200, origin)
    }

    if (request.method === 'PUT') {
      const contentLength = Number(request.headers.get('Content-Length') ?? 0)

      if (contentLength > 16_384) {
        return jsonResponse(
          { error: 'Request body is too large.' },
          413,
          origin,
        )
      }

      let payload
      try {
        payload = await request.json()
      } catch {
        return jsonResponse(
          { error: 'Request body must be valid JSON.' },
          400,
          origin,
        )
      }

      if (JSON.stringify(payload).length > 16_384 || !isValidPayload(payload)) {
        return jsonResponse(
          { error: 'Monitoring preferences are invalid.' },
          400,
          origin,
        )
      }

      const { data, error } = await userClient.rpc(
        'save_my_monitoring_preference',
        {
          p_start_time: payload.startTime,
          p_end_time: payload.endTime,
          p_time_zone: payload.timeZone,
          p_iso_weekdays: payload.isoWeekdays,
          p_station_ids: payload.stationIds,
          p_consent: payload.consent,
        },
      )

      if (error) {
        console.error('Preference save failed', error)
        return jsonResponse(
          { error: 'Monitoring preferences could not be saved.' },
          400,
          origin,
        )
      }

      const { error: emailEventError } = await userClient.rpc(
        'queue_my_subscription_email',
        { p_event_type: 'preference_confirmation' },
      )
      if (emailEventError) {
        console.error('Preference confirmation queue failed', emailEventError)
        return jsonResponse(
          { error: 'Monitoring preferences could not be finalized.' },
          500,
          origin,
        )
      }

      return jsonResponse(
        { preferenceId: data, subscriptionStatus: 'active' },
        200,
        origin,
      )
    }

    if (request.method === 'DELETE') {
      const { data, error } = await userClient.rpc('unsubscribe_my_monitoring')

      if (error) {
        console.error('Unsubscribe failed', error)
        return jsonResponse(
          { error: 'The subscription could not be removed.' },
          400,
          origin,
        )
      }

      const { error: emailEventError } = await userClient.rpc(
        'queue_my_subscription_email',
        { p_event_type: 'unsubscribe_confirmation' },
      )
      if (emailEventError) {
        console.error('Unsubscribe confirmation queue failed', emailEventError)
      }

      return jsonResponse({ unsubscribed: data === true }, 200, origin)
    }

    return jsonResponse({ error: 'Method is not allowed.' }, 405, origin)
  } catch (error) {
    console.error('Unexpected preferences function error', error)
    return jsonResponse(
      { error: 'An unexpected server error occurred.' },
      500,
      origin,
    )
  }
})
