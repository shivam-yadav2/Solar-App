import Constants from 'expo-constants';
import { store } from './storage';
import { Platform } from 'react-native';

/**
 * App version + server address, both controlled from Super Admin → Mobile app.
 *
 * - Every request carries x-app-version; when this copy is older than the
 *   minimum the server answers 426 and the app shows the full-screen
 *   "update the app" page (UpdateGate).
 * - The server can hand out a new API address (after moving hosts). The app
 *   only switches after the new address answers, and falls back to the
 *   built-in one if a saved address stops answering.
 */

export const APP_VERSION: string = Constants.expoConfig?.version ?? '0';
export const APP_PLATFORM: string = Platform.OS;

/**
 * Built-in server. Override per-environment via app.json -> expo.extra.apiBaseUrl
 * or EXPO_PUBLIC_API_URL. 10.0.2.2 is the Android emulator's alias for the
 * host machine's localhost.
 */
export const DEFAULT_API_BASE: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  'http://10.0.2.2:3000/api';

const API_BASE_KEY = 'solaros_api_base';
let apiBase = DEFAULT_API_BASE;

export const getApiBase = () => apiBase;

/** Use the address saved from an earlier check (call once at boot, before any request). */
export async function loadSavedApiBase(): Promise<void> {
  try {
    const saved = await store.get(API_BASE_KEY);
    if (saved && /^https:\/\//.test(saved)) apiBase = saved;
  } catch {
    // keep the built-in address
  }
}

async function switchApiBase(url: string): Promise<void> {
  apiBase = url;
  try {
    if (url === DEFAULT_API_BASE) await store.del(API_BASE_KEY);
    else await store.set(API_BASE_KEY, url);
  } catch {
    // in-memory switch still applies for this run
  }
}

export interface UpdateState {
  required: boolean;
  available: boolean;
  url?: string;
  message?: string;
  latestVersion?: string;
}

let updateState: UpdateState = { required: false, available: false };
const listeners = new Set<(s: UpdateState) => void>();

export const getUpdateState = () => updateState;
export function onUpdateState(fn: (s: UpdateState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setUpdateState(next: UpdateState) {
  updateState = next;
  listeners.forEach((l) => l(next));
}

/** The server said 426: this copy is too old. */
export function markUpdateRequired(info: { message?: string; updateUrl?: string }) {
  setUpdateState({ ...updateState, required: true, available: true, message: info.message || updateState.message, url: info.updateUrl || updateState.url });
}

interface RemoteConfig {
  updateRequired: boolean;
  updateAvailable: boolean;
  updateUrl: string | null;
  message: string;
  latestVersion: string | null;
  apiBaseUrl: string | null;
}

async function fetchConfig(base: string): Promise<RemoteConfig | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${base}/public/app-config?version=${encodeURIComponent(APP_VERSION)}&platform=${APP_PLATFORM}`, {
      headers: { 'x-app-version': APP_VERSION, 'x-app-platform': APP_PLATFORM },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return (await r.json()) as RemoteConfig;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Run at start-up and when the app comes back to the foreground. Never throws. */
export async function checkAppConfig(): Promise<void> {
  let cfg = await fetchConfig(apiBase);
  // A saved address that stopped answering: go back to the built-in one.
  if (!cfg && apiBase !== DEFAULT_API_BASE) {
    const fallback = await fetchConfig(DEFAULT_API_BASE);
    if (fallback) {
      await switchApiBase(DEFAULT_API_BASE);
      cfg = fallback;
    }
  }
  if (!cfg) return;
  const next = cfg.apiBaseUrl?.replace(/\/+$/, '');
  if (next && next !== apiBase && /^https:\/\//.test(next)) {
    const there = await fetchConfig(next);
    if (there) {
      await switchApiBase(next);
      cfg = there;
    }
  }
  setUpdateState({
    required: cfg.updateRequired,
    available: cfg.updateAvailable,
    url: cfg.updateUrl || undefined,
    message: cfg.message,
    latestVersion: cfg.latestVersion || undefined,
  });
}
