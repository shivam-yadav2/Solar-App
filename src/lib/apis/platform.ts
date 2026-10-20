import { http, qs } from '../api';
import type { BillingInvoice, BillingPayment, SupportMessage, SupportTicket, TenantSubscription } from '../../types';
import type { LifecycleInfo } from '../subscription';

// Super Admin endpoints used on the phone (types mirror SAAS-Solar/src/lib/api.ts).

export interface BillingOverview {
  mrr: number; arr: number; payingCompanies: number; collectedThisMonth: number; outstanding: number; overdueAmount: number;
  churnThisMonth: number; churnRate: number;
  months: { month: string; mrr: number; collected: number; churned: number }[];
  byPlan: { plan: string; companies: number; mrr: number; collected12m: number }[];
  overdue: { id: string; invoiceNumber: string; tenantId: string; tenantName?: string; dueDate: string; balance: number }[];
  lifecycleCounts: { grace: number; read_only: number; locked: number };
  renewalsNext30: { tenantId: string; name: string; dueAt: string; monthly: number; enforced: boolean }[];
}
export interface TenantUsageRow {
  tenantId: string; name: string; plan?: string; status: string; lifecycle: string; mrr: number; ageDays: number;
  users: { used: number; max: number | null; activeStaff30: number; customerLogins: number };
  projects: { used: number; max: number | null; new30: number };
  customers: { total: number; new30: number };
  logins: { staff7: number; staff30: number; customer30: number };
  activity: { last30: number; prev30: number; trendPct: number | null; lastAt?: string; lastStaffLoginAt?: string };
  modules: { used: { name: string; actions: number }[]; unusedPaid: string[] };
  storage: { usedBytes: number; limitBytes: number | null };
  signals: { kind: 'upsell' | 'churn'; text: string }[];
}
export interface TenantSubscriptionSummary {
  subscription: TenantSubscription; lifecycle: LifecycleInfo;
  limits: { users: { used: number; max: number | null }; projects: { used: number; max: number | null } };
  storage?: { usedBytes: number; limitBytes: number | null }; lifetimeRevenue: number; slug: string; status: string;
}
export interface SaasEnquiry {
  id: string; enquiryType: string; fullName: string; workEmail: string; phone: string; companyName: string;
  companySize?: string; interest?: string; message?: string; sourcePage: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed' | 'Spam'; createdAt: string;
}

export const platform = {
  billingOverview: () => http.get<BillingOverview>('/saas/billing/overview'),
  billingInvoices: (params: { tenantId?: string; status?: string } = {}) => http.get<{ invoices: BillingInvoice[] }>(`/saas/billing/invoices${qs(params)}`),
  billingInvoice: (id: string) => http.get<{ invoice: BillingInvoice; payments: BillingPayment[]; razorpayReady: boolean }>(`/saas/billing/invoices/${id}`),
  recordBillingPayment: (id: string, data: { amount: number; method: string; reference?: string; paidAt?: string; note?: string }) =>
    http.post<{ invoice: BillingInvoice; payments: BillingPayment[] }>(`/saas/billing/invoices/${id}/payments`, data),
  sendBillingInvoice: (id: string, kind: 'invoice' | 'reminder') => http.post<{ sent: string[] }>(`/saas/billing/invoices/${id}/send`, { kind }),
  billingPaymentLink: (id: string) => http.post<{ invoice: BillingInvoice }>(`/saas/billing/invoices/${id}/payment-link`),
  voidBillingInvoice: (id: string) => http.post<{ invoice: BillingInvoice }>(`/saas/billing/invoices/${id}/void`),

  supportTickets: (params: { status?: string; q?: string } = {}) =>
    http.get<{ tickets: SupportTicket[]; counts: { open: number; waiting: number; urgent: number; unassigned: number }; team: { id: string; username: string }[] }>(`/saas/support/tickets${qs(params)}`),
  supportTicket: (id: string) => http.get<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/saas/support/tickets/${id}`),
  replySupport: (id: string, data: { body: string; internal?: boolean; status?: string; attachmentIds?: string[] }) =>
    http.post<{ ticket: SupportTicket; messages: SupportMessage[]; notified: string[] }>(`/saas/support/tickets/${id}/messages`, data),
  updateSupport: (id: string, data: { status?: string; priority?: string; assignedToId?: string | null }) => http.put<{ ticket: SupportTicket }>(`/saas/support/tickets/${id}`, data),

  usage: () => http.get<{ tenants: TenantUsageRow[] }>('/saas/usage'),

  subscription: (id: string) => http.get<TenantSubscriptionSummary>(`/saas/tenants/${id}/subscription`),
  renew: (id: string, data: { months?: number; amount?: number; method?: string; note?: string }) => http.post<TenantSubscriptionSummary>(`/saas/tenants/${id}/subscription/renew`, data),
  extend: (id: string, days: number, note?: string) => http.post<TenantSubscriptionSummary>(`/saas/tenants/${id}/subscription/extend`, { days, note }),
  setDueDate: (id: string, date: string, note?: string) => http.post<TenantSubscriptionSummary>(`/saas/tenants/${id}/subscription/due-date`, { date, note }),
  setReadOnly: (id: string, on: boolean, reason?: string) => http.post<TenantSubscriptionSummary>(`/saas/tenants/${id}/read-only`, { on, reason }),
  addCrmNote: (id: string, text: string) => http.post<{ crm: any }>(`/saas/tenants/${id}/crm/notes`, { text }),

  enquiries: () => http.get<{ enquiries: SaasEnquiry[] }>('/saas/enquiries?limit=250'),
  setEnquiryStatus: (id: string, status: SaasEnquiry['status']) => http.patch<{ enquiry: SaasEnquiry }>(`/saas/enquiries/${id}/status`, { status }),

  users: (params: { search?: string; role?: string } = {}) => http.get<{ users: any[]; summary: { total: number; active: number; customers: number; activeLast7d: number } }>(`/saas/users${qs(params)}`),
  setUserActive: (id: string, isActive: boolean) => http.patch<{ user: any }>(`/saas/users/${id}`, { isActive }),
};
