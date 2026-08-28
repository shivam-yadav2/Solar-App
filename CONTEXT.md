# SolarOS — Engineering Context / Handoff

Written for whoever (human or AI) picks this up next. Covers **both** repos:

```
c:\tmp\
├── SAAS-Solar\        # web app + backend  (React 19 + Vite + Express + MySQL)
└── SolarOS-Mobile\    # this repo — React Native (Expo) client, same backend
```

Everything here was verified against the code, not recalled. Where something
is unverified or incomplete it says so.

---

## 1. The product

**SolarOS** — a multi-tenant SaaS ERP for Solar EPC (Engineering, Procurement,
Construction) companies in India. Three account types:

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Platform owner. Sees every tenant. Bypasses all permission checks. |
| `ADMIN` | A tenant's staff. Access governed by fine-grained RBAC (see §4). |
| `CUSTOMER` | End homeowner. Self-service portal, scoped to their own `customerId`. |

**Demo credentials** (seeded, all password-visible in `scripts/seed.ts`):

| Account | Login | Password |
|---|---|---|
| Super Admin | `admin@solarops.com` | `admin123` |
| Tenant Admin | `admin@suryashaktisolar.com` | `admin123` |
| Customer | `amit.sharma@example.com` | `customer123` |

---

## 2. Backend (`../SAAS-Solar`)

Single Express process serves **both** the API (`/api/*`) and the built SPA.
Vite middleware in dev, static `dist/` in prod.

```
server.ts                 # entry; Vite middleware (dev) / static (prod)
server/
├── routes.ts             # thin aggregator, mounts 18 sub-routers
├── routes/*.routes.ts    # one file per domain
├── auth.ts               # JWT + requirePermission() middleware
├── db/
│   ├── mysql.ts          # pool; reads DATABASE_URL or DB_* vars
│   ├── schema.sql        # full schema (~33 tables)
│   └── models/*.model.ts # one per entity
├── cache/                # pluggable: in-memory default, Redis via REDIS_URL
├── storage/              # pluggable: local disk default, S3 via STORAGE_DRIVER=s3
└── permissionsCatalog.ts # 40 permission keys — single source of truth
scripts/seed.ts           # idempotent seeder
```

Run: `npm run dev` (port 3000) · Seed: `npm run seed` · Typecheck: `npm run lint`

Local DB is XAMPP MariaDB on **port 3307**, database `solar_erp_saas`,
user `root`, no password. Config lives in `.env` (gitignored).

---

## 3. ⚠️ Gotchas that already caused bugs — read before writing code

**3.1 MySQL runs in non-strict mode → silent ID truncation.**
Every `id` column is `VARCHAR(36)`. Generating an ID longer than that does
**not** error — MySQL silently truncates it, so the row is written under a
different ID than the code thinks. This bit us twice (roles/users, then
tenant onboarding). **Convention: `prefix_${Date.now()}`.** Never
`crypto.randomUUID()` (41 chars with a prefix) and never derive an ID by
concatenating onto `tenantId`.

**3.2 `getRequestTenantId()` returns `undefined` for an unscoped SUPER_ADMIN.**
(`server/routes/shared.ts`.) That is deliberate — it means "all tenants".
Models treat `undefined` as cross-tenant. It used to silently fall back to
`tenant_suryashakti`, which made every unscoped super-admin request act on one
specific tenant. Don't reintroduce a default.

**3.3 Not every modal uses the shared `Modal.tsx`.**
Only ~8 do. Eleven others (`CustomerModal`, `ProjectModal`, `PaymentModal`, …)
have their own copy-pasted overlay markup. A change to `Modal.tsx` reaches
*some* modals only — grep for `fixed inset-0` before assuming coverage.

**3.4 `npm run seed` tops up, it does not reset.**
It skips records that already exist. It will not restore modified demo data.
(A "Reset Demo Database" button existed in Settings but called a route that was
never implemented — 404. It has been removed.)

---

## 4. RBAC

Coarse `role` enum (`SUPER_ADMIN`/`ADMIN`/`CUSTOMER`) stays as the account
type. Fine-grained permissions layer on top for `ADMIN` accounts only:

- Tables: `permissions`, `roles` (tenant-scoped), `role_permissions`; `users.role_id`.
- Every tenant auto-gets an undeletable **"Admin" system role** with all 40 permissions.
  Created by `RoleModel.ensureSystemAdminRole()` — called from both the seeder
  **and** live tenant onboarding. If a tenant's admin has `role_id = NULL`,
  every `requirePermission` check 403s. That was a real bug; don't regress it.
- Enforcement: `requirePermission(key)` in `server/auth.ts`. SUPER_ADMIN bypasses;
  CUSTOMER always denied; ADMIN checked against its role's cached permission set.

---

## 5. SaaS control plane (SUPER_ADMIN only)

Five sidebar entries, each its own route: **Tenants** (`/saas_control`),
**Plans** (`/saas_plans`), **Audit Log** (`/saas_audit`), **Search**
(`/saas_search`), **System Health** (`/saas_health`).

**Plans** are real DB rows (`plans` table) with CRUD — they replaced a
hardcoded starter/growth/enterprise if/else ladder. A tenant's
`subscription_json` **snapshots** the plan's price/limits at assignment time and
stores `planId`, so editing a plan later doesn't silently reprice existing
tenants. Tenant list filtering matches on `planId`, not the display name.

---

## 6. Deployment (Railway) — status & remaining setup

**Fixed already:** removed a stale `bun.lock` (Railway picked bun and failed
`--frozen-lockfile`); `PORT` now reads `process.env.PORT`; duplicate `vite`
dependency removed; `esbuild` + `tailwindcss` moved to `dependencies` so the
build survives dev-dependency pruning. Production build + `npm start` on an
injected PORT verified locally.

**Still required in the Railway account:**

1. **`JWT_SECRET`** — production startup now fails closed when it is absent.
2. **`DATABASE_URL`** — from Railway's MySQL plugin.
3. Apply `server/db/schema.sql` only to a new empty Railway DB, then seed once;
   the schema contains destructive drops and is not a migration.
4. **`STORAGE_DRIVER=s3`** + bucket creds — Railway's filesystem is ephemeral,
   so local-disk uploads vanish on every deploy.
5. Change the seeded `admin123` passwords.

---

## 7. Web mobile-responsiveness — partially done

The web app was made mobile-usable in phases. **Phases 0–2 are done and
verified**; 3–4 were not finished.

Done: hamburger + drawer (the drawer existed but nothing ever opened it — the
sidebar was completely unreachable on mobile), a bottom tab bar, a mobile-visible
search trigger, `input{font-size:16px}` under 768px to stop iOS zoom-on-focus,
bottom-sheet modals across all 19 modals, and `lg:hidden` card layouts for the
five raw-`<table>` views (Projects, Expenses, Invoices, TeamUsers, ProfitMargins).

**Done since this note was first written:** the web `index.html` now includes
`viewport-fit=cover`, so safe-area styles work on notched devices.

**Not done:**
- Phase 3: consistent ≥44px tap targets; sticky action bars in the long detail modals.
- Phase 4: full mobile+desktop regression sweep (customer portal and the SaaS
  screens were never checked at 390px).

---

## 8. This repo (mobile) — state

Expo SDK 57 · React 19 · expo-router · **NativeWind** · SecureStore.
See `README.md` for setup, folder layout, and the recipe for adding a screen.

**Deliberate choice:** NativeWind implements Tailwind for React Native, so
`className` strings are identical between the two repos. `src/types.ts` is a
**verbatim 923-line copy** of the web app's. This is a port, not a rewrite —
keep it that way; don't invent divergent styling or duplicate type definitions.

**Verified working:** `tsc --noEmit` is clean and
`npx expo export --platform android` produces a 6 MB Hermes bundle.

**Built:** role-aware SUPER_ADMIN, tenant-admin, and customer experiences;
every destination previously marked `soon`; customer/project/ticket details;
create/edit workflows; tenant onboarding and plan management; RBAC/team
management; payroll and salary advances; native document upload; report CSV
sharing; feedback; password changes; tenant scoping and impersonation.

**Operational completion:** leads/follow-ups, quotations, inventory/stock/BoQ,
attendance/DPR, DISCOM liaison, notifications, and tenant subscription billing
now have live APIs and native screens. `npm run smoke` covers 45 authenticated
read checks plus lead/quotation mutation lifecycles.

**Connectivity:** CORS is enabled in `../SAAS-Solar/server.ts`. The client reads
`EXPO_PUBLIC_API_URL` first and falls back to `expo.extra.apiBaseUrl` in
`app.json` (`10.0.2.2` remains the Android-emulator default).

**Branding:** the native launcher uses `brand-app-icon-3d.png`; the Expo SDK 57
`expo-splash-screen` config plugin displays `brand-splash-3d.png` on the dark
brand background; login shows the lightweight 3D brand tile and wordmark; and
the authenticated root layout keeps the SolarOS wordmark in the top-left on
every tab and detail screen. The dark status bar remains globally configured.

---

## 9. Remaining release work

1. Set production `JWT_SECRET`, `DATABASE_URL`, S3 storage credentials, and
   `EXPO_PUBLIC_API_URL` in the Railway/EAS accounts.
2. Run device QA against a seeded backend on Android and iOS, including camera/
   document providers and large uploads.
3. Run the configured signed EAS preview/production builds and complete store metadata.
4. Finish the separate web mobile Phases 3–4 regression sweep.

---

## 10. Conventions

- **IDs:** `prefix_${Date.now()}` — see §3.1.
- **Money:** `formatINR()` / `formatCurrency()`. Never hand-roll ₹ formatting.
- **New permission?** Add to `server/permissionsCatalog.ts`, re-run the seeder
  (idempotent, upserts by key), then gate the route with `requirePermission`.
- **New API route?** Create/extend `server/routes/<domain>.routes.ts` and mount
  it in `server/routes.ts`. Add the client method to **both** `src/lib/api.ts`
  files (web and mobile) if mobile needs it.
- Both repos: `npx tsc --noEmit` must pass before calling anything done.
