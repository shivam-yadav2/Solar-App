# Phase 3–4 implementation report

Date: 28 October 2026

## Phase 3 — Delivery and field operations

- Inventory supports stock, low-stock and movement views; purchase, project dispatch, return and write-off; vendor/challan data; serialized panel/inverter dispatch; BoQ and installed-asset linkage.
- DISCOM supports portfolio overview, project timelines, milestone creation and status updates.
- Field work supports GPS attendance, project assignment, DPR creation/detail, progress, photos, private on-device drafts and an observable oldest-first offline send queue.
- Tickets support create/detail, priority/category, assignment, status, resolution, comments, internal notes, attachments and timeline.
- Warranties support equipment-asset linkage, serial/model autofill, expiry state, certificate PDF, share and send.
- Documents now use the native HIG list/form system with server paging, search, category filtering, camera/file upload, customer/project context, open and secure-link sharing.

Backend contract limits retained honestly:

- The web backend has no document delete endpoint, so mobile does not show a non-functional Delete action.
- The backend has no DPR update endpoint, so submitted reports are read-only; drafts remain editable until successfully sent.

## Phase 4 — Finance, GST and payroll

- Payments retain create/edit, contextual balances, receipt attachment, reconciliation, refund history, PDF/share/send and targeted cache refresh.
- Invoices now support automatic/custom numbering, itemized goods/services, quantity, HSN/SAC, taxable rate, configured GST, intra-state CGST/SGST, interstate IGST, immutable GST snapshots and equipment serials in generated PDFs.
- Invoice list/detail supports server paging/filtering, status transitions, record-payment handoff, customer access, PDF/share/send and export.
- Expenses retain receipt capture, create/delete, approval/reject, bulk approval, reversal, filters and project-cost refresh.
- Payroll was migrated to the shared native design system with paged server search/filter, employees, advances, batch payroll, edit/delete, payment settlement, recovery, CSV export and confidential payslip PDFs.
- Employee forms now include bank, UPI, PAN and Aadhaar fields. Payroll records expose full earnings/deductions, linked incentive project, live net salary and settlement references.
- Profitability now provides customer-wise sorting and totals, project contribution drill-down and CSV export.
- `/emi` now matches the web reducing-balance formula and PM Surya Ghar subsidy rules and can share a customer estimate.
- Golden checks cover approved EMI, subsidy, GST, payroll and margin examples.

## Verification state

- `npm run check` must pass: TypeScript, route manifest and finance golden calculations.
- Android production export is rerun after implementation.
- Signed Android/iOS device, permission-variant and full RBAC acceptance remain Phase 10 release-certification work. Therefore ledger rows are **Present**, not falsely marked **Verified**.
