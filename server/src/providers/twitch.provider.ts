import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, estimateRevenue } from '../utils/url-parser.js';

interface TwitchResult {
  channelName?: string;
  displayName?: string;
  followerCount?: number;
  profileDescription?: string;
  partnerStatus?: boolean;
  avatarUrl?: string;
  isLive?: boolean;
  viewerCount?: number;
  streamTitle?: string;
  gameName?: string;
}

export class TwitchProvider implements SocialProvider {
  platform = 'twitch' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?twitch\.tv\//i.test(url);
  }

  extractUsername(url: string): string {
    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/i);
    return match?.[1] || '';
  }

  async fetchAnalytics(username: string): Promise<UnifiedAnalytics> {
    const results = await runApifyActor<{ channelNames: string[]; mode: string }, TwitchResult>(
      'gurify~twitch-channel-scraper',
      { channelNames: [username], mode: 'channel_details' }
    );

    const channel = results[0];
    if (!channel) throw new Error(`Twitch channel not found: ${username}`);

    const followers = parseCount(channel.followerCount || 0);
    const revenue = estimateRevenue(followers, 3);

    return {
      platform: 'twitch',
      username: channel.channelName || username,
      displayName: channel.displayName || username,
      profileImage: channel.avatarUrl || '',
      bio: channel.profileDescription || '',
      verified: channel.partnerStatus || false,
      followers,
      following: 0,
      posts: 0,
      averageLikes: 0,
      averageComments: 0,
      engagementRate: 0,
      monthlyViews: Math.round(followers * 0.1 * 30),
      monthlyReach: Math.round(followers * 0.08 * 30),
      estimatedRevenue: revenue,
      country: '',
      category: channel.gameName || 'Streamer',
      lastUpdated: new Date().toISOString(),
    };
  }
}
