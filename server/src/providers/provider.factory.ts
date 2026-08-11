import type { SocialProvider } from './provider.interface.js';
import { InstagramProvider } from './instagram.provider.js';
import { YoutubeProvider } from './youtube.provider.js';
import { TiktokProvider } from './tiktok.provider.js';
import { TwitterProvider } from './twitter.provider.js';
import { FacebookProvider } from './facebook.provider.js';
import { LinkedinProvider } from './linkedin.provider.js';
import { PinterestProvider } from './pinterest.provider.js';
import { TwitchProvider } from './twitch.provider.js';

const providers: SocialProvider[] = [
  new InstagramProvider(),
  new YoutubeProvider(),
  new TiktokProvider(),
  new TwitterProvider(),
  new FacebookProvider(),
  new LinkedinProvider(),
  new PinterestProvider(),
  new TwitchProvider(),
];

export class ProviderFactory {
  static getProvider(url: string): SocialProvider | null {
    return providers.find(p => p.validateUrl(url)) || null;
  }

  static getAllProviders(): SocialProvider[] {
    return providers;
  }
}
