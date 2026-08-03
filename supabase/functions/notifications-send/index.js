import { createClient } from 'npm:@supabase/supabase-js@2.111.0'
import {
  alertEmail,
  isTtcSubwayRouteAlert,
} from '../_shared/notificationEmail.js'

const supabaseUrl = globalThis.Deno.env.get('SUPABASE_URL')
const serviceRoleKey = globalThis.Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const deliverySecret = globalThis.Deno.env.get('NOTIFICATIONS_SEND_SECRET')
const resendApiKey = globalThis.Deno.env.get('RESEND_API_KEY')
const resendFromEmail = globalThis.Deno.env.get('RESEND_FROM_EMAIL')
const publicAppUrl = globalThis.Deno.env.get('PUBLIC_APP_URL')

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function appManageUrl() {
  return `${publicAppUrl.replace(/\/$/, '')}/?manage=1`
}

function subscriptionEmail(event) {
  const manageUrl = appManageUrl()
  const isUnsubscribe = event.event_type === 'unsubscribe_confirmation'
  const subject = isUnsubscribe
    ? '[TTC Station Watch] Monitoring unsubscribed'
    : '[TTC Station Watch] Monitoring preferences confirmed'
  const heading = isUnsubscribe
    ? 'Your TTC monitoring has been unsubscribed.'
    : 'Your TTC monitoring preferences are confirmed.'
  const detail = isUnsubscribe
    ? 'Your saved schedule and station selections were removed. Your verified account identity is retained so a future management link can be sent securely.'
    : 'Your verified monitoring schedule and station selections are now active.'
  const text = `TTC Station Watch\n\n${heading}\n\n${detail}\n\nManage preferences: ${manageUrl}\n\nThis message confirms a change made through your verified TTC Station Watch session.`
  const html = `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#172035;line-height:1.5"><h1 style="font-size:22px">${escapeHtml(heading)}</h1><p>${escapeHtml(detail)}</p><p><a href="${escapeHtml(manageUrl)}">Manage preferences</a></p><p style="color:#5d6b7e;font-size:13px">This message confirms a change made through your verified TTC Station Watch session.</p></body></html>`
  return { subject, text, html }
}

async function sendWithResend({ to, subject, text, html }) {
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFromEmail,
      to: [to],
      subject,
      text,
      html,
    }),
  })
  if (!result.ok) {
    throw new Error(`Resend returned HTTP ${result.status}.`)
  }
}

async function sendNotifications() {
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !resendApiKey ||
    !resendFromEmail ||
    !publicAppUrl
  ) {
    throw new Error('Notification email configuration is incomplete.')
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const [
    { data: alerts, error: alertsError },
    { data: subscriptions, error: subscriptionsError },
  ] = await Promise.all([
    admin.rpc('claim_alert_notification_candidates', { p_limit: 50 }),
    admin.rpc('claim_subscription_email_events', { p_limit: 50 }),
  ])
  if (alertsError || subscriptionsError) {
    throw new Error('Pending notification emails could not be claimed.')
  }

  let sent = 0
  let skipped = 0
  let failed = 0
  for (const alert of alerts ?? []) {
    try {
      if (!isTtcSubwayRouteAlert(alert.route_ids)) {
        await admin.rpc('mark_alert_notification_skipped', {
          p_candidate_id: alert.candidate_id,
          p_reason: 'The alert does not identify TTC subway Line 1, 2, or 4.',
        })
        skipped += 1
        continue
      }
      await sendWithResend({
        to: alert.email,
        ...alertEmail(alert, { manageUrl: appManageUrl() }),
      })
      await admin.rpc('mark_alert_notification_sent', {
        p_candidate_id: alert.candidate_id,
      })
      sent += 1
    } catch (error) {
      await admin.rpc('mark_alert_notification_failed', {
        p_candidate_id: alert.candidate_id,
        p_error: error.message,
      })
      failed += 1
    }
  }
  for (const event of subscriptions ?? []) {
    try {
      await sendWithResend({ to: event.email, ...subscriptionEmail(event) })
      await admin.rpc('mark_subscription_email_sent', {
        p_event_id: event.event_id,
      })
      sent += 1
    } catch (error) {
      await admin.rpc('mark_subscription_email_failed', {
        p_event_id: event.event_id,
        p_error: error.message,
      })
      failed += 1
    }
  }
  return {
    claimed: (alerts?.length ?? 0) + (subscriptions?.length ?? 0),
    sent,
    skipped,
    failed,
  }
}

globalThis.Deno.serve(async (request) => {
  if (
    request.method !== 'POST' ||
    !deliverySecret ||
    request.headers.get('x-notifications-send-secret') !== deliverySecret
  ) {
    return response({ error: 'Not found.' }, 404)
  }
  try {
    return response({ ok: true, ...(await sendNotifications()) })
  } catch (error) {
    console.error('Notification delivery failed', error)
    return response({ error: 'Notification delivery failed.' }, 500)
  }
})
