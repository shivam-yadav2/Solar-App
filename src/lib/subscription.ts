// Copied from SAAS-Solar/src/lib/subscription.ts — keep in sync.
// Subscription lifecycle, shared by the server (enforcement) and the web app
// (banners, Super Admin). Only applies when the platform admin switched
// "enforce expiry" on for the company; otherwise the due date is informational.
//
//   due date ──grace (default 7 d)──► read-only (default 15 d) ──► locked
import type { TenantSubscription, TenantStatus } from '../types';

export type LifecycleState = 'active' | 'grace' | 'read_only' | 'locked' | 'archived';

export const DEFAULT_GRACE_DAYS = 7;
export const DEFAULT_READ_ONLY_DAYS = 15;
const DAY = 86_400_000;

export interface LifecycleInfo {
  state: LifecycleState;
  /** Read-only because the platform admin switched it on (not because of the due date). */
  manualReadOnly: boolean;
  enforced: boolean;
  dueAt?: string;
  graceEndsAt?: string;
  lockAt?: string;
  /** Days until the next step (due date, read-only or lock); negative = overdue by that many days. */
  daysToNextStep: number;
  overdueDays: number;
}

export function subscriptionLifecycle(sub: Partial<TenantSubscription> | undefined, status?: TenantStatus | string, now = Date.now()): LifecycleInfo {
  const due = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() : NaN;
  const grace = Math.max(0, sub?.graceDays ?? DEFAULT_GRACE_DAYS);
  const readOnlyDays = Math.max(0, sub?.readOnlyDays ?? DEFAULT_READ_ONLY_DAYS);
  const enforced = Boolean(sub?.enforceExpiry) && Number.isFinite(due) && !sub?.demo;
  const graceEnds = due + grace * DAY;
  const lockAt = graceEnds + readOnlyDays * DAY;
  const base = {
    enforced,
    dueAt: Number.isFinite(due) ? new Date(due).toISOString() : undefined,
    graceEndsAt: Number.isFinite(due) ? new Date(graceEnds).toISOString() : undefined,
    lockAt: Number.isFinite(due) ? new Date(lockAt).toISOString() : undefined,
    overdueDays: Number.isFinite(due) && now > due ? Math.floor((now - due) / DAY) : 0,
  };
  const days = (t: number) => Math.ceil((t - now) / DAY);

  if (sub?.archivedAt) return { ...base, state: 'archived', manualReadOnly: false, daysToNextStep: 0 };
  if (!enforced) {
    return { ...base, state: sub?.readOnly ? 'read_only' : 'active', manualReadOnly: Boolean(sub?.readOnly), daysToNextStep: Number.isFinite(due) ? days(due) : 0 };
  }
  let state: LifecycleState = now <= due ? 'active' : now <= graceEnds ? 'grace' : now <= lockAt ? 'read_only' : 'locked';
  const manualReadOnly = Boolean(sub?.readOnly) && (state === 'active' || state === 'grace');
  if (manualReadOnly) state = 'read_only';
  const next = state === 'active' ? due : state === 'grace' ? graceEnds : state === 'read_only' ? lockAt : now;
  return { ...base, state, manualReadOnly, daysToNextStep: days(next) };
}

/** Effective limit (plan + extras); null = unlimited (plan limit 0 or not set). */
export function effectiveLimit(base: number | undefined, extra: number | undefined): number | null {
  if (!base || base <= 0) return null;
  return base + Math.max(0, extra || 0);
}
