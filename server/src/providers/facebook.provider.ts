import { SocialProvider } from './provider.interface.js';
import { Platform, UnifiedAnalytics } from '../types/analytics.types.js';
import { MetaStore } from '../utils/meta-store.js';
import axios from 'axios';
import { extractDomain } from '../utils/url-parser.js';

export class FacebookProvider implements SocialProvider {
  platform: Platform = 'facebook';

  validateUrl(url: string): boolean {
    const domain = extractDomain(url);
    return domain === 'facebook.com' || domain === 'fb.com';
  }

  extractUsername(url: string): string {
    const match = url.match(/(?:facebook\.com|fb\.com)\/([^/?]+)/);
    return match ? (match[1] || '') : '';
  }

  async fetchAnalytics(username: string, profileUrl: string): Promise<UnifiedAnalytics> {
    const config = MetaStore.get();
    
    if (!config.userAccessToken) {
      throw new Error('Meta authentication required. Please connect your Facebook account in settings.');
    }

    try {
      // For Facebook Pages, we just need to search for the page or get it by id/username
      const url = `https://graph.facebook.com/v19.0/${username}`;
      const fields = `id,name,username,about,fan_count,followers_count,picture.type(large),verification_status`;
      
      const response = await axios.get(url, {
        params: {
          fields,
          access_token: config.userAccessToken
        }
      });

      const data = response.data;

      // Facebook Pages API doesn't give us public post likes easily without Page Access Token
      // So we use follower counts for baseline engagement estimates
      const followers = data.followers_count || data.fan_count || 0;
      
      return {
        platform: this.platform,
        username: data.username || username,
        displayName: data.name || username,
        profileImage: data.picture?.data?.url || '',
        bio: data.about || '',
        verified: data.verification_status === 'blue_verified',
        followers: followers,
        following: 0,
        posts: 0, 
        averageLikes: 0,
        averageComments: 0,
        engagementRate: 0,
        monthlyViews: 0,
        monthlyReach: 0,
        estimatedRevenue: { min: 0, max: 0 },
        country: 'Global',
        category: 'Page',
        lastUpdated: new Date().toISOString(),
      };

    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.message;
      throw new Error(`Facebook Graph API Error: ${msg}`);
    }
  }
}
