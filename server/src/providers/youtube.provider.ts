import type { SocialProvider } from './provider.interface.js';
import type { UnifiedAnalytics } from '../types/analytics.types.js';
import { runApifyActor } from '../utils/apify-client.js';
import { parseCount, calculateEngagementRate, estimateRevenue } from '../utils/url-parser.js';

interface YouTubeChannelResult {
  channelName?: string;
  channelUrl?: string;
  numberOfSubscribers?: number;
  channelDescription?: string;
  channelAvatarUrl?: string;
  channelVerified?: boolean;
  isVerified?: boolean;
  channelTotalViews?: number;
  channelTotalVideos?: number;
  channelCountry?: string;
  channelJoinedDate?: string;
  title?: string;
  viewCount?: number;
  likes?: number;
  commentsCount?: number;
  date?: string;
}

export class YoutubeProvider implements SocialProvider {
  platform = 'youtube' as const;

  validateUrl(url: string): boolean {
    return /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url);
  }

  extractUsername(url: string): string {
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/i);
    if (handleMatch) return handleMatch[1]!;
    const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/i);
    if (channelMatch) return channelMatch[1]!;
    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/i);
    if (customMatch) return customMatch[1]!;
    return '';
  }

  async fetchAnalytics(username: string, profileUrl: string): Promise<UnifiedAnalytics> {
    const url = profileUrl || `https://youtube.com/@${username}`;
    const results = await runApifyActor<{ startUrls: Array<{ url: string }>; maxResults: number; maxResultsShorts: number }, YouTubeChannelResult>(
      'streamers~youtube-channel-scraper',
      { startUrls: [{ url }], maxResults: 10, maxResultsShorts: 0 }
    );

    // The first result with channel info
    const channelData = results.find(r => r.channelName || r.numberOfSubscribers);
    if (!channelData) throw new Error(`YouTube channel not found: ${username}`);

    const videos = results.filter(r => r.title && r.viewCount !== undefined);
    const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalComments = videos.reduce((sum, v) => sum + (v.commentsCount || 0), 0);
    const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
    const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;
    const subscribers = parseCount(channelData.numberOfSubscribers || 0);
    const engagement = calculateEngagementRate(avgLikes, avgComments, subscribers);
    const revenue = estimateRevenue(subscribers, engagement);

    return {
      platform: 'youtube',
      username,
      displayName: channelData.channelName || username,
      profileImage: channelData.channelAvatarUrl || '',
      bio: channelData.channelDescription || '',
      verified: channelData.channelVerified || channelData.isVerified || false,
      followers: subscribers,
      following: 0,
      posts: parseCount(channelData.channelTotalVideos || videos.length),
      averageLikes: avgLikes,
      averageComments: avgComments,
      engagementRate: engagement,
      monthlyViews: Math.round(totalViews / Math.max(videos.length, 1) * 30),
      monthlyReach: Math.round(subscribers * 0.15 * 30),
      estimatedRevenue: revenue,
      country: channelData.channelCountry || '',
      category: 'Content Creator',
      lastUpdated: new Date().toISOString(),
    };
  }
}
