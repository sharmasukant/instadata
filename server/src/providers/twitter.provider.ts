import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, calculateEngagementRate, estimateRevenue } from '../utils/url-parser.js';

interface TwitterResult {
  userName?: string;
  name?: string;
  description?: string;
  followers?: number;
  following?: number;
  statusesCount?: number;
  isVerified?: boolean;
  profilePicture?: string;
  location?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
}

export class TwitterProvider implements SocialProvider {
  platform = 'twitter' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\//i.test(url);
  }

  extractUsername(url: string): string {
    const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i);
    return match?.[1] || '';
  }

  async fetchAnalytics(username: string): Promise<UnifiedAnalytics> {
    const results = await runApifyActor<{ twitterHandles: string[]; maxItems: number }, TwitterResult>(
      'apidojo~twitter-user-scraper',
      { twitterHandles: [username], maxItems: 10 }
    );

    const profile = results.find(r => r.userName || r.followers !== undefined);
    if (!profile) throw new Error(`Twitter profile not found: ${username}`);

    const tweets = results.filter(r => r.likeCount !== undefined);
    const totalLikes = tweets.reduce((sum, t) => sum + (t.likeCount || 0), 0);
    const totalReplies = tweets.reduce((sum, t) => sum + (t.replyCount || 0), 0);
    const avgLikes = tweets.length > 0 ? Math.round(totalLikes / tweets.length) : 0;
    const avgComments = tweets.length > 0 ? Math.round(totalReplies / tweets.length) : 0;
    const followers = parseCount(profile.followers || 0);
    const engagement = calculateEngagementRate(avgLikes, avgComments, followers);
    const revenue = estimateRevenue(followers, engagement);

    return {
      platform: 'twitter',
      username: profile.userName || username,
      displayName: profile.name || username,
      profileImage: profile.profilePicture || '',
      bio: profile.description || '',
      verified: profile.isVerified || false,
      followers,
      following: parseCount(profile.following || 0),
      posts: parseCount(profile.statusesCount || 0),
      averageLikes: avgLikes,
      averageComments: avgComments,
      engagementRate: engagement,
      monthlyViews: Math.round(followers * 0.15 * 30),
      monthlyReach: Math.round(followers * 0.1 * 30),
      estimatedRevenue: revenue,
      country: profile.location || '',
      category: 'Public Figure',
      lastUpdated: new Date().toISOString(),
    };
  }
}
