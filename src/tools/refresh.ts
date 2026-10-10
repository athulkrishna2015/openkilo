import { Schema } from 'effect';
import { getAllModels, getFreeModels, getModels } from '../registry.js';

const text = (content: string) => ({ content });

export const kiloRefreshTool = {
  description: 'Force refresh the Kilo model registry from Kilo Gateway.',
  input: Schema.Struct({}),
  async execute() {
    try {
      const models = await getModels(true);
      return text(`✓ Model registry refreshed. Found ${getFreeModels(models).length} free models.`);
    } catch (error) {
      return text(`✗ Failed to refresh models: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};

export const kiloModelsTool = {
  description: 'List available Kilo models.',
  input: Schema.Struct({ filter: Schema.optional(Schema.Literals(['free', 'all'])) }),
  async execute(args: { filter?: 'free' | 'all' }) {
    try {
      const models = await getModels(false);
      const filtered = args.filter === 'all' ? getAllModels(models) : getFreeModels(models);
      if (!filtered.length) return text('No models found.');
      const lines = filtered.slice(0, 50).map((model) => `  ${model.id}: ${model.name}`);
      const remaining = filtered.length > 50 ? `\n  ... and ${filtered.length - 50} more` : '';
      return text(`Available models (${filtered.length}):\n${lines.join('\n')}${remaining}`);
    } catch (error) {
      return text(`✗ Failed to list models: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
