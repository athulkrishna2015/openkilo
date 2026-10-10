import { Model, Plugin, Provider } from '@opencode/plugin';
import { loadAuth } from './auth/storage.js';
import { getFreeModels, getModels } from './registry.js';

const PROVIDER_ID = Provider.ID.make('openkilo');
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function toModelDefinitions(models: Awaited<ReturnType<typeof getModels>>) {
  return getFreeModels(models).map((source) => {
    const modelID = Model.ID.make(source.id);
    const modalities = (values?: string[]) =>
      (values ?? ['text']).filter((value): value is 'text' | 'audio' | 'image' | 'video' | 'pdf' =>
        ['text', 'audio', 'image', 'video', 'pdf'].includes(value),
      );

    return {
      ...Model.Info.default(PROVIDER_ID, modelID),
      name: source.name || source.id,
      limit: {
        context: source.context_length || source.top_provider?.context_length || 128_000,
        output: source.top_provider?.max_completion_tokens || 8_192,
      },
      capabilities: {
        tools: source.supported_parameters?.includes('tools') ?? true,
        input: modalities(source.architecture?.input_modalities),
        output: modalities(source.architecture?.output_modalities),
      },
    };
  });
}

export default Plugin.define({
  id: 'openkilo',
  async setup(ctx) {
    let models = toModelDefinitions(await getModels(true));
    const auth = await loadAuth();
    await ctx.provider.transform((editor) => {
      editor.add({
        info: {
          ...Provider.Info.empty(PROVIDER_ID),
          name: 'OpenKilo',
          activation: 'enabled',
          package: '@opencode/ai/providers/openai-compatible',
          settings: {
            baseURL: 'https://api.kilo.ai/api/gateway',
            apiKey: auth.type === 'api-key' ? auth.apiKey : 'anonymous',
          },
        },
        models,
      });
    });

    const refresh = async () => {
      try {
        models = toModelDefinitions(await getModels(true));
        await ctx.provider.transform((editor) => {
          editor.models.set(PROVIDER_ID, models);
        });
        await ctx.provider.reload();
        console.info(`[OpenKilo] Refreshed ${models.length} free Kilo models`);
      } catch (error) {
        console.error('[OpenKilo] Model refresh failed; keeping last available catalog:', error);
      }
    };
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  },
});
