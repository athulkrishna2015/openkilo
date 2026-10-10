import { Schema } from 'effect';
import { clearAuth, isAuthenticated, loginWithApiKey, loginWithOAuth } from '../auth/index.js';
import { isTokenExpired, loadAuth } from '../auth/storage.js';

const text = (content: string) => ({ content });

export const kiloLoginTool = {
  description: 'Authenticate with Kilo to access paid models using an API key or OAuth browser flow.',
  input: Schema.Struct({
    method: Schema.optional(Schema.Literals(['oauth', 'api-key'])),
    apiKey: Schema.optional(Schema.String),
  }),
  async execute(args: { method?: 'oauth' | 'api-key'; apiKey?: string }) {
    if (args.method === 'api-key') {
      if (!args.apiKey) return text('Error: API key is required when using api-key method.');
      const result = await loginWithApiKey(args.apiKey);
      return text(result.success ? `✓ ${result.message}\n\nAll Kilo models are available.` : `✗ ${result.message}`);
    }
    const result = await loginWithOAuth();
    return text(result.success ? `✓ ${result.message}\n\nAll Kilo models are available.` : `✗ ${result.message}`);
  },
};

export const kiloLogoutTool = {
  description: 'Clear stored Kilo authentication credentials.',
  input: Schema.Struct({}),
  async execute() {
    const wasAuthenticated = await isAuthenticated();
    await clearAuth();
    return text(wasAuthenticated ? '✓ Logged out. Free models remain available.' : 'No authentication was stored.');
  },
};

export const kiloStatusTool = {
  description: 'Check Kilo authentication status.',
  input: Schema.Struct({}),
  async execute() {
    const auth = await loadAuth();
    if (auth.type === 'api-key') return text('✓ Authenticated with API key. All Kilo models are available.');
    if (auth.type === 'oauth') {
      const expired = isTokenExpired(auth.expiresAt) ? ' (token expired, will refresh on use)' : '';
      return text(`✓ Authenticated as ${auth.email ?? 'unknown'}${expired}. All Kilo models are available.`);
    }
    return text('✗ Not authenticated. Free models are available without login.');
  },
};
