# Supabase setup

## Local development

Requires Node.js, Supabase CLI, and Docker.

```sh
npm ci
supabase start
cp .env.example .env.local
npm run dev
```

Use the local project URL and publishable key reported by `supabase status` in `.env.local`.

## Hosted configuration

Link the project and apply the database schema:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Deploy the Edge Functions:

```sh
supabase functions deploy preferences --no-verify-jwt
supabase functions deploy alerts-poll --no-verify-jwt
supabase functions deploy notifications-send --no-verify-jwt
supabase functions deploy monitor-alerts --no-verify-jwt
```

Configure these server-only secrets:

- `ALLOWED_ORIGINS`
- `ALERTS_POLL_SECRET`
- `NOTIFICATIONS_SEND_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TTC_ALERTS_FEED_URL` (optional)

Set `PUBLIC_APP_URL` to `https://zprkris.github.io/ttc_alerts` and allow that exact application URL in Supabase Auth redirects. The browser receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Scheduling

Supabase Cron calls `monitor-alerts` every two minutes. Before applying the Cron migration to a new project, add `ttc_cron_secret_key` to Supabase Vault using the project server secret—not its publishable key.

The GitHub **Poll TTC alerts** workflow remains available as a manual fallback.

## Email

Resend sends alerts from a verified domain. Supabase Auth SMTP sends magic links. Configure both providers for production use and keep all credentials server-side.

## Verification

```sh
npm run lint
npm run format:check
npm test
npm run build
supabase db lint --local
```

Confirm that users can access only their own preferences, magic links return to the hosted app, Cron runs successfully, and test alerts reach the expected recipient once.
