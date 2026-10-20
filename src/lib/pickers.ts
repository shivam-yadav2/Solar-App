import { api } from './api';
import { formatINR } from './formatters';
import type { PickerOption } from '../ds';

// Server-searched options for the form pickers (30 at a time).

export const loadCustomers = async (q: string): Promise<PickerOption[]> => {
  const r = await api.getCustomers({ search: q, limit: '30' });
  return (r.customers as any[]).map((c) => ({ value: c.id, label: c.name, subtitle: [c.customId, c.mobile, c.city].filter(Boolean).join(' · ') }));
};

export const loadProjects = (customerId?: string) => async (q: string): Promise<PickerOption[]> => {
  const r = await api.getProjects({ search: q, limit: '30', ...(customerId ? { customerId } : {}) });
  return (r.projects as any[]).map((p) => ({ value: p.id, label: p.projectName, subtitle: [p.customId, `${p.capacityKw} kW`, p.customerName, Number(p.pendingBalance) > 0 ? `${formatINR(p.pendingBalance)} due` : null].filter(Boolean).join(' · ') }));
};

export const loadEmployees = async (q: string): Promise<PickerOption[]> => {
  const r = await api.getEmployees({ search: q, limit: '50' });
  return (r.employees as any[]).map((e) => ({ value: e.id, label: e.name || e.fullName, subtitle: [e.employeeCode || e.customId, e.designation || e.role].filter(Boolean).join(' · ') }));
};

export const toOptions = (values: readonly string[] | undefined, fallback: string[] = []): PickerOption[] => (values?.length ? values : fallback).map((v) => ({ value: v, label: v }));
