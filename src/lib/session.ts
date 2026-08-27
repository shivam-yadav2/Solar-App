import * as SecureStore from 'expo-secure-store';

/**
 * Token / tenant-scope storage.
 *
 * The web app reads these straight out of `localStorage`, which is
 * synchronous. SecureStore is async, so we keep an in-memory mirror that is
 * hydrated once at startup (`restoreSession`) and updated on every write.
 * That keeps `getAuthHeader()` synchronous, so the ported api.ts stays
 * structurally identical to the web version.
 *
 * SecureStore is backed by iOS Keychain / Android Keystore — a real upgrade
 * over the web app's localStorage.
 */

const TOKEN_KEY = 'solaros_token';
const TENANT_KEY = 'solaros_active_tenant_id';

let cachedToken: string | null = null;
let cachedTenantId: string | null = null;

type ExpiryListener = () => void;
const expiryListeners = new Set<ExpiryListener>();

/** Replaces the web app's `window.addEventListener('auth:expired')`. */
export function onAuthExpired(listener: ExpiryListener): () => void {
  expiryListeners.add(listener);
  return () => expiryListeners.delete(listener);
}

export function emitAuthExpired(): void {
  expiryListeners.forEach((l) => l());
}

export function getToken(): string | null {
  return cachedToken;
}

export function getActiveTenantId(): string | null {
  return cachedTenantId;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setActiveTenantId(tenantId: string | null): Promise<void> {
  cachedTenantId = tenantId;
  if (tenantId) await SecureStore.setItemAsync(TENANT_KEY, tenantId);
  else await SecureStore.deleteItemAsync(TENANT_KEY);
}

/** Hydrate the in-memory cache from secure storage. Call once on app boot. */
export async function restoreSession(): Promise<{ token: string | null }> {
  try {
    [cachedToken, cachedTenantId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(TENANT_KEY),
    ]);
  } catch {
    cachedToken = null;
    cachedTenantId = null;
  }
  return { token: cachedToken };
}

export async function clearSession(): Promise<void> {
  await Promise.all([setToken(null), setActiveTenantId(null)]);
}
