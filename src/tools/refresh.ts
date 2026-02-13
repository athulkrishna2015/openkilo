import { tool } from '@opencode-ai/plugin';
import { getAllModels, getFreeModels, getModels } from '../registry.js';

export const kiloRefreshTool = tool({
  description: 'Force refresh the Kilo model registry from Kilo Gateway',
  args: {},
  async execute() {
    try {
      const models = await getModels(true);
      const freeModels = getFreeModels(models);

      return `✓ Model registry refreshed\n\nFound ${freeModels.length} free models available without authentication.`;
    } catch (error) {
      return `✗ Failed to refresh models: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});

export const kiloModelsTool = tool({
  description: 'List available Kilo models (free models only if not authenticated)',
  args: {
    filter: tool.schema
      .enum(['free', 'all'])
      .optional()
      .default('free')
      .describe('Show "free" models or "all" models (requires authentication)'),
  },
  async execute(args) {
    try {
      const models = await getModels(false);
      const filtered = args.filter === 'all' ? getAllModels(models) : getFreeModels(models);

      if (filtered.length === 0) {
        return 'No models found.';
      }

      const lines = filtered.slice(0, 50).map((m) => `  ${m.id}: ${m.name}`);

      const remaining = filtered.length > 50 ? `\n  ... and ${filtered.length - 50} more` : '';

      return `Available models (${filtered.length}):\n${lines.join('\n')}${remaining}`;
    } catch (error) {
      return `✗ Failed to list models: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
