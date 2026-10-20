// Copied from SAAS-Solar/src/lib/platformRoles.ts — keep in sync.
// Platform (SolarOS staff) roles. Every platform login is a SUPER_ADMIN user;
// this says how much of the platform each one may use. The server enforces
// it per request (platformRequestAllowed) and the sidebar uses the same table.

export type PlatformRole = 'owner' | 'admin' | 'support' | 'billing';

export const PLATFORM_ROLES: Record<PlatformRole, { label: string; description: string; tabs: string[] | '*' }> = {
  owner: {
    label: 'Owner',
    description: 'Everything, including the platform team, login policy and IP allow-list.',
    tabs: '*',
  },
  admin: {
    label: 'Admin',
    description: 'Everything except managing the platform team and platform security settings.',
    tabs: '*',
  },
  support: {
    label: 'Support',
    description: 'Answers support tickets. Can look at everything and open workspaces or customer portals, but only to view — no changes. No billing, API keys or message settings.',
    tabs: ['saas_support', 'saas_usage', 'saas_control', 'saas_demos', 'saas_enquiries', 'saas_users', 'saas_plans', 'saas_audit', 'saas_search', 'saas_health', 'saas_security'],
  },
  billing: {
    label: 'Billing',
    description: 'Only billing: invoices, payments, renewals, prices and coupons.',
    tabs: ['saas_billing', 'saas_control', 'saas_security'],
  },
};

export const PLATFORM_ROLE_KEYS = Object.keys(PLATFORM_ROLES) as PlatformRole[];

export const isPlatformRole = (value: unknown): value is PlatformRole => typeof value === 'string' && value in PLATFORM_ROLES;

export function platformTabAllowed(role: PlatformRole | undefined, tab: string): boolean {
  const tabs = PLATFORM_ROLES[role || 'owner'].tabs;
  return tabs === '*' || tabs.includes(tab);
}

const READS = ['GET', 'HEAD', 'OPTIONS'];

// Anyone signed in may do these: their own session, password, 2FA, notifications.
const SELF_SERVICE = [
  /^\/api\/auth\//,
  /^\/api\/me\//,
  /^\/api\/security\/me(\/|$)/,
  /^\/api\/notifications(\/|$)/,
  /^\/api\/activity\/track$/,
  /^\/api\/sessions\/[^/]+\/revoke$/,
];
// Owner-only areas.
const OWNER_ONLY = [/^\/api\/saas\/security\/(team|policy)(\/|$)/, /^\/api\/saas\/data\/backups(\/|$)/];
const SECRET_AREAS = [/^\/api\/saas\/communication(\/|$)/, /^\/api\/saas\/data\/(storage|import|retention)(\/|$)/, /^\/api\/saas\/health\/stderr/, /^\/api\/saas\/privacy-requests/, /^\/api\/saas\/tenants\/[^/]+\/export/, /^\/api\/saas\/billing(\/|$)/, /^\/api\/saas\/api-access(\/|$)/, /^\/api\/saas\/tenants\/[^/]+\/website-login$/, /^\/api\/saas\/mobile(\/|$)/];
const SUPPORT_WRITES = [/^\/api\/saas\/support\//, /^\/api\/support\/attachments$/, /^\/api\/saas\/tenants\/[^/]+\/impersonate$/, /^\/api\/saas\/users\/[^/]+\/view-as$/];
const BILLING_READS = [
  /^\/api\/saas\/tenants$/,
  /^\/api\/saas\/tenants\/[^/]+(\/(subscription|overview))?$/,
  /^\/api\/saas\/analytics$/,
  /^\/api\/saas\/billing(\/|$)/,
  /^\/api\/saas\/plans(\/|$)/,
  /^\/api\/plans(\/|$)/,
];
const BILLING_WRITES = [/^\/api\/saas\/billing(\/|$)/, /^\/api\/saas\/tenants\/[^/]+\/(pricing|coupon|renew|extend|due-date)$/];

/**
 * May a platform user with this role make this request? `path` is the full
 * URL path (e.g. /api/saas/tenants). Owner and Admin pass almost everything.
 */
export function platformRequestAllowed(role: PlatformRole, method: string, path: string): boolean {
  const m = method.toUpperCase();
  const hit = (list: RegExp[]) => list.some((re) => re.test(path));
  if (role === 'owner') return true;
  if (hit(SELF_SERVICE)) return true;
  if (hit(OWNER_ONLY)) return false;
  if (role === 'admin') return true;
  if (role === 'support') return READS.includes(m) ? !hit(SECRET_AREAS) : hit(SUPPORT_WRITES);
  // billing
  return READS.includes(m) ? hit(BILLING_READS) : hit(BILLING_WRITES);
}

/** Writes a view-only session (support inside a workspace, "view as customer") may still make. */
export const VIEW_ONLY_ALLOWED = [/^\/api\/auth\/logout$/, /^\/api\/activity\/track$/];
