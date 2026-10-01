import type Database from 'better-sqlite3';
import type { AiClient } from '../ai/client';
import { generateExercise } from '../ai/exercises';
import { getTopic } from '../db/repositories/topics';
import { getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { getMasteryRecordByTopic } from '../db/repositories/mastery';
import { countSessionsForTopic, insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { InvalidStateError, NotFoundError } from '../errors';
import type { StartTopicResult } from './startTopic';

/**
 * Generates an extra, deliberately harder exercise for a topic the student
 * has already mastered, for students who want to push their mastery score
 * further rather than just moving on. Does not touch roadmap status (the
 * topic stays mastered, and anything it unlocked stays unlocked) - only the
 * mastery record's score/attempts evolve as normal submissions come in.
 */
export async function requestAdditionalPractice(
  db: Database.Database,
  aiClient: AiClient,
  topicId: string,
): Promise<StartTopicResult> {
  const topic = getTopic(db, topicId);
  if (!topic) throw new NotFoundError(`Topic ${topicId} not found`);

  const roadmapEntry = getRoadmapEntryByTopic(db, topicId);
  if (roadmapEntry?.status !== 'mastered') {
    throw new InvalidStateError(
      `Topic ${topicId} is not mastered yet - finish it before requesting extra practice`,
    );
  }

  const mastery = getMasteryRecordByTopic(db, topicId);
  const sessionNumber = countSessionsForTopic(db, topicId) + 1;
  const session = insertStudySession(db, {
    topicId,
    sessionType: 'exercise',
    sessionNumber,
  });

  const generation = await generateExercise(aiClient, {
    topicTitle: topic.title,
    topicDescription: topic.description,
    learningObjectives: topic.learningObjectives,
    difficulty: 'advanced',
    weakSpots: mastery?.weakSpots ?? [],
    recentExercisePrompts: [],
    stretch: true,
  });

  const exercise = insertExercise(db, {
    sessionId: session.id,
    prompt: generation.prompt,
    starterCode: generation.starterCode,
    conceptsMd: generation.conceptsMd,
    difficulty: generation.difficulty,
    targetWeakSpots: generation.targetWeakSpots,
    hiddenTests: generation.hiddenTests,
    rawAiResponse: JSON.stringify(generation),
  });

  return { session, exercise };
}
