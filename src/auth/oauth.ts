import { exec } from 'node:child_process';
import { createServer } from 'node:http';
import { promisify } from 'node:util';
import { isTokenExpired, loadAuth, saveOAuthAuth } from './storage.js';

const execAsync = promisify(exec);

const KILO_OAUTH_AUTHORIZE = 'https://kilo.ai/oauth/authorize';
const KILO_OAUTH_TOKEN = 'https://api.kilo.ai/oauth/token';
const KILO_OAUTH_CALLBACK = 'http://localhost:3456/callback';

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  email?: string;
}

function isWSL(): boolean {
  if (process.platform !== 'linux') return false;
  try {
    const { readFileSync } = require('node:fs');
    const release = readFileSync('/proc/version', 'utf8').toLowerCase();
    return release.includes('microsoft') || release.includes('wsl');
  } catch {
    return false;
  }
}

function isRemoteEnvironment(): boolean {
  if (process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION) {
    return true;
  }
  if (process.env.REMOTE_CONTAINERS || process.env.CODESPACES) {
    return true;
  }
  if (
    process.platform === 'linux' &&
    !process.env.DISPLAY &&
    !process.env.WAYLAND_DISPLAY &&
    !isWSL()
  ) {
    return true;
  }
  return false;
}

async function openBrowser(url: string): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      await execAsync(`open "${url}"`);
      return true;
    }
    if (process.platform === 'win32') {
      await execAsync(`start "" "${url}"`);
      return true;
    }
    if (isWSL()) {
      try {
        await execAsync(`wslview "${url}"`);
        return true;
      } catch {}
    }
    if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      return false;
    }
    await execAsync(`xdg-open "${url}"`);
    return true;
  } catch {
    return false;
  }
}

async function startCallbackServer(): Promise<{ code: string; state: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url?.startsWith('/callback')) return;

      const url = new URL(req.url, KILO_OAUTH_CALLBACK);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (code && state) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>You can close this window now.</p>');
        server.close();
        resolve({ code, state });
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Invalid callback</h1>');
        server.close();
        reject(new Error('Invalid OAuth callback'));
      }
    });

    server.listen(3456, () => {
      console.log('OAuth callback server listening on port 3456');
    });

    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
  const response = await fetch(KILO_OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      redirect_uri: KILO_OAUTH_CALLBACK,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${text}`);
  }

  return response.json();
}

export async function loginWithOAuth(): Promise<{ success: boolean; message: string }> {
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL(KILO_OAUTH_AUTHORIZE);
  authUrl.searchParams.set('redirect_uri', KILO_OAUTH_CALLBACK);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  const skipLocalServer = isRemoteEnvironment();

  if (skipLocalServer) {
    console.log('\nOAuth Login (Manual Mode)');
    console.log('========================\n');
    console.log('1. Open this URL in your browser:\n');
    console.log(`  ${authUrl.toString()}\n`);
    console.log('2. After authorizing, paste the callback URL here.\n');

    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const callbackUrl = await rl.question('Paste callback URL: ');
      rl.close();

      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const callbackState = url.searchParams.get('state');

      if (!code) {
        return { success: false, message: 'No code found in callback URL' };
      }
      if (callbackState !== state) {
        return { success: false, message: 'State mismatch - possible CSRF attack' };
      }

      const tokens = await exchangeCodeForTokens(code);
      await saveOAuthAuth(
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in,
        tokens.email
      );

      return {
        success: true,
        message: `Successfully authenticated as ${tokens.email ?? 'unknown user'}`,
      };
    } catch (error) {
      rl.close();
      return {
        success: false,
        message: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  const browserOpened = await openBrowser(authUrl.toString());

  if (!browserOpened) {
    console.log('\nCould not open browser automatically.');
    console.log('Please open this URL manually:\n');
    console.log(`  ${authUrl.toString()}\n`);
  } else {
    console.log('\nOpening browser for OAuth login...');
    console.log('If the browser does not open, visit:\n');
    console.log(`  ${authUrl.toString()}\n`);
  }

  try {
    const { code } = await startCallbackServer();
    const tokens = await exchangeCodeForTokens(code);
    await saveOAuthAuth(tokens.access_token, tokens.refresh_token, tokens.expires_in, tokens.email);

    return {
      success: true,
      message: `Successfully authenticated as ${tokens.email ?? 'unknown user'}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Authentication failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function refreshAccessTokenIfNeeded(): Promise<string | null> {
  const auth = await loadAuth();

  if (auth.type !== 'oauth') {
    return null;
  }

  if (!isTokenExpired(auth.expiresAt)) {
    return auth.accessToken;
  }

  try {
    const response = await fetch(KILO_OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: auth.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const tokens = (await response.json()) as OAuthTokens;
    await saveOAuthAuth(tokens.access_token, tokens.refresh_token, tokens.expires_in, tokens.email);

    return tokens.access_token;
  } catch {
    return null;
  }
}
