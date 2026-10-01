import { FunctionCallingMode, GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { FunctionDeclarationSchema } from '@google/generative-ai';
import type { AiClient, ToolMessageRequest } from '../client';
import type { AiModelConfig } from './types';

const DEFAULT_MAX_TOKENS = 4096;
const MAX_TOOL_USE_ATTEMPTS = 2;

/**
 * Gemini's function-calling schema is an OpenAPI subset: it has no `$schema`/
 * `additionalProperties`, and represents nullability as a separate `nullable`
 * flag rather than a JSON-Schema `type: [X, "null"]` array. This best-effort
 * converts the Zod-generated JSON Schema (shared by every other provider)
 * into that shape; unsupported keywords are simply dropped.
 */
function sanitizeSchema(schema: unknown): FunctionDeclarationSchema {
  return sanitizeNode(schema) as FunctionDeclarationSchema;
}

function sanitizeNode(node: unknown): unknown {
  if (!node || typeof node !== 'object') return node;
  const input = node as Record<string, unknown>;

  let nullable = false;
  let rawType = input.type;
  if (Array.isArray(rawType)) {
    const types = rawType.filter((t): t is string => typeof t === 'string');
    nullable = types.includes('null');
    rawType = types.find((t) => t !== 'null');
  }

  const output: Record<string, unknown> = {};
  if (typeof rawType === 'string' && isSchemaType(rawType)) {
    output.type = rawType;
  }
  if (nullable) output.nullable = true;
  if (typeof input.description === 'string') output.description = input.description;
  if (Array.isArray(input.enum)) output.enum = input.enum;
  if (Array.isArray(input.required)) output.required = input.required;

  if (input.properties && typeof input.properties === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input.properties as Record<string, unknown>)) {
      properties[key] = sanitizeNode(value);
    }
    output.properties = properties;
  }

  if (input.items) {
    output.items = sanitizeNode(input.items);
  }

  return output;
}

function isSchemaType(value: string): value is SchemaType {
  return (Object.values(SchemaType) as string[]).includes(value);
}

export function createGoogleClient(apiKey: string, models: AiModelConfig): AiClient {
  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    async createToolMessage(request: ToolMessageRequest): Promise<unknown> {
      const model = genAI.getGenerativeModel({
        model: models[request.tier ?? 'smart'],
        systemInstruction: request.system,
        tools: [
          {
            functionDeclarations: [
              {
                name: request.toolName,
                description: request.toolDescription,
                parameters: sanitizeSchema(request.inputSchema),
              },
            ],
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: [request.toolName],
          },
        },
      });

      for (let attempt = 1; attempt <= MAX_TOOL_USE_ATTEMPTS; attempt++) {
        const result = await model.generateContent({
          contents: request.messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: request.maxTokens ?? DEFAULT_MAX_TOKENS },
        });

        const call = result.response.functionCalls()?.[0];
        if (call) return call.args;
      }

      throw new Error(
        `Model response did not include the expected function call after ${MAX_TOOL_USE_ATTEMPTS} attempts`,
      );
    },
  };
}
