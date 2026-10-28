# SolarOS Web-to-Mobile Parity Ledger

Status: Phase 0 baseline — expand capability rows while each module is implemented  
Updated: 28 October 2026

This ledger is the measurable companion to `WEB_MOBILE_100_PARITY_ROADMAP.md`. A module marked Partial can contain strong individual workflows; it remains Partial until every applicable web capability and acceptance gate has evidence.

Status values:

- `Present`: route and substantial native workflow exist, but detailed parity review remains.
- `Partial`: important web capabilities are missing or materially reduced.
- `Missing`: no usable mobile workflow exists.
- `Blocked`: implementation depends on a backend contract or product decision.
- `Verified`: all capability rows and acceptance tests for that module pass.

No module is currently marked Verified.

## Tenant ERP

| Web capability | Web source | Mobile route/source | Baseline | Target phase |
|---|---|---|---|---:|
| Role-aware dashboard | `AdminDashboardView` | `/(tabs)/dashboard` and `src/features/home/*` | Present — Phase 2 implementation complete; device/RBAC verification pending | 2 |
| Getting started | `HelpGuideView` | `/help` | Present — searchable native workflow guides with module deep links and support hand-off | 6 |
| Company support | `CompanySupportView` | `/support`, `/support/[id]` | Present — create, attach, reply, resolve/reopen and conversation history implemented | 6 |
| Leads and follow-ups | `LeadsView` | `/leads`, `/lead/[id]`, `/lead-form` | Present | 5 |
| Quotations | `QuotationsView`, quotation components | `/quotations`, `/quotation/[id]`, `/quotation-form`, `/quotation-settings` | Present — builder, templates/defaults, versions, PDF/share/send, statuses and lead/customer/project linkage implemented | 5 |
| Customers | `CustomersView`, `CustomerDetailModal` | `/(tabs)/customers`, `/customer/[id]`, `/customer-form` | Present — complete native detail workspace; restore remains Phase 6 | 2 |
| Solar projects | `ProjectsView`, `ProjectDetailModal` | `/(tabs)/projects`, `/project/[id]`, `/project-form` | Present — core web workspaces/actions mapped; device/RBAC verification pending | 2 |
| Inventory and BoQ | `InventoryView`, `ProjectBoqTracker` | `/inventory`, `/inventory-form`, project detail | Present — stock/dispatch/return/write-off, BoQ and serial-to-asset flow implemented; device/RBAC verification pending | 3 |
| DISCOM/subsidy | `DiscomLiaisonTracker`, project/customer details | `/discom`, `/discom-form`, project detail | Present — overview, embedded timeline and stage/status actions implemented | 3 |
| Field operations/DPR/attendance | project and operations views | `/field-operations`, `/field-operation-form`, `/dpr/[id]` | Present — GPS attendance, DPR/photos, private drafts and observable offline queue implemented | 3 |
| Service tickets | `ComplaintsView`, detail/form modals | `/tickets`, `/ticket/[id]`, `/ticket-form` | Present — assignment, status, resolution, attachments, comments/internal notes and timeline implemented | 3 |
| Warranties | `WarrantiesView`, `WarrantyModal` | `/warranties`, `/warranty/[id]`, `/warranty-form` | Present — asset/serial linkage, certificate PDF/share/send and expiry state implemented | 3 |
| Documents and site files | `DocumentsView` and project details | `/documents`, `/document-form`, project detail | Present — server paging/search/category, camera/file upload, open/share and context implemented; delete is not exposed by the backend | 3 |
| Payments and receipts | `PaymentsView`, `PaymentModal` | `/(tabs)/payments`, `/payment/[id]`, `/payment-form` | Present — create/edit/reconcile/refund and receipt PDF/share/send implemented | 4 |
| GST invoices | `InvoicesView`, `InvoiceModal`, printable documents | payments tab, `/invoices`, `/invoice/[id]`, `/invoice-form` | Present — itemized HSN lines, CGST/SGST/IGST, serials, immutable GST snapshot, status/PDF/share/send implemented | 4 |
| Expenses and approvals | `ExpensesView`, `ExpenseModal` | `/expenses`, `/expense-form` | Present — receipts, approval/reject/bulk approval, reverse/delete and project impact implemented | 4 |
| Payroll, employees, advances, payslips | `PayrollView` and payroll modals | `/payroll` and payroll forms | Present — paged staff/payroll/advances, batch/edit/delete/settle/recovery, CSV and payslip PDF implemented | 4 |
| Profit and margins | `ProfitMarginsView` | `/profit` | Present — customer/project drill-down, sorting and export implemented | 4 |
| Loan EMI | `LoanEmiModal`, EMI library | `/emi` | Present — web-equivalent subsidy and reducing-balance calculation with share implemented | 4 |
| Reports and exports | `ReportsExportView` | `/reports` | Present — projects, collection, payroll, expense, warranty, GST invoice, margin and service datasets with permission gates, dates, summary, CSV and PDF sharing | 6 |
| Audit/activity | `ActivityLogsView`, security panel | `/audit-logs` | Present — paged search/severity filter, event/change/security drill-down and full authenticated CSV export | 6 |
| Team members | `TeamUsersView` | `/team`, `/team-form` | Present — create/edit/activate/deactivate, role assignment, password/MFA reset and all-device sign-out | 6 |
| Roles and permissions | `RolesPermissionsView` | `/roles`, `/role-form` | Present — full grouped catalog, assignability/edit safety and system/owner restrictions delegated to server | 6 |
| Company settings | `SettingsView` and settings panels | `/settings`, `/settings-form`, `/company-profile`, `/quotation-settings` | Present — identity/branding, legal/GST/bank, invoice/quotation defaults, lists, security and data controls | 6 |
| Tenant subscription and billing | `SubscriptionBilling` | `/billing` | Present — subscription state, renewal, usage/plan limits, storage and public billing invoice access | 6 |
| Recycle bin | `RecycleBin` | `/recycle-bin` | Present — retention context, restore and confirmed permanent purge | 6 |
| Privacy requests | `PrivacyRequests`, `PrivacyCard` | `/privacy` | Present — staff/customer copy and deletion requests, completion/erasure and authenticated export | 6/9 |

## Super Admin control plane

| Web capability | Web source | Mobile route/source | Baseline | Target phase |
|---|---|---|---|---:|
| Tenants and lifecycle | `SaaSControlPlaneView`, tenant panels | `/tenants`, `/tenant-form` | Partial | 7 |
| Usage | `UsageTab` | `/platform/usage` is linked but missing | Missing UI | 7 |
| Platform support inbox | `SupportInboxView` | `/platform/support` is linked but missing | Missing UI | 8 |
| SaaS billing | `BillingTab` | `/platform/billing` is linked but missing | Missing UI | 8 |
| Communication | `CommunicationTab` | grouped under missing `/web-only` | Missing | 8 |
| Demo accounts | `DemosTab` | grouped under missing `/web-only` | Missing | 8 |
| Enquiries | `EnquiriesTab` | `/platform/enquiries` is linked but missing | Missing UI | 7 |
| API access/website login | `ApiAccessTab`, `WebsiteLoginPanel` | grouped under missing `/web-only` | Missing | 8 |
| Platform users | `PlatformUsersTab` | `/platform/users` is linked but missing | Missing UI | 7 |
| Plans | `PlansTab` | `/plans`, `/plan-form` | Present | 7 |
| Activity and security overview | `AuditLogTab` | `/platform-audit` | Partial | 7 |
| Global search | `PlatformSearchTab` | `/platform-search` | Present | 7 |
| System health | `SystemHealthTab`, `HealthExtras` | `/system-health` | Partial | 7 |
| Platform security | `PlatformSecurityTab` | grouped under missing `/web-only` | Missing | 8 |
| Data, backups, storage, retention | `DataTab` | grouped under missing `/web-only` | Missing | 8 |
| Mobile app administration | `MobileAppTab` | grouped under missing `/web-only` | Missing | 8 |
| Platform settings/flags/legal/maintenance | `PlatformSettingsTab` | grouped under missing `/web-only` | Missing | 8 |

## Customer self-service and account security

| Capability | Mobile source | Baseline | Target phase |
|---|---|---|---:|
| Customer dashboard and project summary | customer home and customer/project details | Present | 9 |
| Payments, receipts, and invoices | payments/invoice routes | Partial | 9 |
| DISCOM and installation progress | project/customer details | Partial | 9 |
| Warranty cards and documents | warranty/document routes | Present | 9 |
| Service requests | ticket routes | Present | 9 |
| Feedback | `/feedback` | Present | 9 |
| Notifications | `/notifications` | Present | 9 |
| Password, MFA, devices and sessions | account/security/session routes | Present | 9 |
| Privacy/data requests | `/privacy` | Present — customer copy/deletion request and history implemented | 9 |
| EMI calculator | `/emi` | Present | 9 |

## Cross-cutting acceptance ledger

| Capability | Baseline | Target phase |
|---|---|---:|
| Every visible navigation target resolves | Passes static route validation for 73 routes; runtime/deep-link test pending | 0/10 |
| Reproducible dependency install | SDK 57 versions aligned; clean CI proof pending | 0 |
| TypeScript validation | Passes after dependency install | 0 |
| Route manifest validation | Implemented and passing through `npm run validate:routes` | 0/10 |
| HIG component and screen checklist | Shared Phase 1 foundation implemented; manual device evidence pending | 1/10 |
| Light/dark appearance | Present in shared semantic theme; device contrast review pending | 1/10 |
| Dynamic Type/font scaling | Shared text scaling implemented; max-size device audit pending | 1/10 |
| Screen-reader semantics and focus | Shared roles/labels improved; TalkBack/VoiceOver audit pending | 1/10 |
| 44-point targets | Enforced for shared buttons, icon actions, segmented controls, chips and search; legacy-screen audit pending | 1/10 |
| Safe area and keyboard behavior | Shared keyboard-aware screens and safe areas implemented; device verification pending | 1/10 |
| Query cache and targeted invalidation | Domain ownership and targeted invalidation implemented; mutation regression tests pending | 1/10 |
| Pagination and large-list performance | Partial | 10 |
| Offline drafts and mutation queue | DPR private drafts and observable retry queue implemented; wider workflow coverage remains Phase 10 | 3/10 |
| Android production export | Passes; signed build/device install remain | 0/10 |
| iOS production build | Pending EAS/macOS verification | 0/10 |
| Role/RBAC regression suite | `../SAAS-Solar`'s `npm run smoke` passes: SUPER_ADMIN/ADMIN/CUSTOMER authenticated-read coverage, operational CRUD lifecycle, and cross-tenant isolation. Three stale assertions and one dev-server ESM crash fixed to get it green; see `PHASE_10_IMPLEMENTATION_REPORT.md` | 9/10 |
| Financial golden tests | EMI, subsidy, GST, payroll and profit golden checks run through `npm run test:finance`; backend profitability reconciliation now runs as part of the automated smoke suite | 8/10 |
| Accessibility audit | Static review only (label/target coverage); no TalkBack/VoiceOver, font-scale or contrast device pass yet | 3/10 |
| Signed-build UAT | Missing — needs EAS/Apple/Google credentials and a human reviewer, neither available in this environment | 10 |

## Known unresolved navigation targets

None. Static route validation currently checks 73 Expo Router destinations. Platform Phase 7/8 screens that do not yet exist are not exposed as mobile navigation links.

## Phase 7-9 implementation update (28 October 2026)

The baseline tables above are retained as the pre-implementation comparison. Current implementation state:

- Phase 7 Present: `/tenants`, `/tenant/[id]`, `/platform/usage`, `/platform/enquiries`, `/platform/users`, `/platform-audit`, `/system-health`.
- Phase 8 Present: `/platform/billing`, `/platform/billing/[id]`, `/platform/support`, `/platform/support/[id]`, `/platform/communication`, `/platform/demos`, `/platform/api-access`, `/platform/security`, `/platform/data`, `/platform/mobile`, `/platform/settings`.
- Phase 9 Present: customer dashboard/project summary, payments/receipts/invoices, installation and DISCOM progress, warranty/documents, service requests, feedback, notifications, account security/sessions, privacy requests and EMI.
- Static validation now covers 88 Expo routes and reports no unresolved visible navigation targets.
- Status is `Present`, not `Verified`: live role/isolation tests, accessibility evidence, signed builds and stakeholder UAT remain Phase 10 gates.

Detailed evidence and scope are recorded in `PHASE_7_8_9_IMPLEMENTATION_REPORT.md`.

## Evidence required when changing a row to Verified

- Web capability checklist linked or embedded.
- Mobile route and shared component references.
- API methods and permission/module gates listed.
- Happy path, validation error, network error, empty state, and permission denial tested.
- Mutation refresh behavior tested.
- HIG/accessibility checklist completed.
- Android and iOS acceptance evidence recorded.
