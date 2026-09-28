import { z } from 'zod';
import { AiGenerationError } from '../errors';
import type { AiClient } from './client';

export interface StructuredGenerationRequest<T> {
  system: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Calls the model with a forced tool_choice and validates the result against
 * the given Zod schema. On a validation failure, retries once with the
 * validation errors folded back into the prompt (a self-correction loop)
 * before failing loudly - the model's raw output is never coerced or
 * persisted unvalidated.
 */
export async function generateStructured<T>(
  aiClient: AiClient,
  request: StructuredGenerationRequest<T>,
): Promise<T> {
  const attempt = async (userMessage: string): Promise<unknown> =>
    aiClient.createToolMessage({
      system: request.system,
      messages: [{ role: 'user', content: userMessage }],
      toolName: request.toolName,
      toolDescription: request.toolDescription,
      inputSchema: request.jsonSchema,
      maxTokens: request.maxTokens,
    });

  const firstOutput = await attempt(request.userMessage);
  const firstResult = request.schema.safeParse(firstOutput);
  if (firstResult.success) return firstResult.data;

  const correctionMessage = `${request.userMessage}\n\nNote: a previous attempt to call the "${request.toolName}" tool returned data that failed validation:\n${z.prettifyError(firstResult.error)}\n\nPlease call the tool again, correcting these issues.`;

  const secondOutput = await attempt(correctionMessage);
  const secondResult = request.schema.safeParse(secondOutput);
  if (secondResult.success) return secondResult.data;

  throw new AiGenerationError(
    `AI response for tool "${request.toolName}" failed schema validation twice: ${z.prettifyError(secondResult.error)}`,
  );
}
