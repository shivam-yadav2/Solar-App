# Mobile parity — Phase 1 and Phase 2 implementation report

Updated: 28 October 2026

## Phase 1 — HIG foundation

Implemented in the shared design system:

- Semantic light/dark colours, typography, spacing, radii, elevation, status tones, and contrast-safe accents.
- Native navigation bars, safe-area-aware screens, sticky actions, keyboard-aware scrolling, virtualized lists, searchable pickers, sheets, grouped forms, charts, badges, notices, loading skeletons, empty states, recoverable errors, and toast feedback.
- Minimum 44-point controls for buttons, icon actions, segmented controls, chips, and search controls.
- Dynamic Type support with controlled font scaling and accessible labels/roles on reusable interactive components.
- Reduced-motion handling for taps, skeletons, progress, charts, segmented controls, sheets, and toast feedback.
- One action-sheet host at the app root and delayed follow-up navigation so a second modal is not stacked behind the first.
- Reusable unsaved-change protection for native back gestures and form navigation.
- Targeted React Query invalidation by domain in `src/lib/query.ts`; mutations refresh only related lists and details.
- Global maintenance, blocked tenant, read-only, forced-password, legal-consent, update, session-expiry, and workspace-notice handling.

Query-key owners:

| Domain | Root keys | Invalidates |
|---|---|---|
| Customers | `customers` | customers, dashboard, global search |
| Projects | `projects` | projects, customers, dashboard, search, DISCOM, BoQ, DPR, inventory |
| Payments | `payments` | payments, invoices, customers, projects, dashboard, profit |
| Invoices | `invoices` | invoices, payments, customers, projects, dashboard |
| Expenses | `expenses` | expenses, projects, dashboard, profit |
| Service | `complaints`, `warranties`, `documents` | their lists plus affected customer/project/dashboard queries |
| Site work | `inventory`, `boq`, `discom`, `attendance`, `dpr` | related project and field-operation queries |

## Phase 2 — Dashboard, customers, and projects

### Dashboard

- Role-aware staff, customer, and platform dashboards remain separate native experiences.
- Staff dashboard now includes contract value, collections, receivables, profit/margin, active projects, installed capacity, and customer KPIs.
- Added sales-versus-cost comparison, pipeline distribution, capacity distribution, recent projects, recent business activity, quotation attention, warranty/service/expense attention, profile gaps, and drill-down actions.
- Billing/read-only/maintenance/update notices remain visible through the shared workspace notice layer.

### Customers

- Server pagination, debounced search, status filtering, pull-to-refresh, summaries, and contextual actions.
- Customer detail is organized into five mobile-native tabs: Overview, Projects, Money, Service, and Files.
- Full project, payment, invoice, warranty, service-ticket, and document lists are available from the customer record.
- Create/edit, archive, delete-to-recycle-bin, credential creation/reset/share, call, WhatsApp, email, and map workflows are connected.
- Customer form uses the shared keyboard-aware form system, inline validation, and unsaved-change protection.

### Projects

- Server pagination, debounced search, pipeline filters, payment-status filters, summaries, and pull-to-refresh.
- Project detail provides Overview, Money, Site, DISCOM, and Files workspaces, adapting the web tabs to a maximum of five mobile tabs.
- Pipeline changes, technical details, serial numbers, equipment assets, BoQ/dispatch, DPR, DISCOM/subsidy, payments, expenses, invoices, profit/margin, documents, warranties, and tickets are connected.
- Contextual project actions include edit, stage change, payment, expense, invoice, and delete.
- Project create/edit was rebuilt with grouped HIG forms, searchable customer selection, native dates, complete supported technical/battery/DISCOM fields, equipment serials, deal calculations, validation, unsaved-change protection, and targeted post-save refresh.

## Verification completed

- `npm run check` passes.
- TypeScript compilation passes.
- Static validation confirms all 65 Expo Router destinations resolve.
- `git diff --check` reports no whitespace errors.

## Verification still required before calling these phases release-certified

- Android and iOS device acceptance for large text, TalkBack/VoiceOver, reduced motion, keyboard behavior, dark mode, poor network, and every permission variant.
- Role-based API acceptance using seeded ADMIN, staff-role, CUSTOMER, and impersonated sessions.
- Signed preview builds and stakeholder UAT.
- Restore-from-recycle-bin remains part of Phase 6 because the recycle-bin UI is not a Phase 2 route.
- Privacy requests/account activity exploration remain assigned to Phases 6 and 9.

The implementation work for Phases 1 and 2 is present, but ledger rows remain `Present` rather than `Verified` until the device and role acceptance evidence above is recorded.
