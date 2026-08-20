import { SocialProvider } from './provider.interface.js';
import { Platform, UnifiedAnalytics } from '../types/analytics.types.js';
import { MetaStore } from '../utils/meta-store.js';
import axios from 'axios';
import { extractDomain } from '../utils/url-parser.js';

const FACEBOOK_GRAPH_VERSION = 'v19.0';
const PAGE_FIELDS =
  'id,name,username,about,fan_count,followers_count,picture.type(large),verification_status,access_token';

type FacebookPage = {
  id: string;
  name?: string;
  username?: string;
  about?: string;
  fan_count?: number;
  followers_count?: number;
  picture?: { data?: { url?: string } };
  verification_status?: string;
  access_token?: string;
};

function normalizeLookup(value: string | undefined | null): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/\s+/g, '');
}

export class FacebookProvider implements SocialProvider {
  platform: Platform = 'facebook';

  validateUrl(url: string): boolean {
    const domain = extractDomain(url);
    return domain === 'facebook.com' || domain === 'fb.com';
  }

  extractUsername(url: string): string {
    const match = url.match(/(?:facebook\.com|fb\.com)\/([^/?#]+)/);
    const slug = match ? (match[1] || '') : '';

    if (slug === 'share' || slug === 'sharer' || slug === 'story.php') {
      throw new Error(
        'Facebook share links are not supported by Meta Graph API. Please paste the actual Facebook Page URL or Page username/ID, for example https://www.facebook.com/page.username'
      );
    }

    if (slug === 'profile.php') {
      const id = new URL(url).searchParams.get('id');
      return id || '';
    }

    return slug;
  }

  async fetchAnalytics(username: string, profileUrl: string, userId?: string): Promise<UnifiedAnalytics> {
    const config = userId ? MetaStore.getForUser(userId) : MetaStore.get();
    
    if (!config.userAccessToken) {
      throw new Error('Meta authentication required. Please connect your Facebook account in settings.');
    }

    try {
      const requested = normalizeLookup(username);
      const pagesResponse = await axios.get(
        `https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/me/accounts`,
        {
          params: {
            fields: PAGE_FIELDS,
            access_token: config.userAccessToken,
          },
        },
      );
      const pages = (pagesResponse.data?.data || []) as FacebookPage[];
      const selectedPage =
        pages.find((page) => page.id === username) ||
        pages.find((page) => normalizeLookup(page.username) === requested) ||
        pages.find((page) => normalizeLookup(page.name) === requested) ||
        pages.find((page) => page.id === config.facebookPageId) ||
        (pages.length === 1 ? pages[0] : undefined);

      if (!selectedPage) {
        throw new Error(
          'This Facebook Page was not found in your connected Meta account. Reconnect Facebook and make sure you select the Page you want to add.',
        );
      }

      const pageAccessToken = selectedPage.access_token || config.pageAccessToken || config.userAccessToken;
      const response = await axios.get(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${selectedPage.id}`, {
        params: {
          fields: PAGE_FIELDS,
          access_token: pageAccessToken,
        }
      });

      const data = response.data as FacebookPage;

      // Facebook Pages API doesn't give us public post likes easily without Page Access Token
      // So we use follower counts for baseline engagement estimates
      const followers = data.followers_count || data.fan_count || 0;
      
      return {
        platform: this.platform,
        username: data.username || data.id || username,
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
      const code = error.response?.data?.error?.code;
      if (msg === 'An unknown error has occurred' || code === 1) {
        throw new Error(
          'Facebook Graph API Error: This Facebook URL could not be resolved by Meta. Use the actual Facebook Page URL or Page username/ID, not a share link. Example: https://www.facebook.com/page.username'
        );
      }
      throw new Error(`Facebook Graph API Error: ${msg}`);
    }
  }
}
