import { http } from '../api';
import { getApiBase } from '../appConfig';
import { getToken } from '../session';
import type { Announcement, AuthSession, BillingInvoice, SupportMessage, SupportTicket, UserSession } from '../../types';
import type { PlatformRole } from '../platformRoles';

// Sign-in steps, password, two-factor, sessions, legal, announcements,
// SolarOS billing, recycle bin, privacy requests and SolarOS support.

export type LoginResult =
  | (AuthSession & { mfaRequired?: false; forcePasswordChange?: boolean; passwordExpired?: boolean; backupCodes?: string[] })
  | { mfaRequired: true; mfaSetup: boolean; mfaToken: string; email: string };

export interface MySecurity {
  mfaEnabled: boolean; mfaEnabledAt?: string; backupCodesLeft: number; mfaRequired: boolean; mfaAvailable: boolean;
  platformRole?: PlatformRole; currentIp?: string; passwordChangedAt?: string;
  passwordRules: { minLength: number; requireNumber: boolean; requireSymbol: boolean; requireMixedCase: boolean; history: number; expiryDays: number };
}
export type MySession = UserSession & { device: string; isCurrent: boolean };
export interface DataRequestView {
  id: string; tenantId: string; customerId: string; customerName: string; customerCode?: string; type: 'delete' | 'copy';
  status: 'pending' | 'completed' | 'rejected'; requestedBy: 'customer' | 'staff'; note?: string; outcome?: string; createdAt: string; completedAt?: string;
}
export interface RecycleBinItem { id: string; type: 'customer' | 'project' | 'lead' | 'quotation' | 'expense'; entityId: string; label: string; rowCount: number; deletedBy?: string; reason?: string; deletedAt: string; purgeAfter: string }
export type MyBillingInvoice = Pick<BillingInvoice, 'id' | 'invoiceNumber' | 'status' | 'issueDate' | 'dueDate' | 'total' | 'amountPaid' | 'publicToken' | 'periodEnd'>;
export type ActiveAnnouncement = Pick<Announcement, 'id' | 'title' | 'message' | 'tone' | 'linkUrl' | 'linkLabel' | 'startsAt'>;

/** Absolute URL for a path the server returns ("/api/public/logos/…", "/i/<token>"). */
export const absoluteUrl = (path?: string) => {
  if (!path) return '';
  if (/^(https?:|data:|file:)/.test(path)) return path;
  const origin = getApiBase().replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const account = {
  login: (emailOrUsername: string, password: string) => http.post<LoginResult>('/auth/login', { emailOrUsername, password }),
  loginMfa: (mfaToken: string, code: string) => http.post<LoginResult>('/auth/login/mfa', { mfaToken, code }),
  loginMfaSetup: (mfaToken: string) => http.post<{ secret: string; otpauthUrl: string }>('/auth/login/mfa/setup', { mfaToken }),
  loginMfaEnable: (mfaToken: string, code: string) => http.post<LoginResult>('/auth/login/mfa/enable', { mfaToken, code }),
  forgotPassword: (identifier: string, company?: string) => http.post<{ success: boolean; message: string }>('/auth/forgot-password', { identifier, company }),
  changePassword: (newPassword: string, currentPassword?: string) => http.post<{ success: boolean; message: string; token?: string }>('/auth/change-password', { newPassword, currentPassword }),

  security: () => http.get<MySecurity>('/security/me'),
  startMfa: () => http.post<{ secret: string; otpauthUrl: string }>('/security/me/mfa/setup'),
  enableMfa: (code: string) => http.post<{ backupCodes: string[] }>('/security/me/mfa/enable', { code }),
  disableMfa: (password: string, code: string) => http.post<{ success: boolean }>('/security/me/mfa/disable', { password, code }),
  renewBackupCodes: (code: string) => http.post<{ backupCodes: string[] }>('/security/me/mfa/backup-codes', { code }),
  sessions: () => http.get<{ sessions: MySession[] }>('/me/sessions'),
  revokeSession: (id: string) => http.post<{ success: boolean }>(`/sessions/${id}/revoke`),

  announcements: () => http.get<{ announcements: ActiveAnnouncement[] }>('/announcements/active'),
  platformMe: () => http.get<{ features: string[]; legalPending: { key: string; title: string; version: number }[] }>('/platform/me'),
  legalPage: (key: string) => http.get<{ document: { key: string; title: string; content: string; version: number; updatedAt?: string } }>(`/platform/legal/${key}`),
  acceptLegal: () => http.post<{ accepted: string[] }>('/platform/legal/accept'),

  billingInvoices: () => http.get<{ invoices: MyBillingInvoice[] }>('/billing/invoices'),
  storageUsage: () => http.get<{ usedBytes: number; files: number; limitBytes: number | null }>('/settings/storage-usage'),
  /** Public invoice page (opens in the browser). */
  invoicePageUrl: (token: string) => absoluteUrl(`/i/${token}`),

  recycleBin: () => http.get<{ items: RecycleBinItem[]; types: string[]; retentionDays: number }>('/recycle-bin'),
  restoreFromBin: (id: string) => http.post<{ success: boolean }>(`/recycle-bin/${id}/restore`),
  purgeFromBin: (id: string) => http.del<{ success: boolean }>(`/recycle-bin/${id}`),

  privacyRequests: () => http.get<{ requests: DataRequestView[] }>('/privacy-requests'),
  createPrivacyRequest: (customerId: string, type: 'copy' | 'delete', note?: string) => http.post<{ request: DataRequestView }>('/privacy-requests', { customerId, type, note }),
  completePrivacyRequest: (id: string, action: 'erase' | 'done' | 'reject', note?: string, deleteDocuments?: boolean) => http.post<{ request: DataRequestView }>(`/privacy-requests/${id}/complete`, { action, note, deleteDocuments }),
  privacyExportUrl: (id: string) => `${getApiBase()}/privacy-requests/${id}/export`,
  myDataRequests: () => http.get<{ requests: DataRequestView[] }>('/me/data-requests'),
  createMyDataRequest: (type: 'copy' | 'delete', note?: string) => http.post<{ request: DataRequestView }>('/me/data-requests', { type, note }),

  supportTickets: () => http.get<{ tickets: SupportTicket[]; categories: string[] }>('/support/tickets'),
  supportTicket: (id: string) => http.get<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/support/tickets/${id}`),
  createSupportTicket: (data: { subject: string; message: string; category?: string; priority?: string; attachmentIds?: string[] }) => http.post<{ ticket: SupportTicket }>('/support/tickets', data),
  replySupportTicket: (id: string, body: string, attachmentIds?: string[]) => http.post<{ success: boolean }>(`/support/tickets/${id}/messages`, { body, attachmentIds }),
  setSupportTicketStatus: (id: string, status: 'open' | 'resolved') => http.post<{ success: boolean }>(`/support/tickets/${id}/status`, { status }),
};

/** Headers for raw downloads (fetch → file) outside request(). */
export const authHeaders = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};
