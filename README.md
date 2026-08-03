# TTC Station Watch

TTC Station Watch lets riders select official TTC subway stations and receive service-alert emails on a recurring schedule.

## Local development

```sh
npm ci
npm run dev
```

Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` before submitting changes. Copy `.env.example` to `.env.local` for Supabase-backed verification. Resend worker secrets are documented in `docs/supabase-setup.md`.

The station catalog is generated from TTC static GTFS. Set `TTC_GTFS_DIR` to an extracted schedules archive and run `npm run generate:ttc` to refresh it.

## Deployment

GitHub Pages is configured at `https://zprkris.github.io/ttc_alerts/`. Enable Pages with GitHub Actions; `.github/workflows/deploy-pages.yml` publishes pushes to `main`. The workflow provides the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values required for hosted Supabase integration.

Supabase migrations and Edge Functions deploy separately. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFICATIONS_SEND_SECRET`, and `PUBLIC_APP_URL` as server-only secrets.

See `docs/architecture.md` and `docs/supabase-setup.md` for security and operations.
