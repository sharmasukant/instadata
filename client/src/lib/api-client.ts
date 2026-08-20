import axios from "axios";
import { Platform } from "./platforms";

export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://instadata-d0v9.onrender.com/api" : "/api");

export const SESSION_TOKEN_KEY = "instadata-session-token";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (!token) {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }

    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures in privacy-restricted or ephemeral environments.
  }
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
  sessionToken: string;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getSessionToken();

  if (!token) {
    return config;
  }

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-session-token"] = token;

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setSessionToken(null);

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/auth"
      ) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.assign(
          `/auth?returnTo=${encodeURIComponent(returnTo)}`,
        );
      }
    }

    return Promise.reject(error);
  },
);

export interface UnifiedAnalytics {
  platform: Platform;
  username: string;
  displayName: string;
  profileImage: string;
  bio: string;
  verified: boolean;
  followers: number;
  following: number;
  posts: number;
  averageLikes: number;
  averageComments: number;
  engagementRate: number;
  monthlyViews: number;
  monthlyReach: number;
  estimatedRevenue: { min: number; max: number };
  country: string;
  category: string;
  lastUpdated: string;
}

export interface StoredAccount {
  id: string;
  profileUrl: string;
  platform: Platform;
  username: string;
  analytics: UnifiedAnalytics;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalAccounts: number;
  totalFollowers: number;
  totalFollowing: number;
  totalPosts: number;
  totalMonthlyViews: number;
  averageEngagement: number;
  estimatedRevenue: { min: number; max: number };
  platformBreakdown: Record<string, number>;
}

export interface MetaAuthStatus {
  connected: boolean;
  hasInstagram: boolean;
  hasFacebook: boolean;
  isExpired?: boolean;
}

export const accountsApi = {
  addAccount: async (url: string): Promise<StoredAccount> => {
    const response = await apiClient.post<StoredAccount>("/accounts", { url });
    return response.data;
  },

  getAccounts: async (): Promise<StoredAccount[]> => {
    const response = await apiClient.get<StoredAccount[]>("/accounts");
    return response.data;
  },

  getAccount: async (id: string): Promise<StoredAccount> => {
    const response = await apiClient.get<StoredAccount>(`/accounts/${id}`);
    return response.data;
  },

  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },

  refreshAccount: async (id: string): Promise<StoredAccount> => {
    const response = await apiClient.patch<StoredAccount>(
      `/accounts/${id}/refresh`,
    );
    return response.data;
  },

  toggleFavorite: async (id: string): Promise<StoredAccount> => {
    const response = await apiClient.patch<StoredAccount>(
      `/accounts/${id}/favorite`,
    );
    return response.data;
  },

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>("/dashboard");
    return response.data;
  },

  getMetaAuthStatus: async (): Promise<MetaAuthStatus> => {
    const response = await apiClient.get<MetaAuthStatus>(
      "/auth/facebook/status",
    );
    return response.data;
  },
};

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    setSessionToken(response.data.sessionToken);
    return response.data;
  },

  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/register", {
      email,
      password,
    });
    setSessionToken(response.data.sessionToken);
    return response.data;
  },

  me: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>("/auth/me");
    return response.data;
  },

  logout: () => {
    setSessionToken(null);
  },
};
