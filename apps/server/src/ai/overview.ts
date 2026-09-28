import { z } from 'zod';
import { overviewNarrativeSchema, type OverviewNarrativeGeneration } from '@pytho-trainer/shared';
import type { AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  OVERVIEW_SYSTEM_PROMPT,
  buildOverviewUserMessage,
  type OverviewGenerationInput,
} from './promptBuilders';

const TOOL_NAME = 'generate_learning_overview_narrative';
const TOOL_DESCRIPTION =
  "Write a short narrative summary of the student's overall learning progress from the given structured data.";
const JSON_SCHEMA = z.toJSONSchema(overviewNarrativeSchema);

export async function generateOverviewNarrative(
  aiClient: AiClient,
  input: OverviewGenerationInput,
): Promise<OverviewNarrativeGeneration> {
  return generateStructured(aiClient, {
    system: OVERVIEW_SYSTEM_PROMPT,
    userMessage: buildOverviewUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: overviewNarrativeSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 1024,
  });
}
