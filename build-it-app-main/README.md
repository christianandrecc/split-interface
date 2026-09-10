# SPLIT

React, TypeScript, and Vite frontend backed by Supabase Auth, Postgres/RLS, and RPCs. Vercel serves the compiled app; Supabase owns authenticated data.

## Development

Use Node 24. Run `npm ci`, configure `.env.local` from `.env.example`, and run `npm run dev -- --host 127.0.0.1`. Local URL: http://127.0.0.1:8080/.

Only public/publishable credentials belong in `VITE_*` variables. Never expose service-role keys or provider secrets.

## Verification

- `npm run verify:beta`: types, lint, all UI/unit tests, and local production build.
- `npm run check:deploy`: production environment validation without printing secrets.
- `npm run verify:database`: disposable local PostgreSQL migration and integrity checks, with no live database connection.
- `npm run verify:deploy`: combined release gate, including a dependency audit. Vercel uses this command.

**September 10, 2026: local deployment checks pass; the signing safeguards and permission migrations are applied to the existing SPLIT Supabase project.** A rollback-only hosted database smoke test also passed without changing existing records. This release targets the existing Vercel project for partner testing; check its deployment status and follow [deployment readiness](docs/deployment-readiness.md) and [beta QA](docs/beta-qa-checklist.md) before sharing it.

## Deployment

Use the checked-in `vercel.json` and Node 24. Configure separate Preview/Production Supabase variables and approved auth redirect origins. Apply reviewed migrations to staging before production; never reset a shared database.

Partner testing uses in-app invitations and manual PDF downloads. External email/SMS contract delivery still needs a server-side worker; the contract queue alone does not send messages.

See [workspace notes](docs/workspace-dashboard.md) for the dashboard data adapters and [deployment readiness](docs/deployment-readiness.md) for remaining requirements.
