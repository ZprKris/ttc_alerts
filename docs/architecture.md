# Architecture

TTC Station Watch is a React/Vite client backed by Supabase and Resend.

## Flow

1. The map uses a generated TTC station catalog with schematic coordinates.
2. A verified user saves stations, weekdays, and a Toronto monitoring window.
3. Supabase Cron invokes `monitor-alerts` every two minutes.
4. `alerts-poll` matches TTC GTFS-Realtime subway alerts to active preferences.
5. `notifications-send` claims deduplicated candidates and sends email through Resend.

When an active TTC alert disappears from the feed, the poller creates a one-time service-restored notification. Only subway Lines 1, 2, and 4 are eligible; LRT-only notices are ignored.

## Boundaries

- `src/data`: lines, stations, order, interchanges, and map coordinates
- `src/features`: selection, authentication, monitoring, and alert UI
- `src/services`: browser-safe Supabase adapters
- `supabase/migrations`: schema, RLS, RPCs, and Cron
- `supabase/functions`: preferences, polling, scheduling, and email delivery

## Security

Supabase Auth uses passwordless magic links. Row-level security limits users to their own preferences, while server-only workers use protected secrets. Service-role, scheduler, and Resend credentials must never use the public `VITE_` prefix.

Notification candidates are unique by user, alert, and content hash. Workers claim rows atomically and record sent, skipped, or failed delivery states.

See [Supabase setup](supabase-setup.md) for configuration and deployment.
