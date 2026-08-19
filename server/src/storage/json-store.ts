import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { StoredAccount } from '../types/analytics.types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DATA_FILE = join(DATA_DIR, 'accounts.json');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

export function readAccounts(): StoredAccount[] {
  ensureDataDir();
  const raw = readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as StoredAccount[];
}

export function writeAccounts(accounts: StoredAccount[]): void {
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
