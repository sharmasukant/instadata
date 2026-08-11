import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, estimateRevenue } from '../utils/url-parser.js';

interface PinterestResult {
  username?: string;
  full_name?: string;
  bio?: string;
  follower_count?: number;
  following_count?: number;
  pin_count?: number;
  board_count?: number;
  profile_image_url?: string;
  is_verified?: boolean;
}

export class PinterestProvider implements SocialProvider {
  platform = 'pinterest' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?pinterest\.com\//i.test(url);
  }

  extractUsername(url: string): string {
    const match = url.match(/pinterest\.com\/([a-zA-Z0-9_]+)/i);
    return match?.[1] || '';
  }

  async fetchAnalytics(username: string): Promise<UnifiedAnalytics> {
    const results = await runApifyActor<{ usernames: string[] }, PinterestResult>(
      'easyapi~pinterest-profile-scraper',
      { usernames: [username] }
    );

    const profile = results[0];
    if (!profile) throw new Error(`Pinterest profile not found: ${username}`);

    const followers = parseCount(profile.follower_count || 0);
    const revenue = estimateRevenue(followers, 1);

    return {
      platform: 'pinterest',
      username: profile.username || username,
      displayName: profile.full_name || username,
      profileImage: profile.profile_image_url || '',
      bio: profile.bio || '',
      verified: profile.is_verified || false,
      followers,
      following: parseCount(profile.following_count || 0),
      posts: parseCount(profile.pin_count || 0),
      averageLikes: 0,
      averageComments: 0,
      engagementRate: 0,
      monthlyViews: Math.round(followers * 0.15 * 30),
      monthlyReach: Math.round(followers * 0.1 * 30),
      estimatedRevenue: revenue,
      country: '',
      category: 'Creator',
      lastUpdated: new Date().toISOString(),
    };
  }
}
