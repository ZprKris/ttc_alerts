import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/202608010001_monitoring_preferences.sql',
  ),
  'utf8',
)
const preferencesFunction = readFileSync(
  join(process.cwd(), 'supabase/functions/preferences/index.js'),
  'utf8',
)
const alertsMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202608010002_alert_ingestion.sql'),
  'utf8',
)
const alertsPoller = readFileSync(
  join(process.cwd(), 'supabase/functions/alerts-poll/index.js'),
  'utf8',
)
const emailMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/202608010003_email_delivery.sql'),
  'utf8',
)
const notificationsSender = readFileSync(
  join(process.cwd(), 'supabase/functions/notifications-send/index.js'),
  'utf8',
)
const multipleAlertsMigration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/202608030004_multiple_monitoring_alerts.sql',
  ),
  'utf8',
)
const richEmailMigration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/202608030005_rich_subway_alert_emails.sql',
  ),
  'utf8',
)

describe('Supabase security boundaries', () => {
  it('forces RLS and denies direct authenticated mutations', () => {
    expect(migration.match(/force row level security/gi)).toHaveLength(5)
    expect(migration).toContain(
      'revoke all on table public.monitoring_preferences from public, anon, authenticated;',
    )
    expect(migration).toContain(
      'grant select on table public.monitoring_preferences',
    )
    expect(migration).toContain('(select auth.uid()) = user_id')
  })

  it('verifies confirmed users for every security-definer mutation', () => {
    expect(migration.match(/security definer/gi)).toHaveLength(2)
    expect(migration.match(/email_confirmed_at is not null/gi)).toHaveLength(2)
    expect(migration).toContain("set search_path = ''")
  })

  it('uses a caller-scoped key and never a service-role credential', () => {
    expect(preferencesFunction).toContain(
      "globalThis.Deno.env.get('SUPABASE_ANON_KEY')",
    )
    expect(preferencesFunction).toContain('auth.getUser(accessToken)')
    expect(preferencesFunction).not.toMatch(/service.?role/i)
  })

  it('supports multiple owned alert subscriptions with scoped deletion', () => {
    expect(multipleAlertsMigration).toContain(
      'drop constraint monitoring_preferences_user_id_key',
    )
    expect(multipleAlertsMigration).toContain(
      'where id = p_preference_id\n    and user_id = v_user_id',
    )
    expect(multipleAlertsMigration).toContain(
      'grant execute on function public.delete_my_monitoring_preference(uuid)',
    )
    expect(multipleAlertsMigration).toContain(
      'No more than 20 monitoring alerts may be active.',
    )
    expect(preferencesFunction).toContain(".order('created_at'")
    expect(preferencesFunction).toContain("'delete_my_monitoring_preference'")
    expect(alertsPoller).toContain('.flatMap((row) =>')
    expect(alertsPoller).toContain('stationMatchesByUser')
  })

  it('keeps alert ingestion server-only and deduplicates revisions', () => {
    expect(alertsMigration.match(/force row level security/gi)).toHaveLength(5)
    expect(alertsMigration).toContain(
      'revoke all on table public.alert_notification_candidates from public, anon, authenticated;',
    )
    expect(alertsMigration).toContain(
      'unique (user_id, alert_id, content_hash)',
    )
    expect(alertsPoller).toContain(
      "globalThis.Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')",
    )
    expect(alertsPoller).toContain(
      "request.headers.get('x-alerts-poll-secret')",
    )
    expect(alertsPoller).not.toContain('sendEmail')
  })

  it('keeps Resend delivery server-only with durable claims and text alternatives', () => {
    expect(emailMigration).toContain(
      "status in ('pending', 'processing', 'sent', 'skipped', 'failed')",
    )
    expect(emailMigration).toContain('for update skip locked')
    expect(emailMigration).toContain(
      'grant execute on function public.claim_alert_notification_candidates(integer)',
    )
    expect(notificationsSender).toContain('https://api.resend.com/emails')
    expect(notificationsSender).toContain('RESEND_API_KEY')
    expect(notificationsSender).toContain('text,')
    expect(notificationsSender).toContain('html,')
    expect(notificationsSender).not.toContain('VITE_')
  })

  it('excludes non-subway alerts and supplies trusted email presentation data', () => {
    expect(alertsPoller).toContain('normalized.matching.lineIds.length === 0')
    expect(alertsPoller).toContain('normalized.details.isFuture')
    expect(richEmailMigration).toContain('event.route_ids')
    expect(richEmailMigration).toContain('matched_station_names text[]')
    expect(richEmailMigration).toContain(
      'grant execute on function public.mark_alert_notification_skipped(uuid, text)',
    )
    expect(notificationsSender).toContain('isTtcSubwayRouteAlert')
    expect(notificationsSender).toContain(
      "admin.rpc('mark_alert_notification_skipped'",
    )
  })
})
