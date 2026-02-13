import type { Plugin } from '@opencode-ai/plugin';
import { isAuthenticated } from './auth/index.js';
import { getAllModels, getFreeModels, getModels } from './registry.js';
import {
  kiloLoginTool,
  kiloLogoutTool,
  kiloModelsTool,
  kiloRefreshTool,
  kiloStatusTool,
} from './tools/index.js';
import { transformToOpenCodeModels } from './transform.js';

export const openkilo: Plugin = async () => {
  return {
    tool: {
      kilo_login: kiloLoginTool,
      kilo_logout: kiloLogoutTool,
      kilo_status: kiloStatusTool,
      kilo_refresh: kiloRefreshTool,
      kilo_models: kiloModelsTool,
    },

    async config(config) {
      config.provider = config.provider ?? {};

      try {
        const models = await getModels(false);
        const authenticated = await isAuthenticated();

        const filteredModels = authenticated ? getAllModels(models) : getFreeModels(models);
        const openCodeModels = transformToOpenCodeModels(filteredModels);

        config.provider.openkilo = {
          name: 'OpenKilo',
          npm: '@openrouter/ai-sdk-provider',
          options: { 
            baseURL: 'https://api.kilo.ai/api/openrouter/',
            apiKey: 'anonymous',
          },
          models: openCodeModels,
        };
      } catch (error) {
        console.error('[OpenKilo] Failed to load models:', error);
      }
    },
  };
};

export default openkilo;
