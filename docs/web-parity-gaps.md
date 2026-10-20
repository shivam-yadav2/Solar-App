# Mobile app vs web portal — gap list (2026-10-20)

Web portal (SAAS-Solar) vs mobile app (Solar-App 1.1.0). Each item was checked against the code, and the data and API items were also run on a copy of the production database.

Size today: the web client has about **330 API calls** and the app has about **110**. The web has 20 main pages plus detail pages, about 15 Super Admin sections, and the customer portal. The app has 5 tabs and 50 screens, but most screens are a short list plus a simple form.

Priority: **P0** = broken or wrong now (fix first), **P1** = everyday work missing, **P2** = important, **P3** = later.

---

## A. P0: broken or wrong now

1. **Screens can show each other's data.**
   - `useFetch` builds its cache key from `fn.toString()`. The release APK runs on Hermes, which does not keep function source (`[bytecode]`), so most screens can get the same key. 32 of the 33 calls don't pass their own key.
   - Result: if you open one screen and then another within 2 minutes, the second can show empty or wrong data until refresh. This is probably the "data not loading" problem.
   - Fix: give every query an explicit key, e.g. `['leads', params]`.
2. **2-factor (2FA) users can't sign in to the app.**
   - The server replies `mfaRequired` + `mfaToken`, and the app has no code-entry step.
   - Staff and Super Admins become blocked as soon as the "2FA required" policy is on.
3. **Temporary or expired passwords are never forced to change in the app.**
   - The web shows a "Set your password" screen. The app ignores `forcePasswordChange`, so a customer or staff member can keep using the temporary password indefinitely.
4. **Only 50 customers load.** `/customers` returns 50 by default.
   - The Customers tab shows only the first 50.
   - The customer dropdowns in the invoice, payment, expense, warranty and project forms also use this list, so the 51st customer onwards cannot be selected.
   - Other lists stop at 200, and no screen has "load more".
5. **Super Admin → company billing is broken.**
   - The app calls `/saas/billing/:tenantId`, which was removed in the new billing.
   - **Server bug:** an unknown `/api/...` path returns the web page (HTML, status 200) instead of a JSON 404, so the app gets a confusing error. Fix this on the server too.
6. **The "Subscription Billing" screen shows old data.** It reads the old `/billing` (saas_subscriptions). The new SolarOS GST invoices (`/billing/invoices`), payment status and storage usage do not show.
7. **No handling for maintenance, read-only, locked or archived companies.**
   - When the server returns 503 (maintenance) or 403 (read-only or unpaid), the app only shows the raw error. There is no maintenance page, and no "account is read-only" banner.
   - Write buttons should be hidden in read-only mode.
8. **Large responses on every app start.**
   - The company logo is stored as base64 inside the tenant, so `/auth/me` is about **63 KB** for each customer. `/saas/tenants` is 70 KB and `/saas/tenants/:id` is 63 KB.
   - Fix: save the logo as a file and send only its URL. This makes the web faster too.
9. **Security (server, affects web and app):** `/auth/change-password` does not check the current password. Anyone with a stolen session can change the password. Fix: require `currentPassword`, except for a temporary or expired password.

## B. Performance

- **No virtualised lists.** Every list is a ScrollView plus `.map()` (no FlatList or FlashList), so with 200 rows the whole list renders at once and scrolling stutters. Use FlashList with pagination (load more as you scroll).
- **Every save reloads everything.** `invalidateQueries()` runs after every POST/PUT, so all cached screens fetch again. Only the affected keys should be invalidated.
- **Detail screens fetch whole lists.**
  - The invoice detail loads all invoices and searches them.
  - The payment edit loads all payments.
  - Forms load the full customer and project lists for their pickers. These should use server-side search pickers that load 20 at a time.
- **Dashboard:** about 6 API calls at once. One combined `/analytics/dashboard` call would be enough. The customer dashboard loads the full `/customers/:id`.
- **Data search:** only 2 screens have search. Leads, payments, invoices, expenses, tickets and warranties have no filters (status, date, project). The web sends these to the server.
- **Offline:** nothing stays after the app is killed. Add a small offline cache for the last-opened lists, and a send queue for DPRs and attendance done on site.
- **Images:** no caching, and site photos open at full size. Thumbnails are needed.

## C. Company features (web has them, the app doesn't)

| Module | Web | App today | Missing in the app |
|---|---|---|---|
| Dashboard | KPIs, charts, recent activity, quotations | KPIs + short lists | Charts, activity feed, quotation pipeline, read-only/billing alerts |
| Leads | List, filter, follow-ups, **convert to customer**, edit, delete | List, form, follow-up, delete | Convert to customer, status/source filters, search, call/WhatsApp buttons, follow-up reminders |
| Quotations | Full builder (line items, templates, pricing), preview/PDF, share, status, edit, quotation settings | Basic create, status, delete | Builder, edit, PDF preview/share, templates, quotation settings, send to customer |
| Customers | Server search, filters, detail (projects, payments, files), portal login, credentials, delete→recycle bin, archive | List (50), detail, form, archive, reset password | Pagination/search, portal login on/off, share credentials, delete to recycle bin, privacy request, call/WhatsApp/map, files |
| Projects | Large detail: stages, BOQ tracker, DISCOM tracker, equipment/assets, documents, site photos, delete, KPIs | List + read-only detail + edit form | Stage updates from detail, BOQ/DISCOM/DPR inside the project, assets "installed", documents/photos, delete, timeline |
| Field work | DPR, attendance | Punch in/out, DPR create | Photo capture with DPR, GPS on punch-in, offline submit |
| DISCOM | Tracker inside project and customer portal | Separate screen | Inside project + customer view |
| Inventory | Items, stock movements, BOQ, assets | Mostly the same | Low-stock view, search, scan (barcode) — P3 |
| Service tickets | Detail: assign, priority, update, comments, status | Comments + status | Assign technician, edit priority/category, photo attachments |
| Warranties | Create with equipment assets, printable certificate, send | List + create | Detail, certificate PDF/share, send to customer, link to assets |
| Documents | Upload, categories, open | Upload, open | Category filter, camera upload, share |
| Payments | Refund, reconcile, receipt print, send, summary, filters | List, create/edit | Refund, reconcile, receipt PDF/share, WhatsApp/email to customer, filters/summary |
| Invoices | Next number preview, create, status (paid/cancel), print, send | Create, list, detail | Status changes, PDF/print/share, send to customer, next-number preview |
| Expenses | **Approve, bulk approve, reverse**, receipts | List, create, delete | Approvals (important for the owner on the phone), reverse, receipt photo |
| Payroll | Employees, records, advances, batch, **payslip print** | Mostly the same | Payslip PDF/share |
| Profit | Customer profitability | Same | Charts only |
| Reports & export | Excel/CSV exports of payments, invoices, expenses, payroll, projects, warranties | Summary + CSV share | All web exports, date range |
| Audit log | Explorer: filters, facets, CSV export, user security panel | Plain list | Filters/search, export, open a user's sessions |
| Team | Create/edit, deactivate, reset password, reset 2FA, sessions, sign out everywhere, plan limits | Create/edit | All security actions, limit display |
| Roles | Full | Mostly the same | — |
| Settings | Company, invoicing, preferences, **SolarOS billing, recycle bin, privacy requests, security (2FA, sessions)**, company profile | Company view/edit | Recycle bin, privacy requests, 2FA setup, my sessions, SolarOS invoices + storage, download company data, quotation settings |
| SolarOS support | Raise a ticket, attachments, reply | — | Complete |
| Help guide | Present | — | Complete |
| Global search | Customers, projects, invoices, payments, tickets | Super Admin only | For company staff too |
| Send to customer | Invoice/receipt/warranty/quotation by email or WhatsApp | — | Complete |
| Calculators | Solar size calculator, loan EMI | — | Complete |

## D. Customer portal (in the app)

The app has invoices, warranties, tickets, documents, feedback, notifications and password change. Missing:

- **Project progress and the DISCOM tracker:** where the customer's project has reached.
- Payment receipts list, plus invoice and receipt PDF download/share.
- Warranty certificate PDF.
- "Your data & privacy": data copy or delete request.
- Loan EMI calculator.
- Company contact: call/WhatsApp support buttons in the company's own branding (logo and colour).
- Forgot password from the login screen.
- Opening the app from the company website's "Customer login" link (`/c/<company>`), as a deep link.

## E. Super Admin (in the app)

The app has Tenants (list/form), Plans, Audit, Search and Health. Missing:

- **Company drawer:** renew/extend/read-only/archive, change code, owner transfer, clone, CRM notes, people (staff/customer logins), website login.
- Usage, Billing (invoices, record payment, revenue), Support inbox, Communication, Demo accounts, Enquiries, API access, Users, Platform security (team, policy), Platform settings, Data & backups, Mobile app (push).
- Practical scope: on the phone, **Billing (record payment), Support inbox, Usage/alerts, company renew/read-only** are needed most. The rest can stay web-only, with a link that opens the web page.

## F. Common to all screens

- Announcement banner, legal pages "Accept" (owners), feature flags (beta).
- Login: 2FA, forgot password, set password, maintenance screen (see A).
- Push notifications: done in 1.1.0. Firebase setup and a notification tap that opens the right record are still needed.
- Deep links: reset-password link, company login link, notification → record.
- Download/share: every PDF (invoice, receipt, quotation, warranty, payslip). Render on the server or use `expo-print` so the same design as the web is reused.
- Camera/photos: site photos, expense receipts, ticket photos, with compression.
- Haptics, pull-to-refresh everywhere, skeleton loaders, empty states with an action.

## G. Design: the Apple-style premium feel (app + portal)

The Apple skills plugin (`rshankras/claude-code-apple-skills`) is in the plugin directory. Its 164 skills are for SwiftUI/iOS. Its design part covers typography, motion, materials (Liquid Glass) and SF Symbols, but nothing for React Native or web. Its principles can be applied to our stack:

- **Typography:** one clear scale (Large Title 34 / Title 28 / 22 / 17 body / 15 / 13 / 11), semibold headers, tight letter-spacing on large text. The system font (SF on iPhone, Inter or Roboto on Android) with tabular numbers for money.
- **Spacing:** an 8-pt grid (4/8/12/16/20/24/32), 16–20 pt screen margins, 44 pt minimum touch targets, and grouped inset lists like iOS Settings.
- **Hierarchy and depth:** big titles that collapse on scroll, blurred translucent headers and tab bars, soft layered shadows, and 12–16 pt continuous-corner cards.
- **Motion:**
  - Spring animations (no linear tweens).
  - Shared-element push from list to detail.
  - Bottom sheets with detents instead of full-page forms.
  - Swipe actions on rows (call, WhatsApp, mark paid).
  - Context menus on long-press.
  - Numbers that count up on the dashboard.
- **Feedback:** light haptics on save, success and errors; skeleton shimmer instead of spinners; optimistic updates.
- **Colour:** mostly neutral with one accent (our amber); semantic colours only for status; real dark mode.
- **Web portal:** the same tokens, with sticky blurred headers, sheet-style modals, cmd-K search, and subtle page transitions.

In React Native this means: `react-native-reanimated` (already installed) plus `expo-blur`, `expo-haptics`, FlashList, `@gorhom/bottom-sheet`, and an `expo-image` cache. Each new native module needs a new APK.

## H. Suggested order (the next implementation flow)

1. **Phase 0 (fixes, about 1 day):** everything in section A, plus the server's JSON 404 and the logo URL.
2. **Phase 1 (foundation):**
   - The design system, using the Apple-style tokens and components: list rows, sheets, headers, skeletons, haptics.
   - FlashList with pagination, searchable pickers, and the query-key and invalidation fixes.
3. **Phase 2 (daily money work):**
   - Invoices and payments: status changes, PDF and share, send to customer, receipts.
   - Expense approvals and quotations (builder plus PDF).
4. **Phase 3 (site work):** the project detail with BOQ, DISCOM, DPR, photos and assets; tickets with assign and photos; offline queue.
5. **Phase 4 (customer app):** project tracker, receipts, PDFs, privacy, EMI, branding, deep links.
6. **Phase 5:**
   - Settings: recycle bin, privacy, 2FA, sessions, SolarOS billing, and support tickets.
   - Global search, announcements and legal acceptance.
7. **Phase 6 (Super Admin on the phone):** billing, support inbox, usage, and company renew/read-only.
