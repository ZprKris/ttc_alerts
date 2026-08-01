# TTC Station Watch architecture

## Scope

The first version targets the Toronto TTC subway. Official TTC static GTFS data
will supply route and stop identifiers, while manually designed schematic
coordinates will control the public map layout. TTC GTFS-Realtime Service Alerts
will be integrated in a later server-side phase.

## Frontend boundaries

- `src/data` owns normalized lines, stations, ordered station IDs, branches,
  interchanges, official identifiers, display coordinates, and line colours.
- `src/components` contains shared presentation components. Future React Flow
  nodes and edges will render data but will not own network rules.
- `src/features/selection` will own click and directional selection logic as pure,
  testable functions plus UI state.
- `src/features/monitoring` owns preference form state, validation, and responsive
  presentation.
- `src/services` will contain public client adapters. It must never contain a
  Supabase service-role key or email-provider secret.

## Data flow

The network dataset is transformed into non-editable React Flow nodes and edges.
Station interactions update an explicit set of selected station IDs. Monitoring
preferences reference those stable IDs rather than labels or map coordinates.

Directional selection uses adjacent IDs from each line's ordered station list and
from explicit branch station lists. Display coordinates only translate those
valid neighbors into up, right, down, or left controls. A single candidate is
selected and focused immediately; a terminal leaves selection unchanged and
announces the boundary. Multiple candidates never trigger an implicit choice:
the interface presents line- and branch-labelled buttons first. Arrow actions add
stations and never deselect existing manual choices.

Monitoring preferences preserve start and end as local wall-clock values together
with an IANA time zone so daylight-saving transitions can be evaluated correctly
server-side. Selected weekdays identify the day a window starts. An end time
earlier than its start crosses midnight into the following day; equal times are
rejected rather than interpreted as an accidental 24-hour window.

Supabase Auth provides passwordless email magic links using PKCE. The browser
temporarily stores only a non-personal schedule/station draft in session storage
while verification completes. The email remains in Supabase Auth and is not
duplicated in application tables. Verified sessions call an Edge Function that
validates the bearer token, then performs reads and approved security-definer RPCs
with a user-scoped key. Forced row-level security restricts reads to the owning
`auth.uid()` and direct table writes are revoked. Unsubscribe deletes schedule and
station preferences while retaining a minimal unsubscribed identity/consent
record. See `docs/supabase-setup.md` for the schema and operational setup.

The Phase 7 `alerts-poll` Edge Function uses the official TTC GTFS-Realtime subway
binary feed. A standard GTFS-Realtime binding decodes alert entities, while a
pure matching module maps route/stop selectors and phrases such as “between A
and B” onto ordered station ranges. Known line alerts fall back to every station
on that line; alerts that cannot be mapped confidently are retained only when
they identify a known station or line. Subscriber matches are constrained by the
stored IANA-time-zone schedule and create pending, deduplicated notification
candidates. The poller uses a server-only service-role secret and a separate
poll secret; neither is exposed to the browser. Email delivery and candidate
claiming remain Phase 8 work.

## Quality and deployment

Vitest and React Testing Library cover important user interactions. ESLint and
Prettier keep the JavaScript and CSS consistent. GitHub Actions and GitHub Pages
deployment are reserved for the deployment phase, when the repository name and
Vite base path are known.
