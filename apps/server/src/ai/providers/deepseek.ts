import type { AiClient } from '../client';
import type { AiModelConfig } from './types';
import { createOpenAiCompatibleClient } from './openaiCompatible';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/** DeepSeek's API is OpenAI-compatible, just at a different base URL. */
export function createDeepSeekClient(apiKey: string, models: AiModelConfig): AiClient {
  return createOpenAiCompatibleClient(apiKey, models, DEEPSEEK_BASE_URL);
}
