import { APP_PLATFORM, APP_VERSION, getApiBase, markUpdateRequired } from './appConfig';
import { getPushToken } from './push';
import type {
  AuthSession,
  User,
  Tenant,
  Role,
  Permission,
  Plan,
  ActivityLog,
  Complaint,
  Customer,
  SolarProject,
  Payment,
  ProjectExpense,
  Invoice,
  WarrantyDocument,
  CompanySettings,
  ProjectDocument,
  Employee,
  PayrollRecord,
  SalaryAdvance,
  Lead,
  LeadFollowUp,
  Quotation,
  InventoryItem,
  InventoryStockMovement,
  ProjectBoqItem,
  EmployeeAttendance,
  DailyProgressReport,
  DiscomLiaisonStage,
  SaasSubscription,
  SaasSubscriptionInvoice,
  TenantUsageMeter,
} from '../types';
import {
  getToken,
  getActiveTenantId,
  setToken,
  setActiveTenantId,
  clearSession,
  emitAuthExpired,
} from './session';
import { invalidateFor } from './query';
import { noteResponse } from './serverState';
import { recordClientEvent } from './diagnostics';

/**
 * Unlike the web app (where the Express server serves the SPA and the API
 * from the same origin, so a relative '/api' works), a native app is always
 * cross-origin and needs an absolute URL. The address is built in (app.json
 * extra.apiBaseUrl) and can be moved from Super Admin → Mobile app — see
 * appConfig.ts.
 */

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NativeUploadFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAuthHeaders(includeJson = true): Record<string, string> {
  const token = getToken();
  const activeTenantId = getActiveTenantId();
  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'x-app-version': APP_VERSION,
    'x-app-platform': APP_PLATFORM,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeTenantId ? { 'x-tenant-id': activeTenantId } : {}),
  };
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    ...getAuthHeaders(),
    ...((options.headers as Record<string, string>) || {}),
    'x-client-request-id': `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    response = await fetch(`${getApiBase()}${url}`, { ...options, headers, signal: controller.signal });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    await recordClientEvent({ kind: timedOut ? 'timeout' : 'network', route: url, method });
    // Native fetch throws on unreachable host — surface something actionable
    // instead of a bare "Network request failed".
    throw new ApiError(
      timedOut ? 'The server took too long to respond. Check your connection and try again.' : 'SolarOS could not reach the server. Check your connection and try again.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    if (getToken()) {
      await clearSession();
      emitAuthExpired();
    }
  }

  const data = await response.json().catch(() => ({} as any));
  noteResponse(response.status, data);

  // This copy of the app is older than Super Admin's minimum version.
  if (response.status === 426) markUpdateRequired({ message: (data as any).error, updateUrl: (data as any).updateUrl });

  if (!response.ok) {
    await recordClientEvent({ kind: 'api', route: url, method, status: response.status, message: String((data as any).error || '').slice(0, 160) });
    throw new ApiError((data as any).error || `HTTP ${response.status}: Request failed`, response.status);
  }

  if ((options.method || 'GET').toUpperCase() !== 'GET') invalidateFor(url);

  return data as T;
}

/** Thin verbs over request() for the per-module API files in src/lib/apis/. */
export const http = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(url: string, body?: unknown) => request<T>(url, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }),
};

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== '' && v != null);
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
};

export const api = {
  // ---- Auth ----
  login: async (data: { emailOrUsername: string; password: string }) => {
    const res = await request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) await setToken(res.token);
    return res;
  },
  logout: async (): Promise<void> => {
    const token = getToken();
    if (!token) return;
    try {
      const pushToken = getPushToken();
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-app-version': APP_VERSION },
        body: JSON.stringify(pushToken ? { pushToken } : {}),
      });
    } catch {
      // Local session cleanup still proceeds when the server is unreachable.
    }
  },
  registerPushDevice: (token: string, info: { platform: string; appVersion: string; deviceName?: string }) =>
    request<{ registered: boolean }>('/me/push-devices', { method: 'POST', body: JSON.stringify({ token, ...info }) }),
  getMe: () => request<{ user: User; tenant?: Tenant; customer?: Customer; permissionKeys?: string[] }>('/auth/me'),
  changePassword: (newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // ---- Dashboard / analytics ----
  getDashboardKpis: () => request<{ kpis: any }>('/analytics/dashboard'),
  getCharts: () => request<{ monthlyData: any[]; capacityDistribution: any[]; statusDistribution: any[]; complaintDistribution: any[] }>('/analytics/charts'),
  getCustomerProfitability: () => request<{ customers: any[]; summary: any }>('/analytics/profitability/customers'),

  // ---- Customers ----
  getCustomers: (params: Record<string, string> = {}) =>
    request<{ customers: Customer[]; meta?: PageMeta }>(`/customers${qs(params)}`),
  getCustomer: (id: string) => request<any>(`/customers/${id}`),
  createCustomer: (data: Partial<Customer> & { createLogin?: boolean }) =>
    request<{ customer: Customer; tempPassword?: string; notified?: string[] }>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    request<{ customer: Customer }>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string, reason?: string) =>
    request<{ success: boolean; recycleBinId: string; message: string }>(`/customers/${id}/delete`, { method: 'POST', body: JSON.stringify({ reason }) }),
  archiveCustomer: (id: string) =>
    request<{ success: boolean }>(`/customers/${id}`, { method: 'DELETE' }),
  resetCustomerPassword: (customerId: string, tempPassword?: string) =>
    request<{ success: boolean; tempPassword: string; username: string; email?: string; notified?: string[] }>('/auth/reset-customer-password', {
      method: 'POST',
      body: JSON.stringify({ customerId, tempPassword }),
    }),

  // ---- Projects ----
  getProjects: (params: Record<string, string> = {}) =>
    request<{ projects: SolarProject[]; meta?: PageMeta }>(`/projects${qs(params)}`),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  getProjectEquipmentAssets: (id: string) => request<{ assets: import('../types').EquipmentAsset[] }>(`/projects/${id}/equipment-assets`),
  deleteProject: (id: string, reason?: string) =>
    request<{ success: boolean; recycleBinId?: string; message?: string }>(`/projects/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  createProject: (data: Partial<SolarProject>) =>
    request<{ project: SolarProject }>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<SolarProject>) =>
    request<{ project: SolarProject }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ---- Payments & expenses ----
  getPayments: (params: Record<string, string> = {}) =>
    request<{ payments: Payment[]; summary?: any; meta?: PageMeta }>(`/payments${qs(params)}`),
  createPayment: (data: Partial<Payment>) =>
    request<{ payment: Payment }>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: string, data: Partial<Payment>) =>
    request<{ payment: Payment }>(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getExpenses: (params: Record<string, string> = {}) =>
    request<{ expenses: ProjectExpense[]; summary?: any; meta?: PageMeta }>(`/expenses${qs(params)}`),
  createExpense: (data: Partial<ProjectExpense>) =>
    request<{ expense: ProjectExpense }>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request<{ success: boolean }>(`/expenses/${id}`, { method: 'DELETE' }),

  // ---- Invoices / warranties / tickets ----
  getInvoices: (params: Record<string, string> = {}) =>
    request<{ invoices: Invoice[]; summary?: any; meta?: PageMeta }>(`/invoices${qs(params)}`),
  createInvoice: (data: Partial<Invoice>) =>
    request<{ invoice: Invoice }>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  getWarranties: (params: Record<string, string> = {}) =>
    request<{ warranties: WarrantyDocument[]; summary?: any; meta?: PageMeta }>(`/warranties${qs(params)}`),
  createWarranty: (data: Partial<WarrantyDocument>) =>
    request<{ warranty: WarrantyDocument }>('/warranties', { method: 'POST', body: JSON.stringify(data) }),
  getComplaints: (params: Record<string, string> = {}) =>
    request<{ complaints: Complaint[]; summary?: any; meta?: PageMeta }>(`/complaints${qs(params)}`),
  getComplaint: (id: string) => request<any>(`/complaints/${id}`),
  createComplaint: (data: Partial<Complaint>) =>
    request<{ complaint: Complaint }>('/complaints', { method: 'POST', body: JSON.stringify(data) }),
  updateComplaintStatus: (id: string, data: Record<string, unknown>) =>
    request<{ complaint: Complaint }>(`/complaints/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  addComplaintComment: (id: string, data: string | Record<string, unknown>) =>
    request<{ comment: any }>(`/complaints/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(typeof data === 'string' ? { message: data } : data),
    }),
  submitFeedback: (data: { rating: number; comment?: string; projectId?: string }) =>
    request<{ success: boolean; message: string; googleReviewUrl?: string }>('/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getFeedbacks: () => request<{ feedbacks: any[] }>('/feedback'),

  // ---- Documents ----
  getDocuments: (params: Record<string, string> = {}) =>
    request<{ documents: ProjectDocument[]; meta?: PageMeta }>(`/documents${qs(params)}`),
  getFileUrl: async (fileId: string): Promise<string> => {
    const data = await request<{ url: string }>(`/files/${encodeURIComponent(fileId)}/url`);
    return data.url.startsWith('http') ? data.url : `${getApiBase().replace(/\/api\/?$/, '')}${data.url}`;
  },
  createDocument: (data: Partial<ProjectDocument>) =>
    request<{ document: ProjectDocument }>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  uploadFile: async (file: NativeUploadFile) => {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
    let response: Response;
    try {
      response = await fetch(`${getApiBase()}/files/upload`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formData,
      });
    } catch {
      throw new ApiError(`Cannot reach the server at ${getApiBase()}.`, 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError((data as any).error || 'Failed to upload file', response.status);
    invalidateFor('/documents');
    return data as { fileId: string; fileName: string; fileSize: number; mimeType: string };
  },

  // ---- Payroll & employees ----
  getEmployees: (params: Record<string, string> = {}) =>
    request<{ employees: Employee[]; summary?: any; meta?: PageMeta }>(`/payroll/employees${qs(params)}`),
  createEmployee: (data: Partial<Employee>) =>
    request<{ employee: Employee }>('/payroll/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    request<{ employee: Employee }>(`/payroll/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) => request<{ success: boolean }>(`/payroll/employees/${id}`, { method: 'DELETE' }),
  getPayrollRecords: (params: Record<string, string> = {}) =>
    request<{ records: PayrollRecord[]; summary: any; meta?: PageMeta }>(`/payroll/records${qs(params)}`),
  createPayrollRecord: (data: Partial<PayrollRecord>) =>
    request<{ record: PayrollRecord }>('/payroll/records', { method: 'POST', body: JSON.stringify(data) }),
  updatePayrollRecord: (id: string, data: Partial<PayrollRecord>) =>
    request<{ record: PayrollRecord }>(`/payroll/records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayrollRecord: (id: string) => request<{ success: boolean }>(`/payroll/records/${id}`, { method: 'DELETE' }),
  runBatchPayroll: (month: string) =>
    request<{ success: boolean; message: string; records: PayrollRecord[] }>('/payroll/run-batch', {
      method: 'POST', body: JSON.stringify({ month }),
    }),
  getSalaryAdvances: (params: Record<string, string> = {}) =>
    request<{ advances: SalaryAdvance[]; meta?: PageMeta }>(`/payroll/advances${qs(params)}`),
  createSalaryAdvance: (data: Partial<SalaryAdvance>) =>
    request<{ advance: SalaryAdvance }>('/payroll/advances', { method: 'POST', body: JSON.stringify(data) }),
  updateSalaryAdvance: (id: string, data: Partial<SalaryAdvance>) =>
    request<{ advance: SalaryAdvance }>(`/payroll/advances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ---- Settings / RBAC ----
  getSettings: () => request<{ settings: CompanySettings }>('/settings'),
  updateSettings: (data: Partial<CompanySettings>) =>
    request<{ settings: CompanySettings }>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getActivityLogs: (params: Record<string, string> = {}) =>
    request<{ logs: ActivityLog[]; total: number; page: number; totalPages: number }>(`/activity-logs${qs(params)}`),
  getActivityLogFacets: () => request<{ actions: string[]; users: { id: string; name: string }[]; categories: string[]; summary: Record<string, number> }>('/activity-logs/facets'),
  getNotifications: () => request<{ notifications: import('../types').Notification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<{ success: boolean }>('/notifications/read-all', { method: 'PUT' }),
  getRoles: () => request<{ roles: Role[] }>('/roles'),
  getPermissions: () => request<{ permissions: Permission[] }>('/permissions'),
  createRole: (data: { name: string; description?: string; permissionKeys: string[] }) =>
    request<{ role: Role }>('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: { name?: string; description?: string; permissionKeys?: string[] }) =>
    request<{ role: Role }>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => request<{ success: boolean }>(`/roles/${id}`, { method: 'DELETE' }),
  getStaffUsers: () => request<{ users: (User & { roleName?: string })[] }>('/users'),
  createStaffUser: (data: { username: string; email: string; roleId: string; password?: string }) =>
    request<{ user: User; tempPassword: string }>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffUser: (id: string, data: Partial<User> & { roleId?: string }) =>
    request<{ user: User }>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetStaffPassword: (id: string) =>
    request<{ success: boolean; tempPassword: string; username: string; email: string; notified?: unknown }>(`/users/${id}/reset-password`, { method: 'POST' }),
  signOutStaffEverywhere: (id: string) =>
    request<{ success: boolean; revoked: number }>(`/users/${id}/sign-out-everywhere`, { method: 'POST' }),
  resetStaffMfa: (id: string) => request<{ success: boolean }>(`/users/${id}/reset-mfa`, { method: 'POST' }),
  getCompanyProfile: () => request<{ name: string; branding: Tenant['branding']; businessProfile: Tenant['businessProfile']; canEdit: boolean }>('/settings/company-profile'),
  updateCompanyProfile: (data: { name?: string; branding?: Partial<Tenant['branding']>; businessProfile?: Partial<Tenant['businessProfile']> }) =>
    request<{ name: string; branding: Tenant['branding']; businessProfile: Tenant['businessProfile'] }>('/settings/company-profile', { method: 'PUT', body: JSON.stringify(data) }),

  // ---- SaaS control plane (SUPER_ADMIN) ----
  getSaaSTenants: (params: Record<string, string> = {}) =>
    request<{ tenants: Tenant[]; total: number }>(`/saas/tenants${qs(params)}`),
  getSaaSAnalytics: () => request<any>('/saas/analytics'),
  getSaaSTenant: (id: string) => request<{ tenant: Tenant }>(`/saas/tenants/${id}`),
  createSaaSTenant: (data: Partial<Tenant> & { adminEmail: string; adminPassword?: string; plan?: string }) =>
    request<any>('/saas/tenants', { method: 'POST', body: JSON.stringify(data) }),
  updateSaaSTenant: (id: string, data: Partial<Tenant>) =>
    request<{ tenant: Tenant }>(`/saas/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  impersonateSaaSTenant: async (id: string) => {
    const result = await request<{ token: string; user: User; tenant: Tenant; permissionKeys?: string[] }>(`/saas/tenants/${id}/impersonate`, { method: 'POST' });
    await Promise.all([setToken(result.token), setActiveTenantId(result.tenant.id)]);
    return result;
  },
  getPlans: () => request<{ plans: Plan[] }>('/plans'),
  createPlan: (data: Partial<Plan> & { key: string; name: string }) =>
    request<{ plan: Plan }>('/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Partial<Plan>) =>
    request<{ plan: Plan }>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id: string) => request<{ success: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
  getPlatformAuditLog: (limit = 100) => request<{ logs: ActivityLog[] }>(`/saas/audit-log?limit=${limit}`),
  searchPlatform: (q: string) => request<any>(`/saas/search${qs({ q })}`),
  getSystemHealth: () => request<any>('/saas/system-health'),

  // ---- Reports ----
  getReport: (type: string, params: Record<string, string> = {}) =>
    request<any>(`/reports/${encodeURIComponent(type)}${qs(params)}`),

  // ---- Global search ----
  globalSearch: (q: string) => request<any>(`/global-search${qs({ q })}`),

  // ---- Pre-sales CRM ----
  getLeads: (params: Record<string, string> = {}) => request<{ leads: Lead[]; total: number }>(`/leads${qs(params)}`),
  getLead: (id: string) => request<{ lead: Lead; followUps: LeadFollowUp[] }>(`/leads/${id}`),
  createLead: (data: Partial<Lead>) => request<{ lead: Lead }>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) => request<{ lead: Lead }>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) => request<{ success: boolean }>(`/leads/${id}`, { method: 'DELETE' }),
  createLeadFollowUp: (id: string, data: Partial<LeadFollowUp>) => request<{ followUp: LeadFollowUp }>(`/leads/${id}/follow-ups`, { method: 'POST', body: JSON.stringify(data) }),

  // ---- Quotations ----
  getQuotations: (params: Record<string, string> = {}) => request<{ quotations: Quotation[]; total: number; page?: number; totalPages?: number }>(`/quotations${qs(params)}`),
  createQuotation: (data: Partial<Quotation>) => request<{ quotation: Quotation }>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  updateQuotationStatus: (id: string, status: Quotation['status']) => request<{ quotation: Quotation }>(`/quotations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteQuotation: (id: string) => request<{ success: boolean }>(`/quotations/${id}`, { method: 'DELETE' }),

  // ---- Inventory / BoQ ----
  getInventory: () => request<{ items: InventoryItem[]; movements: InventoryStockMovement[]; lowStockCount: number }>('/inventory'),
  markEquipmentInstalled: (id: string) => request<{ asset: import('../types').EquipmentAsset }>(`/equipment-assets/${id}/install`, { method: 'POST' }),
  createInventoryItem: (data: Partial<InventoryItem>) => request<{ item: InventoryItem }>('/inventory/items', { method: 'POST', body: JSON.stringify(data) }),
  createStockMovement: (data: Partial<InventoryStockMovement>) => request<{ movement: InventoryStockMovement }>('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
  getProjectBoq: (projectId: string) => request<{ items: ProjectBoqItem[] }>(`/projects/${projectId}/boq`),
  createProjectBoqItem: (projectId: string, data: Partial<ProjectBoqItem>) => request<{ item: ProjectBoqItem }>(`/projects/${projectId}/boq`, { method: 'POST', body: JSON.stringify(data) }),
  updateProjectBoqItem: (id: string, data: Partial<ProjectBoqItem>) => request<{ success: boolean }>(`/boq/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ---- Field operations / DISCOM ----
  getAttendance: (month = '') => request<{ records: EmployeeAttendance[]; total: number }>(`/attendance${qs({ month })}`),
  punchIn: (data: Partial<EmployeeAttendance>) => request<{ record: EmployeeAttendance }>('/attendance/punch-in', { method: 'POST', body: JSON.stringify(data) }),
  punchOut: (id: string, data: { punchOutTime?: string; workingHours: number }) => request<{ success: boolean }>(`/attendance/${id}/punch-out`, { method: 'PATCH', body: JSON.stringify(data) }),
  getDpr: (projectId: string) => request<{ reports: DailyProgressReport[] }>(`/projects/${projectId}/dpr`),
  createDpr: (projectId: string, data: Partial<DailyProgressReport>) => request<{ report: DailyProgressReport }>(`/projects/${projectId}/dpr`, { method: 'POST', body: JSON.stringify(data) }),
  getDiscomStages: (projectId: string) => request<{ stages: DiscomLiaisonStage[] }>(`/projects/${projectId}/discom`),
  createDiscomStage: (projectId: string, data: Partial<DiscomLiaisonStage>) => request<{ stage: DiscomLiaisonStage }>(`/projects/${projectId}/discom`, { method: 'POST', body: JSON.stringify(data) }),
  updateDiscomStageStatus: (id: string, data: Partial<DiscomLiaisonStage>) => request<{ success: boolean }>(`/discom/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ---- Subscription billing ----
  getBilling: () => request<{ subscription: SaasSubscription | null; invoices: SaasSubscriptionInvoice[]; meters: TenantUsageMeter[] }>('/billing'),
  getTenantBilling: (tenantId: string) => request<{ subscription: SaasSubscription | null; invoices: SaasSubscriptionInvoice[]; meters: TenantUsageMeter[] }>(`/saas/billing/${tenantId}`),
};
