# Services

This directory contains public browser adapters only:

- `supabaseClient.js` configures a passwordless PKCE client from public Vite
  environment variables.
- `subscriptionApi.js` sends magic links and calls the authenticated preference
  Edge Function.
- `preferenceDraft.js` retains non-personal schedule/station fields for one hour
  in `localStorage` so a magic link opened in a new tab can restore the draft.

The server boundary lives in `supabase/functions`, and database authorization
lives in `supabase/migrations`. Never add service-role keys, email-provider
secrets, or TTC polling credentials here. The TTC alert poller is a server-only
Edge Function in `supabase/functions/alerts-poll`; it is never imported by the
frontend and writes pending notification candidates for Phase 8 email delivery.
