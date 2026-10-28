import { http, qs } from '../api';
import type {
  Announcement, BillingInvoice, BillingPayment, FeatureFlag, LegalDocument, MessageLogEntry,
  PlatformBranding, PlatformConfig, SecurityPolicy, SupportMessage, SupportTicket, Tenant,
  TenantDefaults, TenantSecurity, TenantSubscription,
} from '../../types';
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
export interface PlatformUser {
  id: string; tenantId?: string; tenantName?: string; username: string; email: string; role: string; roleName?: string;
  customerId?: string; isActive: boolean; lastLoginAt?: string; createdAt?: string; lastSeenAt?: string; activeSessions: number;
  mfaEnabled?: boolean; platformRole?: 'owner' | 'admin' | 'support' | 'billing';
}
export interface PlatformTeamMember extends PlatformUser { platformRole: 'owner' | 'admin' | 'support' | 'billing'; createdAt: string }
export interface DemoAccount {
  id: string; name: string; slug: string; status: string; planName: string; planId?: string; state: 'active' | 'expired' | 'converted' | 'none'; daysLeft: number;
  demo: any; login: { email: string; username?: string; lastLoginAt?: string }; engagement: { logins: number; actions: number; lastActiveAt?: string };
}
export interface ApiCredential { id: string; label: string; contactEmail?: string; publishableKey: string; secretKeyHint: string; allowedOrigins: string[]; createdAt: string; createdBy: string; revokedAt?: string; usage: { signIns: number; lastUsedAt?: string } }
export interface ApiAccessCompany { tenantId: string; name: string; slug: string; status: string; enabled: boolean; customers: { total: number; withLogin: number }; hostedUsage: { signIns: number; lastUsedAt?: string }; credentials: ApiCredential[] }
export interface BackupRecord { id: string; fileName: string; location: 'local' | 's3'; sizeBytes: number; tables: number; rows: number; status: 'running' | 'ok' | 'failed'; error?: string; trigger: 'auto' | 'manual'; startedAt: string; finishedAt?: string }
export interface MobileSettings { minVersion: string; latestVersion: string; updateUrl: string; updateMessage: string; apiBaseUrl: string; blockUnversioned: boolean; push: { projectId: string; clientEmail: string; hasKey: boolean; forwardNotifications: boolean } }
export interface ServerError { id: string; source: string; message: string; method?: string; path?: string; statusCode?: number; count: number; firstSeen: string; lastSeen: string; resolvedAt?: string }

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
  viewAsCustomer: (id: string) => http.post<any>(`/saas/users/${id}/view-as`),

  tenantOverview: (id: string) => http.get<{ tenant: Tenant; users: PlatformUser[]; activeSessions: any[]; recentActivity: any[]; activitySummary: { last24h: number; last7d: number; securityEvents7d: number; activeUsers7d: number } }>(`/saas/tenants/${id}/overview`),
  archiveTenant: (id: string, restore = false) => http.post<TenantSubscriptionSummary>(`/saas/tenants/${id}/archive`, { restore }),
  changeTenantSlug: (id: string, slug: string) => http.put<TenantSubscriptionSummary>(`/saas/tenants/${id}/slug`, { slug }),
  deleteTenant: (id: string, confirm: string) => http.del<{ success: boolean }>(`/saas/tenants/${id}`, { confirm }),

  communication: () => http.get<any>('/saas/communication'),
  saveCommunication: (data: Record<string, unknown>) => http.put<any>('/saas/communication', data),
  testCommunication: (channel: string, to: string) => http.post<{ success: boolean; to: string }>('/saas/communication/test', { channel, to }),
  messageLog: () => http.get<{ messages: MessageLogEntry[] }>('/saas/communication/log'),
  announcements: () => http.get<{ announcements: Announcement[] }>('/saas/announcements'),
  createAnnouncement: (data: Partial<Announcement> & { email?: boolean }) => http.post<{ announcement: Announcement; emailed: number }>('/saas/announcements', data),
  deleteAnnouncement: (id: string) => http.del<{ success: boolean }>(`/saas/announcements/${id}`),

  demos: () => http.get<{ demos: DemoAccount[]; summary: { active: number; expiringSoon: number; engaged: number; expired: number; converted: number } }>('/saas/demos'),
  createDemo: (data: Record<string, unknown>) => http.post<{ demo: DemoAccount; credentials: { email: string; password: string } }>('/saas/demos', data),
  extendDemo: (id: string, days: number) => http.post<{ demo: DemoAccount }>(`/saas/demos/${id}/extend`, { days }),
  demoCredentials: (id: string) => http.post<{ credentials: { email: string; username?: string; password: string } }>(`/saas/demos/${id}/credentials`),
  resetDemo: (id: string) => http.post<{ demo: DemoAccount }>(`/saas/demos/${id}/reset-data`, { sampleData: true }),
  expireDemo: (id: string) => http.post<{ demo: DemoAccount }>(`/saas/demos/${id}/expire`),
  convertDemo: (id: string, planId: string) => http.post<{ demo: DemoAccount }>(`/saas/demos/${id}/convert`, { planId, clearSampleData: false }),
  deleteDemo: (id: string) => http.del<{ success: boolean }>(`/saas/demos/${id}`),

  apiAccess: () => http.get<{ companies: ApiAccessCompany[]; summary: { companiesOn: number; activeCredentials: number; signIns30d: number } }>('/saas/api-access'),
  setWebsiteLogin: (tenantId: string, enabled: boolean) => http.put<{ enabled: boolean }>(`/saas/api-access/companies/${tenantId}`, { enabled }),
  issueCredential: (data: { tenantId: string; label: string; contactEmail?: string; allowedOrigins: string[] }) => http.post<any>('/saas/api-access/credentials', data),
  revokeCredential: (tenantId: string, id: string) => http.post<any>(`/saas/api-access/credentials/${tenantId}/${id}/revoke`),
  reissueCredential: (tenantId: string, id: string) => http.post<any>(`/saas/api-access/credentials/${tenantId}/${id}/reissue`),
  deleteCredential: (tenantId: string, id: string) => http.del<{ success: boolean }>(`/saas/api-access/credentials/${tenantId}/${id}`),

  securityTeam: () => http.get<{ team: PlatformTeamMember[]; roles: Record<string, any> }>('/saas/security/team'),
  addPlatformAdmin: (data: { email: string; username?: string; platformRole: string }) => http.post<any>('/saas/security/team', data),
  updatePlatformAdmin: (id: string, platformRole: string) => http.put<any>(`/saas/security/team/${id}`, { platformRole }),
  securityPolicy: () => http.get<{ policy: SecurityPolicy; currentIp?: string; youHaveMfa: boolean }>('/saas/security/policy'),
  saveSecurityPolicy: (data: Partial<SecurityPolicy>) => http.put<{ policy: SecurityPolicy }>('/saas/security/policy', data),
  tenantSecurity: (id: string) => http.get<{ security: TenantSecurity; staffWithMfa: number; staffTotal: number }>(`/saas/security/tenants/${id}`),
  saveTenantSecurity: (id: string, data: Partial<TenantSecurity>) => http.put<{ security: TenantSecurity }>(`/saas/security/tenants/${id}`, data),

  dataStatus: () => http.get<{ lastBackup: BackupRecord | null; running: boolean; backupsEnabled: boolean; storageDriver: string; disk: { freeBytes: number; totalBytes: number } | null }>('/saas/data/status'),
  backups: () => http.get<{ backups: BackupRecord[]; settings: any; running: boolean; disk: { freeBytes: number; totalBytes: number } | null }>('/saas/data/backups'),
  runBackup: () => http.post<{ backup: BackupRecord }>('/saas/data/backups/run'),
  deleteBackup: (id: string) => http.del<{ success: boolean }>(`/saas/data/backups/${id}`),
  storage: () => http.get<any>('/saas/data/storage'),
  recalculateStorage: () => http.post<{ added: number; skipped: number }>('/saas/data/storage/recalculate'),
  importBatches: () => http.get<{ batches: any[] }>('/saas/data/import/batches'),
  undoImport: (id: string) => http.post<{ removed: number; kept: string[] }>(`/saas/data/import/batches/${id}/undo`),
  retention: () => http.get<{ settings: any; preview: { key: string; label: string; days: number; due: number }[] }>('/saas/data/retention'),
  runRetention: () => http.post<{ removed: Record<string, number> }>('/saas/data/retention/run'),
  privacyRequests: () => http.get<{ requests: any[] }>('/saas/privacy-requests'),

  mobile: () => http.get<{ settings: MobileSettings; pushReady: boolean; stats: any; history: any[] }>('/saas/mobile'),
  saveMobile: (data: Record<string, unknown>) => http.put<any>('/saas/mobile', data),
  mobileDevices: () => http.get<{ devices: any[] }>('/saas/mobile/devices'),
  sendPush: (data: { title: string; body: string; who: string; tenantIds?: string[]; emails?: string }) => http.post<any>('/saas/mobile/push', data),

  healthExtras: () => http.get<any>('/saas/health/extras'),
  serverErrors: () => http.get<{ errors: ServerError[]; counts: { open: number; last24h: number } }>('/saas/health/errors'),
  resolveErrors: (ids: string[] | 'all') => http.post<any>('/saas/health/errors/resolve', ids === 'all' ? { all: true } : { ids }),
  clearCache: () => http.post<{ success: boolean }>('/saas/health/cache/clear'),

  platformConfig: () => http.get<{ config: PlatformConfig; effectiveAppUrl: string }>('/saas/platform/config'),
  savePlatformConfig: (data: Partial<PlatformConfig>) => http.put<any>('/saas/platform/config', data),
  branding: () => http.get<{ branding: PlatformBranding; defaults: PlatformBranding }>('/saas/platform/branding'),
  saveBranding: (data: PlatformBranding) => http.put<any>('/saas/platform/branding', data),
  tenantDefaults: () => http.get<{ defaults: TenantDefaults; builtIn: TenantDefaults }>('/saas/platform/tenant-defaults'),
  saveTenantDefaults: (data: TenantDefaults) => http.put<any>('/saas/platform/tenant-defaults', data),
  legal: () => http.get<{ documents: Record<string, LegalDocument> }>('/saas/platform/legal'),
  saveLegal: (key: string, data: Partial<LegalDocument>) => http.put<any>(`/saas/platform/legal/${key}`, data),
  features: () => http.get<{ flags: FeatureFlag[] }>('/saas/platform/features'),
  saveFeatures: (flags: FeatureFlag[]) => http.put<{ flags: FeatureFlag[] }>('/saas/platform/features', { flags }),
};
