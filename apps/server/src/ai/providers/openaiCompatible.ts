import OpenAI from 'openai';
import type { AiClient, ToolMessageRequest } from '../client';
import type { AiModelConfig } from './types';

const DEFAULT_MAX_TOKENS = 4096;
const MAX_TOOL_USE_ATTEMPTS = 2;

/**
 * Shared forced-tool-call loop for any client exposing the OpenAI chat
 * completions shape - a plain `OpenAI` instance (OpenAI itself, or DeepSeek
 * via a different base URL) or an `AzureOpenAI` instance (see
 * ./azureOpenai.ts, which is scoped to a single deployment per client
 * instance rather than picking a model name per request).
 */
export async function callForcedToolUse(
  client: Pick<OpenAI, 'chat'>,
  model: string,
  request: ToolMessageRequest,
): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_TOOL_USE_ATTEMPTS; attempt++) {
    const response = await client.chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [
        { role: 'system', content: request.system },
        ...request.messages.map((m) => ({ role: m.role, content: m.content }) as const),
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: request.toolName,
            description: request.toolDescription,
            parameters: request.inputSchema,
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: request.toolName } },
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.type === 'function') {
      try {
        return JSON.parse(toolCall.function.arguments);
      } catch {
        // Fall through and retry - treat malformed JSON the same as a
        // missing tool call rather than crashing the whole request.
      }
    }
  }

  throw new Error(
    `Model response did not include the expected tool call after ${MAX_TOOL_USE_ATTEMPTS} attempts`,
  );
}

/**
 * Shared implementation for any OpenAI-compatible chat completions API
 * (OpenAI itself, and DeepSeek, which exposes the same request/response
 * shape at a different base URL) - both just need forced function calling.
 */
export function createOpenAiCompatibleClient(
  apiKey: string,
  models: AiModelConfig,
  baseURL?: string,
): AiClient {
  const client = new OpenAI({ apiKey, baseURL });

  return {
    createToolMessage: (request: ToolMessageRequest): Promise<unknown> =>
      callForcedToolUse(client, models[request.tier ?? 'smart'], request),
  };
}
