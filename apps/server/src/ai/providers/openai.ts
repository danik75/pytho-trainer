import type { AiClient } from '../client';
import type { AiModelConfig } from './types';
import { createOpenAiCompatibleClient } from './openaiCompatible';

export function createOpenAiClient(apiKey: string, models: AiModelConfig): AiClient {
  return createOpenAiCompatibleClient(apiKey, models);
}
