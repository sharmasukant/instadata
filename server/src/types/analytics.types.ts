export type Platform = 
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'facebook'
  | 'linkedin'
  | 'pinterest'
  | 'twitch';

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
  platformBreakdown: Record<Platform, number>;
}
