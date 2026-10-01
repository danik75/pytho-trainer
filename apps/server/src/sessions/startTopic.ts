import type Database from 'better-sqlite3';
import type { Exercise, StudySession } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { generateExercise } from '../ai/exercises';
import { getTopic } from '../db/repositories/topics';
import { getRoadmapEntryByTopic, markRoadmapEntryInProgress } from '../db/repositories/roadmap';
import { markMasteryInProgress } from '../db/repositories/mastery';
import {
  countSessionsForTopic,
  getLatestSessionForTopic,
  insertStudySession,
} from '../db/repositories/sessions';
import { getLatestExerciseBySession, insertExercise } from '../db/repositories/exercises';
import { InvalidStateError, NotFoundError } from '../errors';

export interface StartTopicResult {
  session: StudySession;
  exercise: Exercise;
}

/**
 * Starts (or resumes) a topic: transitions it to in_progress and generates
 * its first exercise session. A topic still `locked` behind a prerequisite
 * cannot be started; a topic already `mastered` is not restarted here.
 *
 * Resuming an already-`in_progress` topic reuses its existing exercise
 * session rather than generating a new exercise - otherwise every revisit
 * (e.g. navigating away and clicking "Continue" again) would silently
 * discard whatever code the student had already written for the current
 * exercise.
 */
export async function startTopic(
  db: Database.Database,
  aiClient: AiClient,
  topicId: string,
): Promise<StartTopicResult> {
  const topic = getTopic(db, topicId);
  if (!topic) throw new NotFoundError(`Topic ${topicId} not found`);

  const roadmapEntry = getRoadmapEntryByTopic(db, topicId);
  if (roadmapEntry?.status === 'locked') {
    throw new InvalidStateError(`Topic ${topicId} is locked and cannot be started yet`);
  }
  if (roadmapEntry?.status === 'mastered') {
    throw new InvalidStateError(`Topic ${topicId} is already mastered`);
  }

  if (roadmapEntry?.status === 'available') {
    markRoadmapEntryInProgress(db, topicId);
    markMasteryInProgress(db, topicId);
  } else if (roadmapEntry?.status === 'in_progress') {
    const existingSession = getLatestSessionForTopic(db, topicId);
    if (existingSession?.sessionType === 'exercise') {
      const existingExercise = getLatestExerciseBySession(db, existingSession.id);
      if (existingExercise) {
        return { session: existingSession, exercise: existingExercise };
      }
    }
  }

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
    difficulty: topic.difficulty,
    weakSpots: [],
    recentExercisePrompts: [],
  });

  const exercise = insertExercise(db, {
    sessionId: session.id,
    prompt: generation.prompt,
    starterCode: generation.starterCode,
    conceptsMd: generation.conceptsMd,
    difficulty: generation.difficulty,
    targetWeakSpots: generation.targetWeakSpots,
    hiddenTests: generation.hiddenTests,
    solutionCode: generation.solutionCode,
    solutionExplanationMd: generation.solutionExplanationMd,
    rawAiResponse: JSON.stringify(generation),
  });

  return { session, exercise };
}
