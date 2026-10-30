import { create } from 'zustand';
import {
  apiClient,
  setAuthTokens,
  clearAuthTokens,
  getAccessToken,
  TOKEN_KEYS,
} from '@/lib/api/client';

export interface User {
  id: number;
  role: 'coaching_admin' | 'teacher' | 'student' | 'superadmin' | string;
  fullName: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  isActive?: boolean;
}

export interface Tenant {
  id?: number;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (phone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: () => {
    if (typeof window === 'undefined') return;
    const token = getAccessToken();
    const storedUser = localStorage.getItem(TOKEN_KEYS.USER);
    const storedTenant = localStorage.getItem(TOKEN_KEYS.TENANT);

    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const tenant = storedTenant ? JSON.parse(storedTenant) : null;
        set({ user, tenant, isAuthenticated: true, isLoading: false });
        // Refresh 'me' in background
        get().fetchMe();
      } catch {
        set({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (phone: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/auth/login', {
        phone: phone.trim(),
        password: pass,
      });

      const { accessToken, refreshToken, user, tenant } = res.data;

      if (!accessToken) {
        throw new Error('Invalid server response');
      }

      setAuthTokens(accessToken, refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
        if (tenant) localStorage.setItem(TOKEN_KEYS.TENANT, JSON.stringify(tenant));
      }

      set({
        user,
        tenant,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Login failed. Please check your credentials.';
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  fetchMe: async () => {
    try {
      const res = await apiClient.get('/auth/me');
      const { user, tenant } = res.data;
      if (user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
          if (tenant) localStorage.setItem(TOKEN_KEYS.TENANT, JSON.stringify(tenant));
        }
        set({ user, tenant: tenant ?? get().tenant, isAuthenticated: true });
      }
    } catch {
      // If /me fails with 401, apiClient interceptor will handle refresh or token clear
    }
  },

  logout: () => {
    try {
      apiClient.post('/auth/logout').catch(() => {});
    } finally {
      clearAuthTokens();
      set({ user: null, tenant: null, isAuthenticated: false, error: null });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
}));

