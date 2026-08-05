# TTC Station Watch

Email alerts for service changes affecting your selected TTC subway stations and schedule.

**Live:** [shuttc.org](https://shuttc.org)

## Develop

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Before committing:

```sh
npm run lint
npm run format:check
npm test
npm run build
```

See [architecture](docs/architecture.md) and [Supabase setup](docs/supabase-setup.md) for backend, security, and deployment details.
