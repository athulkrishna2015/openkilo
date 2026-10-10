import fs from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const KILO_GATEWAY_MODELS_URL = 'https://api.kilo.ai/api/gateway/models';
const OPENKILO_CACHE_DIR = path.join(homedir(), '.cache', 'openkilo');
const OPENKILO_CACHE_FILE = path.join(OPENKILO_CACHE_DIR, 'gateway-models.json');
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface KiloGatewayModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  supported_parameters?: string[];
}

export interface KiloGatewayModelsResponse {
  data: KiloGatewayModel[];
}

export interface OpenCodeModel {
  id: string;
  name: string;
  limit?: {
    context: number;
    output: number;
  };
  modalities?: {
    input: string[];
    output: string[];
  };
}

function isFreeModel(model: KiloGatewayModel): boolean {
  const pricing = model.pricing;
  if (!pricing) return false;
  return parseFloat(pricing.prompt) === 0 && parseFloat(pricing.completion) === 0;
}

export async function fetchKiloGatewayModels(): Promise<KiloGatewayModel[]> {
  try {
    const response = await fetch(KILO_GATEWAY_MODELS_URL, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new Error(`Failed to fetch Kilo Gateway models: ${response.status}`);
    }
    const data = (await response.json()) as KiloGatewayModelsResponse;
    if (!Array.isArray(data.data)) throw new Error('Kilo Gateway returned an invalid model catalog');

    await fs.mkdir(OPENKILO_CACHE_DIR, { recursive: true });
    await fs.writeFile(
      OPENKILO_CACHE_FILE,
      JSON.stringify({
        timestamp: Date.now(),
        data: data.data,
      })
    );

    return data.data;
  } catch (error) {
    const cached = await loadCachedModels();
    if (cached) return cached;
    throw error;
  }
}

async function loadCachedModels(): Promise<KiloGatewayModel[] | null> {
  try {
    const content = await fs.readFile(OPENKILO_CACHE_FILE, 'utf-8');
    const cached = JSON.parse(content) as { timestamp: number; data: KiloGatewayModel[] };

    // Cached data is also a fallback if the gateway is temporarily unreachable.
    return cached.data;
  } catch {
    return null;
  }
}

export async function getModels(forceRefresh = false): Promise<KiloGatewayModel[]> {
  if (!forceRefresh) {
    const cached = await loadCachedModels();
    if (cached) return cached;
  }
  return fetchKiloGatewayModels();
}

export function getFreeModels(models: KiloGatewayModel[]): KiloGatewayModel[] {
  return models.filter(isFreeModel).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllModels(models: KiloGatewayModel[]): KiloGatewayModel[] {
  return models.sort((a, b) => a.name.localeCompare(b.name));
}
