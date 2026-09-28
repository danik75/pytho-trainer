import { z } from 'zod';
import {
  submissionEvaluationSchema,
  type SubmissionEvaluationGeneration,
} from '@pytho-trainer/shared';
import type { AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  EVALUATION_SYSTEM_PROMPT,
  buildEvaluationUserMessage,
  type EvaluationInput,
} from './promptBuilders';

const TOOL_NAME = 'evaluate_submission';
const TOOL_DESCRIPTION =
  "Evaluate a student's code submission for a Python exercise, given the exercise prompt and deterministic test results.";
const JSON_SCHEMA = z.toJSONSchema(submissionEvaluationSchema);

export async function evaluateSubmission(
  aiClient: AiClient,
  input: EvaluationInput,
): Promise<SubmissionEvaluationGeneration> {
  return generateStructured(aiClient, {
    system: EVALUATION_SYSTEM_PROMPT,
    userMessage: buildEvaluationUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: submissionEvaluationSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 2048,
  });
}
