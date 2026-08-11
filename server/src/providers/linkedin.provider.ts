import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, estimateRevenue } from '../utils/url-parser.js';

interface LinkedInResult {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  summary?: string;
  about?: string;
  followerCount?: number;
  connectionsCount?: number;
  profilePicture?: string;
  location?: string;
}

export class LinkedinProvider implements SocialProvider {
  platform = 'linkedin' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\//i.test(url);
  }

  extractUsername(url: string): string {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    return match?.[1] || '';
  }

  async fetchAnalytics(username: string, profileUrl: string): Promise<UnifiedAnalytics> {
    const url = profileUrl || `https://linkedin.com/in/${username}`;
    const results = await runApifyActor<{ urls: string[] }, LinkedInResult>(
      'curious_coder~linkedin-profile-scraper',
      { urls: [url] }
    );

    const profile = results[0];
    if (!profile) throw new Error(`LinkedIn profile not found: ${username}`);

    const followers = parseCount(profile.followerCount || profile.connectionsCount || 0);
    const revenue = estimateRevenue(followers, 2);

    return {
      platform: 'linkedin',
      username,
      displayName: profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || username,
      profileImage: profile.profilePicture || '',
      bio: profile.headline || profile.summary || profile.about || '',
      verified: false,
      followers,
      following: 0,
      posts: 0,
      averageLikes: 0,
      averageComments: 0,
      engagementRate: 0,
      monthlyViews: Math.round(followers * 0.05 * 30),
      monthlyReach: Math.round(followers * 0.03 * 30),
      estimatedRevenue: revenue,
      country: profile.location || '',
      category: 'Professional',
      lastUpdated: new Date().toISOString(),
    };
  }
}
