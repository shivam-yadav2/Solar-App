import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import {
  restoreSession,
  clearSession,
  setActiveTenantId,
  onAuthExpired,
} from '../lib/session';
import type { User, Customer, Tenant } from '../types';

interface AuthContextType {
  user: User | null;
  customer: Customer | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissionKeys: string[];
  hasPermission: (key: string) => boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenantScope: (tenantId: string | null) => Promise<void>;
  impersonateTenant: (tenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setCustomer(null);
    setTenant(null);
    setPermissionKeys([]);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setCustomer(data.customer ?? null);
      // Always sync (including clearing) so switching a SUPER_ADMIN back to
      // the global scope doesn't leave a stale tenant behind — same fix as
      // the web app.
      setTenant(data.tenant ?? null);
      setPermissionKeys(data.permissionKeys ?? []);
    } catch {
      await logout();
    }
  }, [logout]);

  // Boot: hydrate the token from SecureStore, then resolve the session.
  useEffect(() => {
    (async () => {
      const { token } = await restoreSession();
      if (token) await refreshUser();
      setIsLoading(false);
    })();
  }, [refreshUser]);

  // Replaces the web app's window 'auth:expired' event listener.
  useEffect(() => onAuthExpired(() => { void logout(); }), [logout]);

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ emailOrUsername, password });
      setUser(res.user);
      setCustomer(res.customer ?? null);
      setPermissionKeys(res.permissionKeys ?? []);
      if (res.tenant) {
        setTenant(res.tenant);
        if (res.user.role !== 'SUPER_ADMIN') {
          await setActiveTenantId(res.tenant.id);
        }
      } else {
        setTenant(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchTenantScope = useCallback(async (tenantId: string | null) => {
    await setActiveTenantId(tenantId);
    await refreshUser();
  }, [refreshUser]);

  const impersonateTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      const result = await api.impersonateSaaSTenant(tenantId);
      setUser(result.user);
      setTenant(result.tenant);
      setCustomer(null);
      setPermissionKeys(result.permissionKeys ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasPermission = useCallback((key: string) => {
    if (user?.role === 'SUPER_ADMIN') return true;
    if (user?.role === 'CUSTOMER') return false;
    return permissionKeys.includes(key);
  }, [user?.role, permissionKeys]);

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        tenant,
        isAuthenticated: !!user,
        isLoading,
        permissionKeys,
        hasPermission,
        login,
        logout,
        refreshUser,
        switchTenantScope,
        impersonateTenant,
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
