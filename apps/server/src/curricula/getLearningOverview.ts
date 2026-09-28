import type Database from 'better-sqlite3';
import type { LearningOverview } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { generateOverviewNarrative } from '../ai/overview';
import {
  getLearningOverviewNarrative,
  upsertLearningOverviewNarrative,
} from '../db/repositories/learningOverviews';
import { computeLearningOverview } from '../orchestration/learningOverview';
import { InvalidStateError } from '../errors';
import { gatherLearningOverviewData } from './gatherLearningOverviewData';

/**
 * The structured part of the overview (levels, difficulties, next steps) is
 * always computed fresh from current data - only the narrative prose is
 * cached, since it's the one part worth not regenerating on every read.
 */
export function getLearningOverview(
  db: Database.Database,
  userId: string,
): LearningOverview | null {
  const data = gatherLearningOverviewData(db, userId);
  if (!data) return null;

  const structured = computeLearningOverview(data.topicRows, data.roadmapEntries);
  const narrative = getLearningOverviewNarrative(db);

  return {
    ...structured,
    narrativeMd: narrative.narrativeMd,
    narrativeGeneratedAt: narrative.generatedAt,
  };
}

export async function refreshLearningOverviewNarrative(
  db: Database.Database,
  aiClient: AiClient,
  userId: string,
): Promise<LearningOverview> {
  const data = gatherLearningOverviewData(db, userId);
  if (!data) {
    throw new InvalidStateError('Generate a curriculum before requesting a learning overview');
  }

  const structured = computeLearningOverview(data.topicRows, data.roadmapEntries);

  const generation = await generateOverviewNarrative(aiClient, {
    curriculumTitle: data.curriculumTitle,
    topics: structured.topics,
    difficulties: structured.difficulties,
    strugglingTopics: structured.strugglingTopics,
    nextSteps: structured.nextSteps,
  });

  const narrative = upsertLearningOverviewNarrative(db, generation.narrativeMd);

  return {
    ...structured,
    narrativeMd: narrative.narrativeMd,
    narrativeGeneratedAt: narrative.generatedAt,
  };
}
