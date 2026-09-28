import type Database from 'better-sqlite3';
import type { AiClient } from '../ai/client';
import { generateCurriculum } from '../ai/curriculum';
import type { CurriculumGenerationInput } from '../ai/promptBuilders';
import {
  persistGeneratedCurriculum,
  type PersistedCurriculumResult,
} from './persistGeneratedCurriculum';

export async function createCurriculumForUser(
  db: Database.Database,
  aiClient: AiClient,
  userId: string,
  input: CurriculumGenerationInput,
): Promise<PersistedCurriculumResult> {
  const generation = await generateCurriculum(aiClient, input);
  return persistGeneratedCurriculum(db, userId, generation);
}
