import type { Platform, UnifiedAnalytics } from '../types/analytics.types.js';

export interface SocialProvider {
  platform: Platform;
  validateUrl(url: string): boolean;
  extractUsername(url: string): string;
  fetchAnalytics(username: string, profileUrl: string): Promise<UnifiedAnalytics>;
}
