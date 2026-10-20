import type { TenantModules } from '../types';
import { useAuth } from '../context/AuthContext';

// Same rules as the web sidebar (SAAS-Solar/src/lib/access.ts TAB_RULES):
// the permission a page's API checks, and the plan module it belongs to.
interface PageRule { anyOf?: string[]; module?: keyof TenantModules; explicitModule?: boolean }

export const PAGE_RULES: Record<string, PageRule> = {
  leads: { anyOf: ['leads.view'], module: 'leadsCrm' },
  quotations: { anyOf: ['quotations.view'], module: 'quotations', explicitModule: true },
  customers: { anyOf: ['customers.view'], module: 'customerManagement' },
  projects: { anyOf: ['projects.view'], module: 'solarProjects' },
  inventory: { anyOf: ['inventory.view'], module: 'inventory' },
  complaints: { anyOf: ['complaints.view'], module: 'serviceTickets' },
  warranties: { anyOf: ['warranties.view'], module: 'warrantyCards' },
  documents: { anyOf: ['documents.view'], module: 'documentCenter' },
  payments: { anyOf: ['payments.view'], module: 'paymentsMilestones' },
  invoices: { anyOf: ['invoices.view'], module: 'invoices' },
  expenses: { anyOf: ['expenses.view'], module: 'expenseTracking' },
  payroll: { anyOf: ['payroll.view'], module: 'payroll' },
  profit: { anyOf: ['reports.view'], module: 'profitAndMargins' },
  reports: { anyOf: ['reports.view'], module: 'reportsExport' },
  activity: { anyOf: ['activity_logs.view'], module: 'activityLogs' },
  team: { anyOf: ['users.manage'] },
  roles: { anyOf: ['roles.manage'] },
  field: { anyOf: ['attendance.view', 'attendance.manage'], module: 'fieldOperations' },
  discom: { anyOf: ['discom.view'] },
  settings: {},
  support: {},
};

export function isModuleOn(modules: Partial<TenantModules> | undefined, rule: PageRule): boolean {
  if (!rule.module) return true;
  const value = modules?.[rule.module];
  return rule.explicitModule ? Boolean(value) : value !== false;
}

/** (page) => may this person open it (staff permissions + the company's plan modules). */
export function useCanOpen() {
  const { user, tenant, hasPermission } = useAuth();
  return (page: keyof typeof PAGE_RULES | string) => {
    const rule = PAGE_RULES[page];
    if (!rule) return false;
    if (user?.role === 'SUPER_ADMIN') return isModuleOn(tenant?.enabledModules, rule);
    if (user?.role !== 'ADMIN') return false;
    if (!isModuleOn(tenant?.enabledModules, rule)) return false;
    return !rule.anyOf || rule.anyOf.some(hasPermission);
  };
}
