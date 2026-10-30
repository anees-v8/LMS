import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const TOKEN_KEYS = {
  ACCESS: 'campus_access_token',
  REFRESH: 'campus_refresh_token',
  USER: 'campus_user',
  TENANT: 'campus_tenant',
} as const;

export function getAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return Cookies.get(TOKEN_KEYS.ACCESS) || localStorage.getItem(TOKEN_KEYS.ACCESS) || undefined;
}

export function getRefreshToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return Cookies.get(TOKEN_KEYS.REFRESH) || localStorage.getItem(TOKEN_KEYS.REFRESH) || undefined;
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  // 15 days cookie for cross-tab persistence
  Cookies.set(TOKEN_KEYS.ACCESS, accessToken, { expires: 15, sameSite: 'lax' });
  Cookies.set(TOKEN_KEYS.REFRESH, refreshToken, { expires: 30, sameSite: 'lax' });
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  Cookies.remove(TOKEN_KEYS.ACCESS);
  Cookies.remove(TOKEN_KEYS.REFRESH);
  Cookies.remove(TOKEN_KEYS.USER);
  Cookies.remove(TOKEN_KEYS.TENANT);
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  localStorage.removeItem(TOKEN_KEYS.USER);
  localStorage.removeItem(TOKEN_KEYS.TENANT);
}

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err) => reject(err),
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearAuthTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = response.data?.accessToken;
        const newRefreshToken = response.data?.refreshToken || refreshToken;

        if (newAccessToken) {
          setAuthTokens(newAccessToken, newRefreshToken);
          processQueue(null, newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh token invalid');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

