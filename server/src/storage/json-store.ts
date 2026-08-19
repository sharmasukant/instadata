import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { StoredAccount } from "../types/analytics.types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "../../data");
const DATA_FILE = join(DATA_DIR, "accounts.json");

type AccountsFile = {
  byUser?: Record<string, StoredAccount[]>;
  demo?: StoredAccount[];
};

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ demo: [] }), "utf-8");
  }
}

export function readAccounts(userId?: string): StoredAccount[] {
  ensureDataDir();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as AccountsFile;
    if (userId) {
      return (parsed.byUser && parsed.byUser[userId]) || [];
    }
    return parsed.demo || [];
  } catch {
    return [];
  }
}

export function writeAccounts(
  accounts: StoredAccount[],
  userId?: string,
): void {
  ensureDataDir();
  const raw = readFileSync(DATA_FILE, "utf-8");
  let parsed: AccountsFile = {};
  try {
    parsed = JSON.parse(raw) as AccountsFile;
  } catch {
    parsed = {};
  }

  if (userId) {
    parsed.byUser = parsed.byUser || {};
    parsed.byUser[userId] = accounts;
  } else {
    parsed.demo = accounts;
  }

  writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), "utf-8");
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
