export type AiProvider = 'anthropic' | 'openai' | 'azure-openai' | 'google' | 'deepseek';

export interface AiProviderCatalogEntry {
  id: AiProvider;
  title: string;
}

export const AI_PROVIDER_CATALOG: readonly AiProviderCatalogEntry[] = [
  { id: 'anthropic', title: 'Claude (Anthropic)' },
  { id: 'openai', title: 'OpenAI' },
  { id: 'azure-openai', title: 'Azure OpenAI' },
  { id: 'google', title: 'Gemini (Google)' },
  { id: 'deepseek', title: 'DeepSeek' },
] as const;

export function isKnownAiProvider(value: string): value is AiProvider {
  return AI_PROVIDER_CATALOG.some((entry) => entry.id === value);
}
