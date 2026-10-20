import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { account, LoginResult } from '../lib/apis/account';
import { restoreSession, clearSession, setActiveTenantId, setToken, onAuthExpired, getToken } from '../lib/session';
import { store } from '../lib/storage';

const PLATFORM_TOKEN_KEY = 'solaros_platform_token';
import type { User, Customer, Tenant, AuthSession } from '../types';
import { queryClient } from '../lib/queryClient';
import { checkAppConfig, loadSavedApiBase } from '../lib/appConfig';
import { registerForPush } from '../lib/push';
import { clearServerState } from '../lib/serverState';

export interface PendingMfa { mfaToken: string; setup: boolean; email: string }

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissionKeys: string[];
  hasPermission: (key: string) => boolean;
  /** Set when the password was right but a two-factor code (or first-time setup) is still needed. */
  pendingMfa: PendingMfa | null;
  /** Backup codes to show once after two-factor was set up during sign-in. */
  freshBackupCodes: string[] | null;
  clearBackupCodes: () => void;
  login: (emailOrUsername: string, password: string) => Promise<'ok' | 'mfa'>;
  verifyMfa: (code: string) => Promise<void>;
  enableMfaAtLogin: (code: string) => Promise<void>;
  cancelMfa: () => void;
  /** After a password change the server issues a new token. */
  applyToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenantScope: (tenantId: string | null) => Promise<void>;
  impersonateTenant: (tenantId: string) => Promise<void>;
  /** A platform admin is inside a company's workspace. */
  isImpersonating: boolean;
  exitWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMfa, setPendingMfa] = useState<PendingMfa | null>(null);
  const [freshBackupCodes, setFreshBackupCodes] = useState<string[] | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const reset = useCallback(() => {
    queryClient.clear();
    clearServerState();
    setUser(null);
    setCustomer(null);
    setTenant(null);
    setPermissionKeys([]);
    setPendingMfa(null);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    await clearSession();
    await store.del(PLATFORM_TOKEN_KEY).catch(() => {});
    setIsImpersonating(false);
    reset();
  }, [reset]);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setCustomer(data.customer ?? null);
      // Always sync (including clearing) so a SUPER_ADMIN back in the global scope has no stale tenant.
      setTenant(data.tenant ?? null);
      setPermissionKeys(data.permissionKeys ?? []);
      void registerForPush(api.registerPushDevice);
    } catch (e: any) {
      // Offline at start-up keeps the saved session; only a rejected token signs out.
      if (e?.status === 401 || e?.status === 403) await logout();
      else throw e;
    }
  }, [logout]);

  // Boot: server address / update check, then the saved session.
  useEffect(() => {
    (async () => {
      await loadSavedApiBase();
      await Promise.race([checkAppConfig(), new Promise((r) => setTimeout(r, 2500))]);
      const { token } = await restoreSession();
      setIsImpersonating(!!(await store.get(PLATFORM_TOKEN_KEY).catch(() => null)));
      if (token) await refreshUser().catch(() => undefined);
      setIsLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => onAuthExpired(() => { void logout(); }), [logout]);

  const applySession = useCallback(async (res: AuthSession & { forcePasswordChange?: boolean; backupCodes?: string[] }) => {
    queryClient.clear();
    clearServerState();
    await setToken(res.token);
    setUser({ ...res.user, forcePasswordChange: res.forcePasswordChange ?? res.user.forcePasswordChange });
    setCustomer(res.customer ?? null);
    setPermissionKeys(res.permissionKeys ?? []);
    setTenant(res.tenant ?? null);
    if (res.tenant && res.user.role !== 'SUPER_ADMIN') await setActiveTenantId(res.tenant.id);
    if (res.backupCodes?.length) setFreshBackupCodes(res.backupCodes);
    setPendingMfa(null);
    void registerForPush(api.registerPushDevice);
  }, []);

  const finish = useCallback(async (res: LoginResult): Promise<'ok' | 'mfa'> => {
    if ('mfaRequired' in res && res.mfaRequired) {
      setPendingMfa({ mfaToken: res.mfaToken, setup: res.mfaSetup, email: res.email });
      return 'mfa';
    }
    await applySession(res as AuthSession);
    return 'ok';
  }, [applySession]);

  const login = useCallback(async (emailOrUsername: string, password: string) => finish(await account.login(emailOrUsername, password)), [finish]);
  const verifyMfa = useCallback(async (code: string) => { if (pendingMfa) await finish(await account.loginMfa(pendingMfa.mfaToken, code)); }, [pendingMfa, finish]);
  const enableMfaAtLogin = useCallback(async (code: string) => { if (pendingMfa) await finish(await account.loginMfaEnable(pendingMfa.mfaToken, code)); }, [pendingMfa, finish]);
  const cancelMfa = useCallback(() => setPendingMfa(null), []);

  const applyToken = useCallback(async (token: string) => {
    await setToken(token);
    await refreshUser();
  }, [refreshUser]);

  const switchTenantScope = useCallback(async (tenantId: string | null) => {
    queryClient.clear();
    await setActiveTenantId(tenantId);
    await refreshUser();
  }, [refreshUser]);

  const impersonateTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      queryClient.clear();
      // Keep the platform session so "Exit workspace" can go back to it.
      const current = getToken();
      if (current && !(await store.get(PLATFORM_TOKEN_KEY))) await store.set(PLATFORM_TOKEN_KEY, current);
      const result = await api.impersonateSaaSTenant(tenantId);
      setIsImpersonating(true);
      setUser(result.user);
      setTenant(result.tenant);
      setCustomer(null);
      setPermissionKeys(result.permissionKeys ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exitWorkspace = useCallback(async () => {
    const platformToken = await store.get(PLATFORM_TOKEN_KEY);
    if (!platformToken) return;
    setIsLoading(true);
    try {
      await api.logout(); // ends the workspace session
      await setToken(platformToken);
      await setActiveTenantId(null);
      await store.del(PLATFORM_TOKEN_KEY);
      setIsImpersonating(false);
      queryClient.clear();
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const hasPermission = useCallback((key: string) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role === 'CUSTOMER') return false;
    return permissionKeys.includes(key);
  }, [user?.role, permissionKeys]);

  return (
    <AuthContext.Provider
      value={{
        user, customer, tenant, isAuthenticated: !!user, isLoading, permissionKeys, hasPermission,
        pendingMfa, freshBackupCodes, clearBackupCodes: () => setFreshBackupCodes(null),
        login, verifyMfa, enableMfaAtLogin, cancelMfa, applyToken, logout, refreshUser, switchTenantScope, impersonateTenant, isImpersonating, exitWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
