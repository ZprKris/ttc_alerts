# Supabase setup

Phase 6 uses Supabase Auth for passwordless email verification, PostgreSQL for
preference storage, and an authenticated Edge Function for the browser API. The
browser receives only the project URL and a publishable/legacy anon key. A
service-role key is neither required nor permitted in the frontend or the
preference function.

## Data model

The migration in `supabase/migrations` creates:

- `transit_stations`: stable station identifiers that saved preferences may
  reference.
- `subscribers`: one status and consent record per verified Auth user. It does
  not duplicate the user's email from Supabase Auth.
- `monitoring_preferences`: up to 20 independent alert schedules and IANA time
  zones per subscriber.
- `monitoring_weekdays`: the selected ISO weekdays (Monday is 1).
- `monitoring_stations`: the selected station identifiers.

An end time earlier than its start is stored as an overnight window. Equal
times are rejected. Each alert can be deleted independently; deleting the last
one marks the subscriber unsubscribed while retaining the minimal Auth identity
and status/consent history.

## Security model

RLS is enabled and forced on all five public tables. Anonymous users may read
only active station reference data. Authenticated users may read only rows tied
to `auth.uid()`, and no public role receives direct table mutation privileges.
Writes go through two `security definer` RPCs that:

- derive ownership from `auth.uid()` instead of request data;
- reject anonymous, missing-email, and unconfirmed-email users;
- validate time zones, weekdays, station existence, list sizes, and consent;
- replace child rows atomically when saving; and
- use an empty `search_path` and schema-qualified database objects.

The `preferences` Edge Function validates each bearer token with
`auth.getUser()`, checks that the email is confirmed, and then creates a
caller-scoped Supabase client. `verify_jwt = false` in `config.toml` is
intentional: current Supabase gateway JWT verification is disabled for this
function so its own `getUser()` check can validate current access tokens. The
function never bypasses RLS.

Allowed browser origins are an explicit comma-separated allowlist. Requests are
limited to 16 KiB and error responses do not include database details. Supabase
Auth's email rate limits still need to be configured appropriately for the live
project.

## Local setup

Prerequisites are Node.js, the Supabase CLI, and a Docker-compatible local
runtime.

1. Install frontend dependencies with `npm install`.
2. Start Supabase with `supabase start`. The CLI applies the migration and the
   development seed automatically.
3. Copy `.env.example` to `.env.local` and replace its placeholders with the
   local API URL and anon/publishable key shown by `supabase status`.
4. Set `ALLOWED_ORIGINS=http://localhost:5173` for the local Edge Function
   environment.
5. Start the frontend with `npm run dev`.

`supabase/seed.sql` contains the eight fictional map stations and is for local
development only. Do not seed those placeholders into production; official TTC
station records are scheduled for Phase 9.

The local Auth site URL and redirect are declared in `supabase/config.toml`.
Magic-link drafts use one-hour `localStorage` in the originating browser so a
verification or sign-in link opened in a new tab can restore the selected
stations and schedule. Drafts contain only schedule and station fields—not email
or consent. A user who opens the
link in another browser can still authenticate, but must re-enter an unsaved
draft.

## Hosted project setup

1. Create or choose a Supabase project and link the CLI:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Apply the schema and deploy the function:

   ```sh
   supabase db push
   supabase functions deploy preferences --no-verify-jwt
   ```

3. Set the origin allowlist. Include the exact local and deployed origins, with
   no path or trailing slash:

   ```sh
   supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,https://YOUR_NAME.github.io
   ```

4. In Supabase Auth URL Configuration, set the production site URL and add the
   exact GitHub Pages application URL as an allowed redirect, for example
   `https://YOUR_NAME.github.io/ttc_alerts/`. Keep the localhost redirect for
   development. Redirect URLs must match the final Pages repository path.
5. Put the hosted project URL and publishable key in the frontend deployment
   environment as `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
6. Configure an SMTP provider and appropriate Auth email rate limits before a
   public launch. Notification email delivery itself is Phase 8.

Never create a `VITE_` variable containing a service-role key, SMTP credential,
or other private value. Vite embeds every `VITE_` value in the public bundle.

## Phase 7 alert poller

The `alerts-poll` Edge Function downloads the official TTC subway feed at
`https://gtfsrt.ttc.ca/alerts/subway?format=binary`, decodes GTFS-Realtime
protobuf, expands known endpoint ranges using `transit_lines` and
`transit_line_stations`, and writes normalized records to `alert_events`.
Matching subscribers produce `pending` rows in
`alert_notification_candidates`; Phase 8 will claim those rows for email
delivery. Multiple active schedules are evaluated independently and their
matching stations are combined per user. A unique
`(user_id, alert_id, content_hash)` constraint prevents the same alert revision
from producing duplicate emails.

Configure these Edge Function secrets in the hosted project's secret manager:

- `SUPABASE_SERVICE_ROLE_KEY`: server-only key used by the poller to read all
  active preferences and write ingestion records. It must never be a Vite
  variable or appear in frontend code.
- `ALERTS_POLL_SECRET`: a separate random value required in the
  `x-alerts-poll-secret` header.
- `TTC_ALERTS_FEED_URL`: optional override for a controlled feed mirror; the
  default is the official TTC subway endpoint above.

Deploy it with `supabase functions deploy alerts-poll --no-verify-jwt` and invoke
it from a trusted scheduler with a `POST` request and the poll secret header.
Run it every few minutes, but keep only one invocation in flight. The function
records each run in `alert_poll_runs`, including failures, so operations can
monitor stale feeds before Phase 8 sends anything.

The station seed is generated from the official TTC static GTFS subway catalog.
To refresh it, extract the published TTC schedules archive, set `TTC_GTFS_DIR`
to its extracted directory, and run `npm run generate:ttc`. Commit the generated
`src/data/ttcNetwork.js` and `supabase/seed-ttc.sql` with the matching catalog
migration. The feed decoder and matching logic are tested against representative
GTFS-Realtime entities.

## Phase 8 email delivery

Resend is the selected provider. The `notifications-send` Edge Function claims
pending alert candidates and subscription email events with row locks, sends
accessible HTML and plain-text variants through `https://api.resend.com/emails`,
and marks each event `sent` or `failed`. Stale `processing` rows return to
`pending` after 15 minutes so a failed worker does not lose mail permanently.

Supabase Auth remains responsible for passwordless confirmation and preference-
management magic links. The application queues preference-confirmation and
unsubscribe-confirmation events, while the Resend worker sends those messages
alongside matched TTC alerts. Every outbound message includes a management link;
the link requires the recipient to complete a fresh verified magic link before
preferences are shown.

Configure these additional server-only secrets: `NOTIFICATIONS_SEND_SECRET`,
`RESEND_API_KEY`, a verified `RESEND_FROM_EMAIL`, and `PUBLIC_APP_URL` (for
example `https://zprkris.github.io/ttc_alerts`). Deploy with
`supabase functions deploy notifications-send --no-verify-jwt` and schedule a
protected `POST` invocation after each alert poll. Never put a Resend key,
sender credential, or scheduler secret in a `VITE_` variable.

Service-alert subjects follow the compact form `🟡 Line 1: Finch West ❌`.
Line 2 uses a green circle and Line 4 a purple circle. A green check marks a
restoration notice, while `⏱️` distinguishes an upcoming service change from a
current disruption. Station IDs are resolved to display names before delivery,
and an HTTPS image URL supplied by TTC is embedded in the HTML message. Route 6
and other LRT-only notices are rejected even when they share a stop such as Finch
West with the subway; only alerts identifying TTC subway Lines 1, 2, or 4 are
eligible for delivery.

## Scheduled monitoring

The hosted project uses Supabase Cron instead of GitHub's best-effort scheduled
workflow. The `ttc-alert-monitor` database job invokes the `monitor-alerts`
Edge Function every two minutes. That function runs `alerts-poll` first and
then `notifications-send`; it returns an error when polling fails, delivery
fails, or any claimed email is rejected.

Before applying the cron migration to a new hosted project, open Supabase Vault
and create a secret named `ttc_cron_secret_key`. Its value must be the project's
server-side secret key (`sb_secret_...`), never its publishable key. The cron
migration reads that credential only through `vault.decrypted_secrets`, and the
monitor endpoint accepts only keys present in its server-key environment.

Deploy all three worker functions and apply the migrations:

```sh
supabase functions deploy alerts-poll --no-verify-jwt
supabase functions deploy notifications-send --no-verify-jwt
supabase functions deploy monitor-alerts --no-verify-jwt
supabase db push
```

The GitHub `Poll TTC alerts` workflow has no schedule and remains available
through **Run workflow** as a manual fallback. Cron configuration and recent
executions can be inspected in Supabase under **Integrations > Cron**, or in
the `cron.job` and `cron.job_run_details` database tables.

## Verification

Run the repository checks:

```sh
npm run lint
npm run format:check
npm test
npm run build
```

With the local Supabase stack running, also run `supabase db lint --local` and
manually verify these cases:

- a new address receives a magic link before its preference is written;
- a verified user can reload and update only their own preference;
- requesting management access gives the same browser response for known and
  unknown addresses;
- unsubscribe requires confirmation and removes preference child rows; and
- one signed-in user cannot select another user's subscriber or preference
  rows through the REST API.

Relevant official references:

- [Passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
