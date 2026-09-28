import { z } from 'zod';
import { examGradingSchema, type ExamGradingGeneration } from '@pytho-trainer/shared';
import type { AiClient } from './client';
import { generateStructured } from './generateStructured';
import {
  EXAM_GRADING_SYSTEM_PROMPT,
  buildExamGradingUserMessage,
  type ExamGradingInput,
} from './promptBuilders';

const TOOL_NAME = 'grade_exam';
const TOOL_DESCRIPTION =
  "Grade a student's exam attempt for a theory session, combining deterministic multiple-choice results with AI judgment of short-answer questions.";
const JSON_SCHEMA = z.toJSONSchema(examGradingSchema);

export async function gradeExam(
  aiClient: AiClient,
  input: ExamGradingInput,
): Promise<ExamGradingGeneration> {
  return generateStructured(aiClient, {
    system: EXAM_GRADING_SYSTEM_PROMPT,
    userMessage: buildExamGradingUserMessage(input),
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    schema: examGradingSchema,
    jsonSchema: JSON_SCHEMA as Record<string, unknown>,
    maxTokens: 2048,
  });
}
