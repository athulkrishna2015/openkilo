import { Model, Plugin, Provider } from '@opencode/plugin';
import { loadAuth } from './auth/storage.js';
import { getAllModels, getFreeModels, getModels } from './registry.js';
import { kiloLoginTool, kiloLogoutTool, kiloStatusTool } from './tools/login.js';
import { kiloModelsTool, kiloRefreshTool } from './tools/refresh.js';

const PROVIDER_ID = Provider.ID.make('openkilo');
const KILO_BASE_URL = 'https://api.kilo.ai/api/openrouter/';

function toModelDefinitions(models: Awaited<ReturnType<typeof getModels>>) {
  return models.map((source) => {
    const model = Model.Info.default(PROVIDER_ID, Model.ID.make(source.id));
    return {
      ...model,
      modelID: model.id,
      name: source.name || source.id,
      limit: {
        context: source.context_length || source.top_provider?.context_length || 128_000,
        output: source.top_provider?.max_completion_tokens || 8_192,
      },
      capabilities: {
        ...Model.Capabilities.default(),
        tools: source.supported_parameters?.includes('tools') ?? true,
        input: (source.architecture?.input_modalities ?? ['text']).filter(
          (value): value is 'text' | 'image' => value === 'text' || value === 'image',
        ),
        output: (source.architecture?.output_modalities ?? ['text']).filter(
          (value): value is 'text' | 'image' => value === 'text' || value === 'image',
        ),
      },
    };
  });
}

async function resolveApiKey(): Promise<string> {
  const auth = await loadAuth();
  if (auth.type === 'api-key') return auth.apiKey;
  if (auth.type === 'oauth') return auth.accessToken;
  return 'anonymous';
}

export default Plugin.define({
  id: 'openkilo',
  async setup(ctx) {
    const loadDefinitions = async () => {
      const all = await getModels(false);
      const auth = await loadAuth();
      return toModelDefinitions(auth.type !== 'none' ? getAllModels(all) : getFreeModels(all));
    };

    const models = await loadDefinitions();
    const apiKey = await resolveApiKey();
    await ctx.provider.transform((editor) => {
      editor.add({
        info: {
          ...Provider.Info.empty(PROVIDER_ID),
          name: 'OpenKilo',
          package: '@openrouter/ai-sdk-provider',
          settings: { baseURL: KILO_BASE_URL, apiKey },
        },
        models,
      });
    });

    const refresh = async () => {
      try {
        const updated = toModelDefinitions(await getModels(true));
        await ctx.provider.transform((editor) => editor.models.set(PROVIDER_ID, updated));
        await ctx.provider.reload();
      } catch (error) {
        console.error(`OpenKilo model refresh failed: ${String(error)}`);
      }
    };
    const timer = setInterval(() => void refresh(), 5 * 60 * 1000);
    timer.unref?.();

    await ctx.tool.transform((editor) => {
      editor.add({ ...kiloLoginTool, name: 'kilo_login' });
      editor.add({ ...kiloLogoutTool, name: 'kilo_logout' });
      editor.add({ ...kiloStatusTool, name: 'kilo_status' });
      editor.add({ ...kiloRefreshTool, name: 'kilo_refresh' });
      editor.add({ ...kiloModelsTool, name: 'kilo_models' });
    });
    return () => clearInterval(timer);
  },
});
