# Release Runbook

Covers both repos (`../SAAS-Solar` backend+web, this repo mobile). Written so
someone who wasn't there for a given deploy can still execute or reverse it.

## Before every deploy

1. CI is green on the commit being deployed:
   - `SAAS-Solar/.github/workflows/ci.yml` — typecheck, schema migrations
     against a throwaway MySQL service, `npm run smoke` (RBAC/API contract
     regression), `npm run release:check` (dev-mode preflight), and a
     production `npm run build`.
   - `SolarOS-Mobile/.github/workflows/ci.yml` — `npm run check` (typecheck,
     route integrity, golden financial calculations) and an Android export.
2. If this deploy includes a new `server/db/migrations/*.sql` file, read it.
   Migrations are additive-only by convention (see Rollback below) — a
   migration that drops or renames a column needs a deliberate two-step
   (add new → backfill → remove old in a later release), not a single file.

## Backend deploy (`SAAS-Solar`)

1. `npm run release:check -- --production` in the target environment, with
   its real environment variables set. This fails closed on a missing
   `JWT_SECRET`/`DATABASE_URL`, a non-HTTPS `APP_URL`/`CORS_ORIGINS`, or
   `STORAGE_DRIVER` not set to `s3` (local disk is not durable across
   deploys on platforms like Railway).
2. Deploy the build (`npm run build && npm start`, or the platform's own
   build step).
3. `npm run migrate` against the production database. This is idempotent —
   it tracks applied files in `schema_migrations` and skips ones already
   run, so it's safe to run on every deploy rather than only when you
   remember there's a new migration.
4. `npm run release:smoke -- https://<deployed-url>` — a read-only
   liveness/readiness probe safe to run against production. It checks
   `/health` returns `status: "ok"` and `/ready` returns `status: "ready"`
   (meaning the deployed instance can reach its database), and that both
   responses carry an `X-Request-Id` header.
5. Start (or confirm) the monitor: `npm run monitor -- https://<deployed-url>`
   as a long-running process (or `MONITOR_ONCE=1 npm run monitor -- <url>`
   on a schedule from cron/an uptime tool). See Monitoring below.

## Mobile deploy (`SolarOS-Mobile`)

Everything up to signing is scripted; signing and store submission are not,
because they need Apple/Google/EAS credentials that don't live in this repo.

1. `npm run check` locally or in CI (already required to merge).
2. `npx expo export --platform android` / `--platform ios` to catch
   bundling regressions before investing in a signed build.
3. Signed build: `eas build --platform android` / `--platform ios` (needs
   an authenticated `eas` CLI session and the project's Apple/Google
   credentials — not available in this environment; do this from a machine
   that has them).
4. Store submission: `eas submit` or the manual Play Console / App Store
   Connect flow, plus store metadata (screenshots, description, privacy
   labels). Not something a CI job should do unattended the first time.

## Monitoring

`SAAS-Solar/scripts/monitor.ts` (`npm run monitor`) polls the deployed
backend's own `/health` and `/ready` — no external vendor or account
needed. It alerts (non-zero exit, so it composes with cron/systemd/any
scheduler's own failure handling) when:
- `/health` or `/ready` is unreachable or returns a non-2xx status,
- the 5xx rate over the polling window exceeds `MONITOR_FAILED_RATE`
  (default 2%),
- the slow-request rate exceeds `MONITOR_SLOW_RATE` (default 10%).

This is a floor, not a replacement for a real APM if the team adopts one
later (e.g. Sentry for crash reporting from the mobile client's
`src/lib/diagnostics.ts` event log) — that's a vendor/budget decision this
runbook deliberately doesn't make.

## Rollback

- **Backend code**: redeploy the previous commit/build. Nothing here is
  destructive to redeploy backwards.
- **Database**: migrations in `server/db/migrations/` are additive-only by
  convention (new tables/columns, not drops/renames) specifically so that
  redeploying an older backend build against a post-migration database
  keeps working — the old code simply doesn't reference the new column.
  There is **no down-migration tooling**; "rollback" for schema means "the
  previous code is compatible with the current schema," not "the schema
  reverts." If a migration ever needs to be non-additive, that's a reason
  to stop and design a two-release path, not a reason to write a down
  migration under pressure.
- **Mobile**: revert to the previous signed build via the store's own
  rollback/staged-rollout controls (Play Console "halt rollout",
  App Store Connect's previous-build re-release). There is no server-side
  kill switch for a bad mobile build other than the app's own maintenance
  gate (`maintenanceGate` in `server.ts`), which can block API traffic from
  any client version but can't un-ship a build already on a device.
- **Tenant/module data** (e.g. the `enabled_modules_json` sync done during
  Phase 10 verification): this is live product data, not a deploy
  artifact — there's no "rollback" for it beyond restoring from a database
  backup, which is why `release-readiness.ts` requires S3 storage and the
  schema itself is never deployed via a destructive drop outside of local
  dev seeding.

## Support readiness

`app/(screens)/support.tsx` now offers "Include device diagnostics" when a
user files a ticket (default on). It uploads the same redacted bundle
`buildSupportBundle()` already produced for on-device debugging (app
version, platform, API host, recent error events — no tokens, emails, or
raw numbers) as a ticket attachment via `src/lib/diagnostics.ts:uploadDiagnosticsBundle()`,
so a reported bug carries structured context instead of only a text
description.

## CI quality gates

Both repos now run their existing local checks on every PR and push to
`main` (see workflow files linked above). This is what would have caught,
before merge rather than during manual Phase 10 verification: the
`__dirname`-under-ESM crash in `server/lib/appRoot.ts`, the two stale
`smoke-api.ts` assertions, and the incomplete `npm install` that made
`tsc --noEmit` fail on `html-to-image`/`jspdf`/`qrcode-generator`.
