// Provider-agnostic AI client contract. Every provider (Anthropic, OpenAI,
// Google, DeepSeek - see ./providers) implements this same interface, so the
// rest of the app (generateStructured and everything built on it) never
// depends on any one vendor's SDK types.

export type ModelTier = 'smart' | 'fast';

export const TIER_SMART: ModelTier = 'smart';
export const TIER_FAST: ModelTier = 'fast';

export interface ChatMessage {
  role: 'user';
  content: string;
}

export interface ToolMessageRequest {
  system: string;
  messages: ChatMessage[];
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  /** Which quality/cost tier to use - each provider maps this to its own
   * concrete model id (see providers/*.ts). Defaults to 'smart'. */
  tier?: ModelTier;
}

export interface AiClient {
  createToolMessage(request: ToolMessageRequest): Promise<unknown>;
}

/** Resolves the AiClient for the user's currently selected provider, read
 * fresh on every call so a provider switch takes effect immediately. */
export type AiClientResolver = () => AiClient;
