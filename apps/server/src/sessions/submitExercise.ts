import type Database from 'better-sqlite3';
import type {
  Exercise,
  ExamQuestion,
  MasteryRecord,
  StudySession,
  Submission,
} from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { evaluateSubmission } from '../ai/evaluation';
import { generateExercise } from '../ai/exercises';
import { generateTheorySession } from '../ai/theory';
import { getExercise, insertExercise, listExercisesBySession } from '../db/repositories/exercises';
import { insertExamQuestion } from '../db/repositories/examQuestions';
import { getStudySession, insertStudySession } from '../db/repositories/sessions';
import { getTopic } from '../db/repositories/topics';
import {
  getRoadmapEntryByTopic,
  markRoadmapEntryMastered,
  unlockNextRoadmapEntry,
} from '../db/repositories/roadmap';
import { getMasteryRecordByTopic, updateMasteryAfterEvaluation } from '../db/repositories/mastery';
import { insertSubmission } from '../db/repositories/submissions';
import { runSubmission, type SandboxConfig } from '../sandbox/runner';
import { decideNextStep, type SessionDecision } from '../orchestration/sessionEngine';
import { NotFoundError } from '../errors';

export interface TheorySessionResult {
  session: StudySession;
  examQuestions: ExamQuestion[];
}

export interface SubmitExerciseResult {
  submission: Submission;
  masteryRecord: MasteryRecord;
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
}

/**
 * Runs a submission through the sandbox, has the AI evaluate it alongside
 * the deterministic test results, then applies the mastery engine's
 * decision: generate the next exercise, insert a theory session for a
 * persistent conceptual gap, advance the roadmap, or flag the topic as
 * struggling. AI calls happen before the (synchronous) persistence
 * transaction, since better-sqlite3 transactions can't await.
 */
export async function submitExercise(
  db: Database.Database,
  aiClient: AiClient,
  sandboxConfig: SandboxConfig,
  exerciseId: string,
  code: string,
): Promise<SubmitExerciseResult> {
  const exercise = getExercise(db, exerciseId);
  if (!exercise) throw new NotFoundError(`Exercise ${exerciseId} not found`);

  const session = getStudySession(db, exercise.sessionId);
  if (!session) throw new NotFoundError(`Session ${exercise.sessionId} not found`);

  const topic = getTopic(db, session.topicId);
  if (!topic) throw new NotFoundError(`Topic ${session.topicId} not found`);

  const currentMastery = getMasteryRecordByTopic(db, session.topicId);
  if (!currentMastery) {
    throw new NotFoundError(`Mastery record for topic ${session.topicId} not found`);
  }

  const execution = await runSubmission(code, exercise.hiddenTests, sandboxConfig);

  const evaluation = await evaluateSubmission(aiClient, {
    exercisePrompt: exercise.prompt,
    code,
    stdout: execution.stdout,
    stderr: execution.stderr,
    testResults: execution.testResults,
  });

  const { nextState, decision, status } = decideNextStep(
    {
      masteryScore: currentMastery.masteryScore,
      attemptsCount: currentMastery.attemptsCount,
      consecutiveSuccesses: currentMastery.consecutiveSuccesses,
      weakSpots: currentMastery.weakSpots,
    },
    {
      correct: evaluation.correct,
      suggestedMasteryScore: evaluation.suggestedMasteryScore,
      identifiedWeakSpots: evaluation.identifiedWeakSpots,
    },
  );

  const nextExerciseGeneration =
    decision === 'next_exercise'
      ? await generateExercise(aiClient, {
          topicTitle: topic.title,
          topicDescription: topic.description,
          learningObjectives: topic.learningObjectives,
          difficulty: topic.difficulty,
          weakSpots: nextState.weakSpots,
          recentExercisePrompts: listExercisesBySession(db, session.id).map((ex) => ex.prompt),
        })
      : null;

  const theoryGeneration =
    decision === 'insert_theory_session'
      ? await generateTheorySession(aiClient, {
          topic: topic.title,
          context: `${topic.description}\nLearning objectives: ${topic.learningObjectives.join('; ')}`,
          focusAreas: nextState.weakSpots,
        })
      : null;

  const persist = db.transaction(() => {
    const submission = insertSubmission(db, {
      exerciseId,
      code,
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode,
      timedOut: execution.timedOut,
      testResults: execution.testResults,
      aiEvaluation: evaluation,
      masteryScoreAfter: nextState.masteryScore,
    });

    const masteryRecord = updateMasteryAfterEvaluation(db, session.topicId, {
      masteryScore: nextState.masteryScore,
      attemptsCount: nextState.attemptsCount,
      consecutiveSuccesses: nextState.consecutiveSuccesses,
      weakSpots: nextState.weakSpots,
      status,
    });

    if (decision === 'advance_topic') {
      markRoadmapEntryMastered(db, session.topicId);
      const roadmapEntry = getRoadmapEntryByTopic(db, session.topicId);
      if (roadmapEntry) {
        unlockNextRoadmapEntry(db, roadmapEntry.curriculumId, roadmapEntry.sequenceIndex);
      }
    }

    let nextExercise: Exercise | null = null;
    if (nextExerciseGeneration) {
      nextExercise = insertExercise(db, {
        sessionId: session.id,
        prompt: nextExerciseGeneration.prompt,
        starterCode: nextExerciseGeneration.starterCode,
        conceptsMd: nextExerciseGeneration.conceptsMd,
        difficulty: nextExerciseGeneration.difficulty,
        targetWeakSpots: nextExerciseGeneration.targetWeakSpots,
        hiddenTests: nextExerciseGeneration.hiddenTests,
        rawAiResponse: JSON.stringify(nextExerciseGeneration),
      });
    }

    let theorySession: TheorySessionResult | null = null;
    if (theoryGeneration) {
      const newSession = insertStudySession(db, {
        topicId: session.topicId,
        sessionType: 'theory',
        sessionNumber: session.sessionNumber + 1,
        explanationMd: theoryGeneration.explanationMd,
      });
      const examQuestions = theoryGeneration.examQuestions.map((q) =>
        insertExamQuestion(db, {
          sessionId: newSession.id,
          questionMd: q.questionMd,
          questionType: q.questionType,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          gradingNotes: q.gradingNotes,
          rawAiResponse: JSON.stringify(q),
        }),
      );
      theorySession = { session: newSession, examQuestions };
    }

    return { submission, masteryRecord, nextExercise, theorySession };
  });

  const { submission, masteryRecord, nextExercise, theorySession } = persist();

  return { submission, masteryRecord, decision, nextExercise, theorySession };
}
