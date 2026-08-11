import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, calculateEngagementRate, estimateRevenue } from '../utils/url-parser.js';

interface TikTokResult {
  authorMeta?: {
    id: string;
    name: string;
    nickName: string;
    signature: string;
    avatar: string;
    fans: number;
    following: number;
    heart: number;
    videoCount: number;
    verified: boolean;
  };
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
}

export class TiktokProvider implements SocialProvider {
  platform = 'tiktok' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i.test(url);
  }

  extractUsername(url: string): string {
    const match = url.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/i);
    return match?.[1] || '';
  }

  async fetchAnalytics(username: string): Promise<UnifiedAnalytics> {
    const results = await runApifyActor<{ profiles: string[]; resultsPerPage: number }, TikTokResult>(
      'clockworks~tiktok-profile-scraper',
      { profiles: [username], resultsPerPage: 10 }
    );

    const profileResult = results.find(r => r.authorMeta);
    if (!profileResult?.authorMeta) throw new Error(`TikTok profile not found: ${username}`);

    const meta = profileResult.authorMeta;
    const videos = results.filter(r => r.playCount !== undefined);
    const totalLikes = videos.reduce((sum, v) => sum + (v.diggCount || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.commentCount || 0), 0);
    const totalPlays = videos.reduce((sum, v) => sum + (v.playCount || 0), 0);
    const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
    const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;
    const engagement = calculateEngagementRate(avgLikes, avgComments, meta.fans);
    const revenue = estimateRevenue(meta.fans, engagement);

    return {
      platform: 'tiktok',
      username: meta.name,
      displayName: meta.nickName || meta.name,
      profileImage: meta.avatar,
      bio: meta.signature || '',
      verified: meta.verified,
      followers: parseCount(meta.fans),
      following: parseCount(meta.following),
      posts: parseCount(meta.videoCount),
      averageLikes: avgLikes,
      averageComments: avgComments,
      engagementRate: engagement,
      monthlyViews: Math.round(totalPlays / Math.max(videos.length, 1) * 30),
      monthlyReach: Math.round(meta.fans * 0.2 * 30),
      estimatedRevenue: revenue,
      country: '',
      category: 'Content Creator',
      lastUpdated: new Date().toISOString(),
    };
  }
}
