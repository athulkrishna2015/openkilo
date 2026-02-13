import fs from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const CONFIG_DIR = path.join(homedir(), '.config', 'openkilo');
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');

interface StoredAuth {
  version: number;
  type: 'api-key' | 'oauth';
  apiKey?: string;
  oauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    email?: string;
  };
  addedAt: number;
  lastUsed: number;
}

interface AuthStorage {
  version: number;
  auth: StoredAuth | null;
}

export type AuthDetails =
  | { type: 'none' }
  | { type: 'api-key'; apiKey: string }
  | { type: 'oauth'; accessToken: string; refreshToken: string; expiresAt: number; email?: string };

export async function loadAuth(): Promise<AuthDetails> {
  try {
    const content = await fs.readFile(AUTH_FILE, 'utf-8');
    const storage = JSON.parse(content) as AuthStorage;

    if (!storage.auth) {
      return { type: 'none' };
    }

    const auth = storage.auth;

    if (auth.type === 'api-key' && auth.apiKey) {
      return { type: 'api-key', apiKey: auth.apiKey };
    }

    if (auth.type === 'oauth' && auth.oauth) {
      return {
        type: 'oauth',
        accessToken: auth.oauth.accessToken,
        refreshToken: auth.oauth.refreshToken,
        expiresAt: auth.oauth.expiresAt,
        email: auth.oauth.email,
      };
    }

    return { type: 'none' };
  } catch {
    return { type: 'none' };
  }
}

export async function saveApiKeyAuth(apiKey: string): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const storage: AuthStorage = {
    version: 1,
    auth: {
      version: 1,
      type: 'api-key',
      apiKey,
      addedAt: Date.now(),
      lastUsed: Date.now(),
    },
  };

  await fs.writeFile(AUTH_FILE, JSON.stringify(storage, null, 2));
}

export async function saveOAuthAuth(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  email?: string
): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const storage: AuthStorage = {
    version: 1,
    auth: {
      version: 1,
      type: 'oauth',
      oauth: {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        email,
      },
      addedAt: Date.now(),
      lastUsed: Date.now(),
    },
  };

  await fs.writeFile(AUTH_FILE, JSON.stringify(storage, null, 2));
}

export async function updateOAuthTokens(accessToken: string, expiresIn: number): Promise<void> {
  const current = await loadAuth();
  if (current.type !== 'oauth') {
    throw new Error('No OAuth auth to update');
  }

  await saveOAuthAuth(accessToken, current.refreshToken, expiresIn, current.email);
}

export async function clearAuth(): Promise<void> {
  try {
    await fs.unlink(AUTH_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await loadAuth();
  return auth.type !== 'none';
}

export function isTokenExpired(expiresAt: number, bufferSeconds = 60): boolean {
  return Date.now() >= expiresAt - bufferSeconds * 1000;
}
