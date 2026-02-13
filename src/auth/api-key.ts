import { loadAuth, saveApiKeyAuth } from './storage.js';

export async function loginWithApiKey(
  apiKey: string
): Promise<{ success: boolean; message: string }> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { success: false, message: 'API key cannot be empty' };
  }

  try {
    await saveApiKeyAuth(apiKey.trim());
    return { success: true, message: 'Successfully authenticated with API key' };
  } catch (error) {
    return {
      success: false,
      message: `Failed to save API key: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function checkApiKeyAuth(): Promise<{ authenticated: boolean; type: string }> {
  const auth = await loadAuth();

  if (auth.type === 'api-key') {
    return { authenticated: true, type: 'api-key' };
  }

  if (auth.type === 'oauth') {
    return { authenticated: true, type: 'oauth' };
  }

  return { authenticated: false, type: 'none' };
}
