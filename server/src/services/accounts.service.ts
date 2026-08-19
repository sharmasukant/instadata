import { ProviderFactory } from "../providers/provider.factory.js";
import {
  readAccounts,
  writeAccounts,
  generateId,
} from "../storage/json-store.js";
import { normalizeUrl } from "../utils/url-parser.js";
import type {
  StoredAccount,
  DashboardSummary,
  Platform,
} from "../types/analytics.types.js";

export class AccountsService {
  userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  async addAccount(rawUrl: string): Promise<StoredAccount> {
    const url = normalizeUrl(rawUrl);
    const provider = ProviderFactory.getProvider(url);

    if (!provider) {
      throw new Error(
        "Unsupported platform. Supported: Instagram, YouTube, TikTok, Twitter/X, Facebook, LinkedIn, Pinterest, Twitch",
      );
    }

    const username = provider.extractUsername(url);
    if (!username) {
      throw new Error(
        "Could not extract username from URL. Please check the URL format.",
      );
    }

    // Check for duplicates
    const existing = readAccounts(this.userId);
    const duplicate = existing.find(
      (a) =>
        a.platform === provider.platform &&
        a.username.toLowerCase() === username.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(
        `Account @${username} on ${provider.platform} is already added.`,
      );
    }

    const analytics = await provider.fetchAnalytics(username, url);
    console.log("[accounts] provider analytics response before write", {
      platform: provider.platform,
      username,
      analytics,
    });
    const now = new Date().toISOString();

    const account: StoredAccount = {
      id: generateId(),
      profileUrl: url,
      platform: provider.platform,
      username,
      analytics,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };

    const accounts = readAccounts(this.userId);
    accounts.push(account);
    writeAccounts(accounts, this.userId);

    return account;
  }

  getAccounts(): StoredAccount[] {
    return readAccounts(this.userId);
  }

  getAccount(id: string): StoredAccount | undefined {
    return readAccounts(this.userId).find((a) => a.id === id);
  }

  deleteAccount(id: string): boolean {
    const accounts = readAccounts(this.userId);
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) return false;
    accounts.splice(index, 1);
    writeAccounts(accounts, this.userId);
    return true;
  }

  async refreshAccount(id: string): Promise<StoredAccount> {
    const accounts = readAccounts(this.userId);
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Account not found");

    const account = accounts[index]!;
    const provider = ProviderFactory.getProvider(account.profileUrl);
    if (!provider) throw new Error("Provider not found for this account");

    const analytics = await provider.fetchAnalytics(
      account.username,
      account.profileUrl,
    );
    console.log("[accounts] provider analytics response before refresh write", {
      id,
      platform: account.platform,
      username: account.username,
      analytics,
    });
    account.analytics = analytics;
    account.updatedAt = new Date().toISOString();

    accounts[index] = account;
    writeAccounts(accounts, this.userId);

    return account;
  }

  toggleFavorite(id: string): StoredAccount | null {
    const accounts = readAccounts(this.userId);
    const account = accounts.find((a) => a.id === id);
    if (!account) return null;
    account.favorite = !account.favorite;
    writeAccounts(accounts, this.userId);
    return account;
  }

  getDashboardSummary(): DashboardSummary {
    const accounts = readAccounts(this.userId);
    const platformBreakdown = {} as Record<Platform, number>;

    let totalFollowers = 0;
    let totalFollowing = 0;
    let totalPosts = 0;
    let totalMonthlyViews = 0;
    let totalEngagement = 0;
    let revenueMin = 0;
    let revenueMax = 0;

    for (const account of accounts) {
      const a = account.analytics;
      totalFollowers += a.followers;
      totalFollowing += a.following;
      totalPosts += a.posts;
      totalMonthlyViews += a.monthlyViews;
      totalEngagement += a.engagementRate;
      revenueMin += a.estimatedRevenue.min;
      revenueMax += a.estimatedRevenue.max;

      platformBreakdown[a.platform] = (platformBreakdown[a.platform] || 0) + 1;
    }

    return {
      totalAccounts: accounts.length,
      totalFollowers,
      totalFollowing,
      totalPosts,
      totalMonthlyViews,
      averageEngagement:
        accounts.length > 0
          ? parseFloat((totalEngagement / accounts.length).toFixed(2))
          : 0,
      estimatedRevenue: { min: revenueMin, max: revenueMax },
      platformBreakdown,
    };
  }
}
