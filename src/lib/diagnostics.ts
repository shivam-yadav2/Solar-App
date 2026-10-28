import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_VERSION, getApiBase } from './appConfig';
import { getActiveTenantId } from './session';
import { store } from './storage';

const KEY = 'solaros:diagnostics:events';
const LIMIT = 30;

export interface ClientEvent {
  at: string;
  kind: 'api' | 'network' | 'timeout' | 'render' | 'sync';
  route?: string;
  method?: string;
  status?: number;
  message?: string;
}

const clean = (value?: string) => value
  ?.replace(/Bearer\s+[\w.-]+/gi, 'Bearer [redacted]')
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
  .replace(/\b\d{10,16}\b/g, '[number]')
  .slice(0, 240);

export async function getClientEvents(): Promise<ClientEvent[]> {
  try { return JSON.parse(await store.get(KEY) || '[]') as ClientEvent[]; } catch { return []; }
}

export async function recordClientEvent(event: Omit<ClientEvent, 'at'>): Promise<void> {
  try {
    const events = await getClientEvents();
    events.unshift({ ...event, route: clean(event.route), message: clean(event.message), at: new Date().toISOString() });
    await store.set(KEY, JSON.stringify(events.slice(0, LIMIT)));
  } catch { /* diagnostics must never interrupt the user workflow */ }
}

export async function clearClientEvents(): Promise<void> { await store.del(KEY); }

export async function buildSupportBundle(pendingSync: number): Promise<string> {
  const events = await getClientEvents();
  return JSON.stringify({
    product: 'SolarOS', version: APP_VERSION,
    build: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 'development',
    platform: Platform.OS,
    apiHost: (() => { try { return new URL(getApiBase()).host; } catch { return 'invalid'; } })(),
    tenantScope: getActiveTenantId() ? 'selected' : 'none', pendingSync,
    generatedAt: new Date().toISOString(), recentEvents: events,
  }, null, 2);
}
