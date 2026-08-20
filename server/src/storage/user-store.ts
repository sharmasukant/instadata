import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "users.json");

export interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string | null;
  sessionToken?: string | null;
  createdAt: string;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAllUsers(): UserRecord[] {
  ensureDataDir();
  const raw = readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw) as UserRecord[];
  } catch {
    return [];
  }
}

function writeAllUsers(users: UserRecord[]): void {
  ensureDataDir();
  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const users = readAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): UserRecord | undefined {
  const users = readAllUsers();
  return users.find((u) => u.id === id);
}

export function findUserBySessionToken(
  token: string | undefined | null,
): UserRecord | undefined {
  if (!token) return undefined;
  const users = readAllUsers();
  return users.find((u) => u.sessionToken === token);
}

export function createUser(
  email: string,
  passwordHash?: string | null,
): UserRecord {
  const users = readAllUsers();
  const exists = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (exists) throw new Error("User already exists");
  const user: UserRecord = {
    id: generateId(),
    email,
    passwordHash: passwordHash || null,
    sessionToken: null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeAllUsers(users);
  return user;
}

export function saveSessionToken(userId: string, token: string | null): void {
  const users = readAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) throw new Error("User not found");
  const user = users[idx];
  if (!user) throw new Error("User not found");
  user.sessionToken = token;
  writeAllUsers(users);
}

export function updateUser(user: UserRecord): void {
  const users = readAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx === -1) {
    users.push(user);
  } else {
    users[idx] = user;
  }
  writeAllUsers(users);
}

export function hashPassword(password: string, salt?: string) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .pbkdf2Sync(password, salt, 310000, 32, "sha256")
    .toString("hex");
  return `${salt}$${derived}`;
}

export function verifyPassword(
  password: string,
  stored: string | undefined | null,
) {
  if (!stored) return false;
  const [salt, derived] = stored.split("$");
  if (!salt || !derived) return false;
  const check = crypto
    .pbkdf2Sync(password, salt, 310000, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(check, "hex"),
    Buffer.from(derived, "hex"),
  );
}
