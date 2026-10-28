# SolarOS Mobile — 100% Web Parity Roadmap

Status: Active implementation plan  
Created: 28 October 2026  
Functional source of truth: `../SAAS-Solar`  
Mobile source of truth: this repository  
Design source of truth: `../Human-Interface-Guidelines-main/Human-Interface-Guidelines-main`

## Objective

Make the iOS/Android application functionally equivalent to the current SolarOS web application while presenting every workflow as a native, Human Interface Guidelines-aligned mobile experience.

“Equivalent” does not mean copying desktop layouts onto a small screen. It means that every capability, rule, calculation, status transition, permission, and useful action available on the web has an accessible native-mobile path with the same outcome.

## Definition of 100% parity

A module is only 100% when all applicable items below pass:

- Every web entry point has a discoverable mobile entry point.
- List, detail, create, edit, archive/delete, restore, and specialist actions are present.
- Search, filters, sorting, pagination, summaries, exports, print/share, and send-to-customer operations match the web.
- Validation, GST/money calculations, status transitions, and server side-effects match the web.
- `SUPER_ADMIN`, `ADMIN`, and `CUSTOMER` see the same permitted data and actions as web users.
- Tenant module flags, platform roles, RBAC, read-only mode, maintenance mode, and impersonation are enforced.
- Loading, empty, error, offline, success, destructive-action, and partial-data states are intentionally designed.
- A save updates the prior screen immediately and refreshes only affected cached queries.
- The screen follows the HIG acceptance rules below.
- TypeScript, route validation, API contract tests, Android build, iOS build, and role-based acceptance scenarios pass.
- The parity ledger contains evidence: web reference, mobile route, API methods, test cases, and completion status.

Having an API wrapper or a screen title is not sufficient evidence of parity.

## Mandatory mobile design rules

The following rules apply to all new and migrated screens.

### Purpose, hierarchy, and familiarity

- Give each screen one clear primary task and a visually obvious hierarchy.
- Keep the most frequent field actions reachable in the middle or lower part of the screen.
- Use native navigation conventions: predictable back behavior, a maximum of five primary tabs, and secondary destinations under More.
- Keep names, icon meanings, action placement, and status colors consistent across modules.
- Adapt desktop tables into scannable mobile rows/cards and details; do not shrink desktop tables.

### Agency, feedback, and recovery

- Never trap users in a flow. Forms need Cancel/Back and Save/Done behavior.
- Display only one modal sheet at a time. Close a parent sheet before presenting another.
- Warn about unsaved changes before dismissing a form.
- Confirm destructive operations and provide undo/restore where the backend supports it.
- Show clear progress for uploads, exports, sends, and long-running operations.
- Never display raw backend errors. Explain the problem and provide a retry or recovery action.

### Accessibility and flexibility

- Interactive targets must be at least 44×44 points.
- Every icon-only action needs an accessibility label and appropriate role/state.
- Support font scaling/Dynamic Type without clipping important values or controls.
- Do not use color alone to communicate status; pair it with text or an icon.
- Maintain accessible contrast in light and dark appearances.
- Respect safe areas, orientation changes, keyboard presence, and reduced-motion preferences.
- Forms must keep the focused field and its validation message visible above the keyboard.
- Verify key flows with screen-reader navigation.

### Simplicity and craft

- Prefer progressive disclosure over showing every secondary action at once.
- Use concise labels and plain-language help text.
- Reuse shared typography, spacing, color, button, row, sheet, form, chart, and state components.
- Use subtle motion and haptics only to clarify state or confirm an action.
- Provide polished skeleton/loading, empty, error, and success states for every data screen.

## Parity ledger

The detailed ledger will be maintained during Phase 0. Each row represents a user capability rather than only a page.

| Area | Baseline estimate | Target | Delivery phases |
|---|---:|---:|---|
| Daily field operations | 75–85% | 100% | 1, 3, 10 |
| Customers and projects | 65–75% | 100% | 1, 2, 10 |
| Finance workflows | 55–70% | 100% | 1, 4, 10 |
| Sales workflows | 65–75% | 100% | 1, 5, 10 |
| Tenant administration | 50–60% | 100% | 1, 6, 10 |
| Super Admin platform | 25–40% | 100% | 1, 7, 8, 10 |
| Customer self-service | Partial | 100% | 1, 9, 10 |
| Overall | 60–70% | 100% | 0–10 |

## Phase 0 — Baseline, contracts, and release health

Goal: establish a truthful, reproducible baseline before feature work.

- Create a web capability inventory from sidebar destinations, detail views, modals, API calls, and role-specific actions.
- Create the parity ledger with one row per capability and columns for web reference, mobile route, API, roles, permission, tests, HIG review, and status.
- Validate every mobile menu destination and remove all unmatched-route failures.
- Add missing route shells only when they contain an honest unavailable state or are implemented in the same phase; never retain dead links.
- Perform a clean dependency install and make `npm run lint` (`tsc --noEmit`) pass.
- Resolve missing package installation/type resolution and all implicit-`any` failures.
- Add route-manifest validation so navigation cannot point to a missing Expo Router route.
- Add API contract smoke tests for authenticated reads and safe mutation lifecycles.
- Record seeded test accounts and representative tenant/customer/project fixtures without storing production credentials.
- Verify Android export/build and establish the iOS build command used by CI/EAS.

Exit gate:

- Clean checkout installs reproducibly.
- TypeScript and route validation pass.
- No visible menu item opens a missing route.
- The complete capability ledger is committed and reviewed.

## Phase 1 — HIG design system and application shell

Goal: make one consistent native design foundation mandatory before expanding screens.

- Consolidate semantic colors, typography, spacing, radius, elevation/material, icon sizing, and state tokens.
- Implement light/dark appearance support and contrast-safe tenant branding.
- Add reusable navigation bars, tab bar, section headers, searchable lists, filter sheets, action sheets, form sections, sticky action areas, charts, status badges, and notices.
- Standardize loading skeletons, empty states, recoverable error states, toast/banner feedback, and offline indicators.
- Standardize keyboard-aware forms, validation summaries, unsaved-change protection, and one-sheet-at-a-time behavior.
- Add accessibility helpers for 44-point targets, labels, roles, focus order, font scaling, and reduced motion.
- Repair cache keys and targeted invalidation; document query-key ownership per domain.
- Add global handling for maintenance, read-only, blocked/archived tenant, expired password, MFA, session expiry, and network loss.
- Replace the current More menu’s dead links with implemented destinations as their phases land.

Exit gate:

- Shared components pass a design/accessibility checklist.
- No migrated screen introduces one-off styling for an existing pattern.
- Shell behavior is verified for all three account types and impersonation.

## Phase 2 — Dashboard, customers, and projects

Goal: reach full parity for the product’s central operational entities.

### Dashboard

- Match role-aware KPIs, charts, recent activity, quotation pipeline, capacity distribution, warranty alerts, service-desk summary, receivables, billing/read-only notices, and drill-down actions.

### Customers

- Server pagination/search/filter/sort and complete customer summary.
- Overview, projects, payments, warranties, invoices, tickets, documents, and account activity.
- Create/edit/archive/delete-to-recycle-bin/restore support where allowed.
- Portal enable/disable, credential reset/share, call/WhatsApp/map actions, privacy request, and files.

### Projects

- Full create/edit/detail/delete lifecycle and post-save refresh.
- Pipeline/stage changes, technical specs, equipment/assets/serials, BoQ/dispatch, DISCOM/subsidy, DPR/attendance, photos/documents, financials/margins, payments, expenses, invoices, warranties, tickets, and timeline.
- Contextual actions must return to and refresh the project without stacked-modal problems.

Exit gate:

- Dashboard, customer, and project ledger rows are 100% across staff/customer roles and permission variants.

## Phase 3 — Delivery and field operations

Goal: complete every site, stock, after-sales, and field workflow.

- Inventory: items, stock, movements, low-stock, BoQ, project issue/return, installed assets, serial tracking, search/filter, and barcode support where device capability allows.
- DISCOM: staff tracker, project/customer embedded views, stage actions, documents, subsidy/net-meter history, and role validation.
- Field operations: attendance, GPS consent/capture, DPR create/edit/detail, site photos, upload progress, offline drafts, and queued submission.
- Service tickets: create/edit, category/priority, assignment, status, comments/internal notes, attachments/camera, timeline, resolution, and customer view.
- Warranties: asset linkage, details, certificate PDF, share/send, renewal/expiry state, and customer visibility.
- Documents: upload/camera, category/search/filter, preview/open/share/delete, and customer/project context.

Exit gate:

- Field users can complete a full workday using the app without needing the web for these modules.

## Phase 4 — Finance, GST, and payroll

Goal: match every calculation, control, document, and approval path.

- Payments: create/edit, project/customer context, filters/summary, receipt PDF, send/share, reconcile, refund, reversal rules, references, and ledger refresh.
- Invoices: next-number preview, line items, equipment serials, GST settings, CGST/SGST/IGST calculations, HSN/SAC, taxable value, status changes, PDF/print/share, send, payment link, and customer view.
- Expenses: receipts, create/edit/delete, approval, bulk approval, reject/reverse, permissions, filters, and project impact.
- Payroll: employees, attendance inputs, advances, batch payroll, edit/delete, settlement/recovery, payslip PDF/share, filters, and export.
- Profit and margins: customer-wise/project-wise summaries, actual procurement/field cost, drill-downs, sorting, and consistent calculations.
- EMI calculator and finance-related settings.

Exit gate:

- Golden calculation tests match web results for money, tax, balances, payroll, and profit.
- Generated documents match approved business fields and totals.

## Phase 5 — Sales and quotations

Goal: complete the mobile sales lifecycle from enquiry to project.

- Leads: server search/filter/sort, follow-ups/reminders, call/WhatsApp, source/status management, edit/delete, convert to customer, and quotation context.
- Quotations: complete builder, editable line items, pricing/tax/discount, templates, settings, preview, version/edit, PDF, share/send, statuses, and conversion linkage.
- Ensure all mutations refresh dashboards, lead/customer details, and quotation lists selectively.

Exit gate:

- A sales user can move a new lead through quotation and conversion without opening the web app.

## Phase 6 — Tenant administration

Goal: complete all company-level administration for tenant owners and permitted staff.

- Reports/export with all datasets, filters, CSV/PDF output, sharing, and safe empty/partial-data behavior.
- Audit/activity explorer with filters, details, security context, and export.
- Team users, activation/deactivation, roles, password/security actions, and device/session administration.
- Roles and permissions with the full permission catalog and safety rules for system/owner roles.
- Company settings: profile, branding, bank/GST/invoice/quotation defaults, modules, notifications, subscription, and security settings.
- Tenant billing/subscription, invoices, usage, payment state, and plan limits.
- Recycle bin, privacy requests, data copy/delete requests, support, feedback, and getting-started/help content.

Exit gate:

- A tenant owner can administer the company without the web portal.

## Phase 7 — Super Admin core control plane

Goal: complete high-frequency platform operations.

- Tenant directory, overview, onboarding, edit, scope/impersonation, read-only controls, notes, lifecycle, renew/extend, archive/delete, owner transfer, clone, and export.
- Usage analytics and limits.
- Platform users and platform-role assignment.
- Plans and entitlements.
- Enquiries and global search.
- System health and platform activity/security overview.

Exit gate:

- Platform Owner/Admin can perform core tenant operations from mobile with the same safeguards as web.

## Phase 8 — Super Admin advanced control plane

Goal: remove every remaining web-only platform dependency.

- SaaS billing: invoices, GST, payment recording/deletion, public/payment links, reminders, dunning, pricing, coupons, revenue, and jobs.
- Support inbox: tickets, assignment, replies, status, attachments, and internal handling.
- Communication: email/SMS/WhatsApp configuration and templates, announcements, and delivery feedback.
- Demo accounts and prospect lifecycle.
- API access and website-login management.
- Platform security: security policy, MFA policy, session/password policy, IP allowlists, alerts, and platform roles.
- Data and backups: storage, backup/download/delete, S3/R2 status, ZIP exports, imports/undo, retention, privacy administration, and error logs.
- Mobile app administration: versions, minimum version, updates, announcements, and push targeting.
- Platform settings, legal pages, feature flags, maintenance controls, and public configuration.

Exit gate:

- Every Super Admin sidebar capability has a complete permission-aware mobile workflow.

## Phase 9 — Customer self-service parity

Goal: give customers the complete web portal outcome with a simpler native experience.

- Customer dashboard, systems/projects, DISCOM progress, payments/receipts, invoices, warranties, documents, service requests, notifications, feedback, and account security.
- Public/customer document opening and sharing.
- Privacy/data requests and transparent consent for camera, files, location, and notifications.
- Contextual contact/support actions and clear read-only states.

Exit gate:

- Every customer portal task is available and verified against customer data isolation rules.

## Phase 10 — Performance, offline resilience, security, and release certification

Goal: prove the application is mature, not merely feature-complete.

- Server-paginated FlashList screens and debounced server search for all large datasets.
- Targeted React Query caching, persistence for safe read data, background refresh, optimistic updates where reversible, and image thumbnails/cache.
- Offline drafts and an observable retry queue for approved field workflows.
- Upload/download progress, cancellation, retry, and large-file handling.
- Security review for tokens, logs, local storage, impersonation, tenant isolation, permissions, and sensitive document sharing.
- Automated role/RBAC/API contract/regression tests plus golden financial calculations.
- Accessibility audit, screen-reader flow, font-scale test, contrast review, keyboard review, and reduced-motion review.
- Android/iOS device matrix, deep links, notifications, camera, location, file providers, orientation, low-memory, poor-network, and upgrade tests.
- Signed preview builds, stakeholder UAT, defect closure, store metadata, monitoring, rollback, and release runbook.

Exit gate:

- Every ledger row is complete with test evidence.
- Zero unresolved critical/high defects.
- TypeScript, automated checks, Android and iOS release builds pass.
- Product owner signs off each role’s acceptance suite.
- Overall parity can then be reported as 100%.

## Implementation order and change discipline

- Work strictly in phase order unless a later feature is required to unblock an earlier phase.
- Keep each change small enough to review and test.
- Prefer existing backend endpoints; add or change backend contracts only when the web capability cannot be safely consumed by mobile.
- Reuse shared domain types and calculations. Do not create mobile-only interpretations of GST, balances, margins, status, or permission logic.
- After each module, update the parity ledger and its tests in the same change.
- Do not mark a phase complete based only on screenshots or manual happy-path testing.

## Immediate Phase 0 findings

- The first `npm run lint` attempt failed because the local dependency tree was incomplete even though the Expo packages were declared in `package.json`.
- After reinstalling the declared dependencies, `npm run lint` passes. The apparent implicit-`any` failures were cascading unresolved-type errors rather than independent screen defects.
- Expo SDK 57 dependency versions are now aligned with `npx expo install --check`.
- Static route validation now covers all current app/component/feature navigation and passes for 65 Expo routes.
- Dead navigation affordances for unimplemented EMI, privacy, recycle bin, help/support, and platform screens were temporarily removed; the ledger retains them and their assigned delivery phases.
- Android production export passes and produces a Hermes bundle. Signed Android and iOS builds remain later release gates.
- A non-breaking dependency audit repair reduced the audit result from 22 advisories (including one critical) to 12 advisories (six low, three moderate, three high). Remaining automatic fixes propose breaking Expo changes and require deliberate SDK-compatible remediation; `--force` must not be used blindly.
- The previous `docs/web-parity-gaps.md` is historical and partly stale; fixed items must not be reimplemented, and remaining/new items must move into the capability ledger.

These are Phase 0 blockers and must be corrected before feature percentages are raised.
