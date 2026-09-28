import Anthropic from '@anthropic-ai/sdk';

// Two tiers: Sonnet for tasks where generation quality directly matters
// (curriculum/exercise/theory content, since bad output means broken
// exercises or confusing lessons), Haiku for everything else (grading,
// narrative summaries, chat) where a cheaper model is plenty and these calls
// are frequent enough that the model choice meaningfully affects API cost.
export const SONNET_MODEL = 'claude-sonnet-5';
export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MODEL = SONNET_MODEL;
const DEFAULT_MAX_TOKENS = 4096;
// Anthropic.messages.create already retries transient HTTP failures
// (429/5xx/connection errors) internally via its own maxRetries option, so
// this only needs to cover the separate case of the model replying without
// using the forced tool at all.
const MAX_TOOL_USE_ATTEMPTS = 2;

export interface ToolMessageRequest {
  system: string;
  messages: Anthropic.MessageParam[];
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  model?: string;
}

/**
 * Thin wrapper around the Anthropic SDK. Callers depend on this interface
 * (not the concrete SDK) so AI calls can be replaced with a test double.
 */
export interface AiClient {
  createToolMessage(request: ToolMessageRequest): Promise<unknown>;
}

export function createAnthropicClient(apiKey: string): AiClient {
  const anthropic = new Anthropic({ apiKey });

  return {
    async createToolMessage(request: ToolMessageRequest): Promise<unknown> {
      for (let attempt = 1; attempt <= MAX_TOOL_USE_ATTEMPTS; attempt++) {
        const response = await anthropic.messages.create({
          model: request.model ?? DEFAULT_MODEL,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          system: request.system,
          messages: request.messages,
          tools: [
            {
              name: request.toolName,
              description: request.toolDescription,
              input_schema: request.inputSchema as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: 'tool', name: request.toolName },
        });

        const toolUse = response.content.find(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );
        if (toolUse) return toolUse.input;
      }

      throw new Error(
        `Model response did not include the expected tool_use block after ${MAX_TOOL_USE_ATTEMPTS} attempts`,
      );
    },
  };
}
