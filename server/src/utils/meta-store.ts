import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "meta-config.json");
const SOCIAL_FILE = path.join(DATA_DIR, "social-connections.json");

export interface MetaConfig {
  userAccessToken: string | null;
  pageAccessToken: string | null;
  instagramAccountId: string | null;
  facebookPageId: string | null;
  expiresAt: string | null;
  instagramAccessToken: string | null;
  instagramUserId: string | null;
  instagramUsername: string | null;
  instagramTokenExpiresAt: string | null;
}

const DEFAULT_CONFIG: MetaConfig = {
  userAccessToken: null,
  pageAccessToken: null,
  instagramAccountId: null,
  facebookPageId: null,
  expiresAt: null,
  instagramAccessToken: null,
  instagramUserId: null,
  instagramUsername: null,
  instagramTokenExpiresAt: null,
};

export class MetaStore {
  static init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        "utf-8",
      );
    }
  }

  static get(): MetaConfig {
    this.init();
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data) as Partial<MetaConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        "utf-8",
      );
      return DEFAULT_CONFIG;
    }
  }

  static save(config: Partial<MetaConfig>): MetaConfig {
    const current = this.get();
    const updated = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  }

  // Per-user social connections store. Stored as an object mapping userId -> MetaConfig
  static ensureSocialFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SOCIAL_FILE))
      fs.writeFileSync(SOCIAL_FILE, JSON.stringify({}), "utf-8");
  }

  static getForUser(userId: string): MetaConfig {
    this.ensureSocialFile();
    try {
      const raw = fs.readFileSync(SOCIAL_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, Partial<MetaConfig>>;
      const cfg = parsed[userId] || {};
      return { ...DEFAULT_CONFIG, ...cfg };
    } catch {
      fs.writeFileSync(SOCIAL_FILE, JSON.stringify({}, null, 2), "utf-8");
      return DEFAULT_CONFIG;
    }
  }

  static saveForUser(userId: string, config: Partial<MetaConfig>): MetaConfig {
    this.ensureSocialFile();
    const raw = fs.readFileSync(SOCIAL_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, Partial<MetaConfig>>;
    const current = parsed[userId] || {};
    const updated = { ...DEFAULT_CONFIG, ...current, ...config };
    parsed[userId] = updated;
    fs.writeFileSync(SOCIAL_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    return updated;
  }
}
