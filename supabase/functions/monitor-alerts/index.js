const supabaseUrl = globalThis.Deno.env.get('SUPABASE_URL')
const pollSecret = globalThis.Deno.env.get('ALERTS_POLL_SECRET')
const deliverySecret = globalThis.Deno.env.get('NOTIFICATIONS_SEND_SECRET')

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function configuredServerKeys() {
  try {
    const keys = JSON.parse(
      globalThis.Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}',
    )
    return Object.values(keys).filter(
      (key) => typeof key === 'string' && key.length > 0,
    )
  } catch {
    return []
  }
}

function isAuthorized(request) {
  const suppliedKey = request.headers.get('apikey')
  return Boolean(suppliedKey && configuredServerKeys().includes(suppliedKey))
}

async function invoke(functionName, headerName, secret) {
  const result = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [headerName]: secret,
    },
    body: '{}',
  })
  const body = await result.json().catch(() => null)
  return { status: result.status, ok: result.ok, body }
}

async function runPipeline() {
  if (!supabaseUrl || !pollSecret || !deliverySecret) {
    throw new Error('The monitoring pipeline configuration is incomplete.')
  }

  const poll = await invoke('alerts-poll', 'x-alerts-poll-secret', pollSecret)
  if (!poll.ok) {
    return response({ ok: false, stage: 'poll', poll }, 502)
  }

  const delivery = await invoke(
    'notifications-send',
    'x-notifications-send-secret',
    deliverySecret,
  )
  if (!delivery.ok || Number(delivery.body?.failed ?? 0) > 0) {
    return response({ ok: false, stage: 'delivery', poll, delivery }, 502)
  }

  return response({ ok: true, poll: poll.body, delivery: delivery.body })
}

globalThis.Deno.serve(async (request) => {
  if (request.method !== 'POST' || !isAuthorized(request)) {
    return response({ error: 'Not found.' }, 404)
  }

  try {
    return await runPipeline()
  } catch (error) {
    console.error('Scheduled monitoring pipeline failed', error)
    return response({ error: 'The monitoring pipeline failed.' }, 500)
  }
})
