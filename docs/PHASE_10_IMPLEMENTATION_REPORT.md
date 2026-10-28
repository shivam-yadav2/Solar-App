# Phase 10 — Performance, Offline Resilience, Security, and Release Certification

Status: In progress. This records what is verified, what was fixed along the
way, and what remains gated on infrastructure this environment does not have
(signed credentials, physical devices, a deployed URL).

## Verified this session

**Automated role/RBAC/API contract/regression tests.** `../SAAS-Solar`'s
`npm run smoke` (`scripts/smoke-api.ts`) now passes end-to-end against a
locally seeded database: health/CORS/unauthenticated-file-protection,
SUPER_ADMIN/TENANT_ADMIN/CUSTOMER authenticated-read coverage, the full
lead → quotation → project operational mutation lifecycle, customer
profitability reconciliation (a financial golden check at the API layer),
and cross-tenant project-isolation. Getting it green surfaced three real
bugs, now fixed:

1. `server/lib/appRoot.ts` read `__dirname`, which does not exist under
   `"type": "module"` + `tsx` — `npm run dev` crashed on startup before
   binding to a port. Fixed with `fileURLToPath(import.meta.url)`.
2. The smoke suite asserted a `/saas/billing/tenant_<id>` route that was
   never implemented (per-tenant billing is `?tenantId=` on
   `/saas/billing/invoices`) — a stale assertion, not a missing feature.
3. The smoke suite's quotation-creation payload didn't match what
   `POST /quotations` actually requires (`recipientName`, `totalAmount`) —
   another stale assertion.
4. The local dev DB's `tenant_suryashakti` row predated the `quotations`
   module flag being added to `server/seedData.ts` (seeding only inserts,
   never updates existing rows — a known limitation, see `CONTEXT.md §3.4`).
   Synced that one row's `enabled_modules_json`; this is dev-fixture data,
   not a product fix.

**Financial golden calculations.** `npm run test:finance` (EMI, subsidy,
GST split, payroll, profit margin) and the backend's own profitability
reconciliation in the smoke suite both pass.

**Route integrity.** `npm run validate:routes` resolves all 88 Expo routes
against every static navigation call site.

**Release preflight tooling exists and runs.** `../SAAS-Solar` already has
`release:check` (env/secrets gate for production — `JWT_SECRET` strength,
HTTPS origins, S3 storage requirement) and `release:smoke` (post-deploy
`/health` + `/ready` probe). Both ran clean in dev mode; the production
gate needs real deployment variables to mean anything.

**Security spot-check.** Token storage is OS Keychain/Keystore via
`expo-secure-store` (`src/lib/session.ts`), with a `localStorage` fallback
used only for the web preview build, not the shipped app. No token,
password, or secret is written to `console.*` anywhere in `src/` or `app/`.
`src/lib/diagnostics.ts`'s client-event log already redacts bearer tokens,
emails, and long digit sequences before anything is persisted or bundled
into a support export. Tenant isolation is enforced server-side and is
now covered by an automated regression (above), not just manual testing.

**Debounced search cleanup.** `app/(screens)/platform-search.tsx`
hand-rolled the same 350 ms `setTimeout` debounce that `SearchBar`
(`src/ds/controls.tsx`) and the new `src/hooks/useDebouncedValue.ts` already
provide; switched it to the shared hook. Every other large-list screen
(customers, projects, payroll, invoices, etc.) already debounces server
search through `SearchBar`'s built-in `onSearch` delay — this was the one
screen with its own copy of the logic, not a pattern that was missing.

**Caching posture is a deliberate tradeoff, not a gap.** `src/lib/queryClient.ts`
documents the decision not to persist the React Query cache to disk, so
customer and financial records are never written unencrypted. That
decision should be revisited only if a specific non-sensitive dataset
(e.g. a catalog/reference list) needs offline read access badly enough to
justify a second, scoped persistence layer — nothing in the roadmap
currently requires it.

**Offline queue scope matches what Phase 3/4 actually approved.**
`src/lib/offlineDpr.ts` queues DPR submissions only, which is the one
workflow `PHASE_3_4_IMPLEMENTATION_REPORT.md` calls out as having "private
on-device drafts and an observable oldest-first offline send queue."
Attendance and service tickets were not approved for offline queuing in
that phase, so there's no silent gap here.

## Not done — blocked on infrastructure, not on remaining engineering effort

- **Signed Android/iOS builds and store submission.** Needs real EAS/Apple/
  Google credentials this environment does not have. Per the standing rule
  from the start of this phase: not claimed complete without them.
- **Physical device matrix** (camera, location, file providers, low-memory,
  poor-network, orientation, upgrade path) — needs real hardware.
- **Live accessibility audit** (TalkBack/VoiceOver walkthrough, max
  font-scale, reduced-motion, contrast on-device). The static review above
  (13 of 114 `.tsx` files use `accessibilityLabel`; `SearchBar`'s clear
  button and 44pt-target helpers from Phase 1 are in place) is not a
  substitute for a screen-reader pass and isn't reported as one.
- **Stakeholder UAT and defect closure** — needs a human reviewer, not an
  automated pass.
- **Upload/download progress for large files** — `src/lib/transfers.ts`
  covers upload progress/cancel/retry; a symmetric download-progress path
  for large documents has not been audited yet.

## Next

Device QA, signed builds, and UAT are the remaining Phase 10 exit-gate
items and all require things outside this environment (hardware, store
credentials, a human reviewer). Everything verifiable by code and
automated test now passes.
