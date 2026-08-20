import { SocialProvider } from './provider.interface.js';
import { Platform, UnifiedAnalytics } from '../types/analytics.types.js';
import { MetaStore } from '../utils/meta-store.js';
import axios from 'axios';
import { extractDomain } from '../utils/url-parser.js';

export class InstagramProvider implements SocialProvider {
  platform: Platform = 'instagram';

  validateUrl(url: string): boolean {
    const domain = extractDomain(url);
    return domain === 'instagram.com';
  }

  extractUsername(url: string): string {
    const match = url.match(/(?:instagram\.com\/)([a-zA-Z0-9._]+)/);
    return match ? (match[1] || '') : '';
  }

  async fetchAnalytics(username: string, profileUrl: string, userId?: string): Promise<UnifiedAnalytics> {
    const config = userId ? MetaStore.getForUser(userId) : MetaStore.get();
    
    if (!config.instagramAccessToken || !config.instagramUserId) {
      throw new Error(
        'Instagram authentication required. Please connect your Instagram Business or Creator account.'
      );
    }

    if (config.instagramUsername && username.toLowerCase() !== config.instagramUsername.toLowerCase()) {
      throw new Error(
        `Direct Instagram Login can only fetch the authenticated account @${config.instagramUsername}. Please connect the Instagram account you want to analyze.`
      );
    }

    try {
      const url = `https://graph.instagram.com/v23.0/${config.instagramUserId}`;
      const fields = [
        'id',
        'username',
        'name',
        'profile_picture_url',
        'biography',
        'followers_count',
        'follows_count',
        'media_count',
        'media.limit(25){comments_count,like_count}',
      ].join(',');
      
      const response = await axios.get(url, {
        params: {
          fields,
          access_token: config.instagramAccessToken
        }
      });

      const data = response.data;
      console.log('[instagram] meta graph raw response received', {
        username,
        instagramUser: data || null,
      });
      
      if (!data) {
        throw new Error('Account not found or is not an Instagram Business/Creator account.');
      }

      // Calculate averages from recent media
      let totalLikes = 0;
      let totalComments = 0;
      let postCount = 0;

      if (data.media && data.media.data) {
        data.media.data.forEach((media: any) => {
          totalLikes += media.like_count || 0;
          totalComments += media.comments_count || 0;
          postCount++;
        });
      }

      const averageLikes = postCount > 0 ? Math.round(totalLikes / postCount) : 0;
      const averageComments = postCount > 0 ? Math.round(totalComments / postCount) : 0;
      
      // Calculate engagement rate: (Avg Likes + Avg Comments) / Followers
      let engagementRate = 0;
      if (data.followers_count > 0) {
        engagementRate = Number((((averageLikes + averageComments) / data.followers_count) * 100).toFixed(2));
      }

      // Rough revenue estimate based on followers & engagement
      const minRev = Math.round((data.followers_count * 0.001) + (averageLikes * 0.01));
      const maxRev = Math.round((data.followers_count * 0.005) + (averageLikes * 0.05));

      return {
        platform: this.platform,
        username: data.username,
        displayName: data.name || data.username,
        profileImage: data.profile_picture_url || '',
        bio: data.biography || '',
        verified: false,
        followers: data.followers_count || 0,
        following: data.follows_count || 0,
        posts: data.media_count || 0,
        averageLikes,
        averageComments,
        engagementRate,
        monthlyViews: 0,
        monthlyReach: 0,
        estimatedRevenue: { min: minRev, max: maxRev },
        country: 'Global',
        category: 'Business',
        lastUpdated: new Date().toISOString(),
      };

    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.message;
      throw new Error(`Instagram Graph API Error: ${msg}`);
    }
  }
}
