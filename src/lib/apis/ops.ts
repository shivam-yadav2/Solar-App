import { http, qs } from '../api';
import type { Complaint, Quotation, QuotationSettings, WarrantyDocument } from '../../types';

// Day-to-day company endpoints the first app version didn't have.

export const ops = {
  // money
  invoice: (id: string) => http.get<{ invoice: any }>(`/invoices/${id}`),
  nextInvoiceNumber: () => http.get<{ invoiceNumber: string; prefix: string }>('/invoices/next-number'),
  setInvoiceStatus: (id: string, status: 'Issued' | 'Paid' | 'Cancelled', reason?: string) => http.patch<{ invoice: any }>(`/invoices/${id}/status`, { status, reason }),
  payment: (id: string) => http.get<{ payment: any; customer: any; project: any; adjustments: any[] }>(`/payments/${id}`),
  refundPayment: (id: string, amount: number, reason?: string, paymentDate?: string) => http.post<{ payment: any }>(`/payments/${id}/refund`, { amount, reason, paymentDate }),
  reconcilePayment: (id: string, reconciliationStatus: 'Matched' | 'Exception', reconciliationNote?: string) => http.patch<{ payment: any }>(`/payments/${id}/reconciliation`, { reconciliationStatus, reconciliationNote }),
  approveExpense: (id: string, approvalStatus: 'Approved' | 'Rejected', approvalNote?: string) => http.patch<{ expense: any }>(`/expenses/${id}/approval`, { approvalStatus, approvalNote }),
  approvePending: (ids?: string[]) => http.post<{ approved: number; skipped: number; skippedIds: string[] }>('/expenses/approve-pending', { ids }),
  reverseExpense: (id: string, amount: number, reason?: string, date?: string) => http.post<{ expense: any }>(`/expenses/${id}/reversal`, { amount, reason, date }),

  // documents to customers
  sendPreview: (kind: string, id: string) => http.get<{ to: { name: string; email?: string; phone?: string }; channels: string[]; channelsSetUp: string[] }>(`/documents/send-preview${qs({ kind, id })}`),
  sendDocument: (data: { kind: string; id: string; channels: string[]; email?: string; phone?: string; pdfBase64?: string; fileName?: string }) =>
    http.post<{ sent: string[]; to: { email?: string; phone?: string }; failed: { channel: string; error: string }[] }>('/documents/send', data),

  // warranties, tickets, quotations
  warranty: (id: string) => http.get<{ warranty: WarrantyDocument & { customerName?: string; projectName?: string }; customer: any; project: any }>(`/warranties/${id}`),
  updateComplaint: (id: string, data: Partial<Complaint> & Record<string, unknown>) => http.put<{ complaint: Complaint }>(`/complaints/${id}/status`, data),
  quotation: (id: string) => http.get<{ quotation: Quotation }>(`/quotations/${id}`),
  updateQuotation: (id: string, data: Partial<Quotation>) => http.put<{ quotation: Quotation }>(`/quotations/${id}`, data),
  quotationSettings: () => http.get<{ settings: QuotationSettings }>('/quotation-settings'),
  saveQuotationSettings: (settings: QuotationSettings) => http.put<{ settings: QuotationSettings }>('/quotation-settings', settings),

  // leads
  convertLeadCustomer: (lead: { prospectName: string; phone: string; email?: string; address?: string; city?: string; state?: string; pincode?: string }) =>
    http.post<{ customer: any; tempPassword?: string }>('/customers', { name: lead.prospectName, mobile: lead.phone, email: lead.email, address: lead.address, city: lead.city, state: lead.state, pincode: lead.pincode }),

  track: (action: string, entity: string, entityId?: string, entityCustomId?: string) => http.post('/activity/track', { action, entity, entityId, entityCustomId }).catch(() => undefined),
};
