import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'meta-config.json');

export interface MetaConfig {
  userAccessToken: string | null;
  pageAccessToken: string | null;
  instagramAccountId: string | null;
  facebookPageId: string | null;
  expiresAt: string | null;
}

const DEFAULT_CONFIG: MetaConfig = {
  userAccessToken: null,
  pageAccessToken: null,
  instagramAccountId: null,
  facebookPageId: null,
  expiresAt: null,
};

export class MetaStore {
  static init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    }
  }

  static get(): MetaConfig {
    this.init();
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data) as Partial<MetaConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  static save(config: Partial<MetaConfig>): MetaConfig {
    const current = this.get();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }
}
