import axios from 'axios';
import { Platform } from './platforms';

export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const response = await apiClient.post<StoredAccount>('/accounts', { url });
    return response.data;
  },

  getAccounts: async (): Promise<StoredAccount[]> => {
    const response = await apiClient.get<StoredAccount[]>('/accounts');
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
    const response = await apiClient.patch<StoredAccount>(`/accounts/${id}/refresh`);
    return response.data;
  },

  toggleFavorite: async (id: string): Promise<StoredAccount> => {
    const response = await apiClient.patch<StoredAccount>(`/accounts/${id}/favorite`);
    return response.data;
  },

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await apiClient.get<DashboardSummary>('/dashboard');
    return response.data;
  },

  getMetaAuthStatus: async (): Promise<MetaAuthStatus> => {
    const response = await apiClient.get<MetaAuthStatus>('/auth/facebook/status');
    return response.data;
  },
};
