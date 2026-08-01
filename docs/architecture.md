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

The browser will eventually call authenticated or token-verified Supabase
functions. Privileged preference writes, alert polling, deduplication, and email
delivery remain server-side. Row-level security will be designed and approved
before any public submission endpoint is enabled.

## Quality and deployment

Vitest and React Testing Library cover important user interactions. ESLint and
Prettier keep the JavaScript and CSS consistent. GitHub Actions and GitHub Pages
deployment are reserved for the deployment phase, when the repository name and
Vite base path are known.
