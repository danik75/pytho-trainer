import { z } from 'zod';
import { exerciseHelpAnswerSchema, type ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { TIER_FAST, type AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  ANALYZE_RESULT_SYSTEM_PROMPT,
  buildAnalyzeResultUserMessage,
  type AnalyzeResultInput,
} from './promptBuilders';

const TOOL_NAME = 'explain_run_result';
const TOOL_DESCRIPTION =
  "Explain a student's run/submission output (stdout, stderr, and test results) in plain language.";
const JSON_SCHEMA = z.toJSONSchema(exerciseHelpAnswerSchema);

export async function analyzeExecutionResult(
  aiClient: AiClient,
  input: AnalyzeResultInput,
): Promise<ExerciseHelpAnswerGeneration> {
  return generateStructured(aiClient, {
    system: ANALYZE_RESULT_SYSTEM_PROMPT,
    userMessage: buildAnalyzeResultUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: exerciseHelpAnswerSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 1536,
    tier: TIER_FAST,
  });
}
