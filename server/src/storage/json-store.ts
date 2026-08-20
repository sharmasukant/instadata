import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
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

function normalizeAccountsFile(value: unknown): AccountsFile {
  if (Array.isArray(value)) {
    return { demo: value as StoredAccount[], byUser: {} };
  }

  if (value && typeof value === "object") {
    const file = value as AccountsFile;
    return {
      demo: Array.isArray(file.demo) ? file.demo : [],
      byUser:
        file.byUser && typeof file.byUser === "object" ? file.byUser : {},
    };
  }

  return { demo: [], byUser: {} };
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(
      DATA_FILE,
      JSON.stringify({ demo: [], byUser: {} }, null, 2),
      "utf-8",
    );
  }
}

function readAccountsFile(): AccountsFile {
  ensureDataDir();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    const parsed = normalizeAccountsFile(JSON.parse(raw));
    return parsed;
  } catch {
    return { demo: [], byUser: {} };
  }
}

function writeAccountsFile(file: AccountsFile): void {
  ensureDataDir();
  const normalized = normalizeAccountsFile(file);
  const tempFile = `${DATA_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(normalized, null, 2), "utf-8");
  renameSync(tempFile, DATA_FILE);
}

export function readAccounts(userId?: string): StoredAccount[] {
  const parsed = readAccountsFile();
  if (userId) {
    return parsed.byUser?.[userId] || [];
  }

  return parsed.demo || [];
}

export function writeAccounts(
  accounts: StoredAccount[],
  userId?: string,
): void {
  const parsed = readAccountsFile();

  if (userId) {
    parsed.byUser = parsed.byUser || {};
    parsed.byUser[userId] = accounts;
  } else {
    parsed.demo = accounts;
  }

  writeAccountsFile(parsed);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
