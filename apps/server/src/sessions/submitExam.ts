import type Database from 'better-sqlite3';
import type { Exercise, ExamAttempt, MasteryRecord } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { gradeExam } from '../ai/examGrading';
import { generateExercise } from '../ai/exercises';
import { generateTheorySession } from '../ai/theory';
import { gradeMultipleChoice } from '../exams/deterministicGrading';
import { insertExamAttempt } from '../db/repositories/examAttempts';
import { listExamQuestionsBySession } from '../db/repositories/examQuestions';
import {
  countSessionsForTopic,
  getStudySession,
  insertStudySession,
} from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { insertExamQuestion } from '../db/repositories/examQuestions';
import { getTopic } from '../db/repositories/topics';
import {
  getRoadmapEntryByTopic,
  markRoadmapEntryMastered,
  unlockNextRoadmapEntry,
} from '../db/repositories/roadmap';
import { getMasteryRecordByTopic, updateMasteryAfterEvaluation } from '../db/repositories/mastery';
import { decideNextStep, type SessionDecision } from '../orchestration/sessionEngine';
import { InvalidStateError, NotFoundError } from '../errors';
import type { TheorySessionResult } from './submitExercise';

const PASSING_SCORE = 0.7;

export interface SubmitExamResult {
  examAttempt: ExamAttempt;
  masteryRecord: MasteryRecord;
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
}

/**
 * Grades a theory session's exam (multiple-choice deterministically, short
 * answers by AI), then applies the same mastery engine used for coding
 * exercises so the exam's outcome feeds the same next_exercise /
 * advance_topic / insert_theory_session / flag_struggling decision.
 */
export async function submitExam(
  db: Database.Database,
  aiClient: AiClient,
  sessionId: string,
  answers: Record<string, string>,
): Promise<SubmitExamResult> {
  const session = getStudySession(db, sessionId);
  if (!session) throw new NotFoundError(`Session ${sessionId} not found`);
  if (session.sessionType !== 'theory') {
    throw new InvalidStateError(`Session ${sessionId} is not a theory session`);
  }

  const topic = getTopic(db, session.topicId);
  if (!topic) throw new NotFoundError(`Topic ${session.topicId} not found`);

  const currentMastery = getMasteryRecordByTopic(db, session.topicId);
  if (!currentMastery) {
    throw new NotFoundError(`Mastery record for topic ${session.topicId} not found`);
  }

  const questions = listExamQuestionsBySession(db, sessionId);

  const gradingQuestions = questions.map((question) => {
    const userAnswer = answers[question.id] ?? '';
    return {
      id: question.id,
      questionMd: question.questionMd,
      questionType: question.questionType,
      userAnswer,
      correctAnswer: question.correctAnswer,
      gradingNotes: question.gradingNotes,
      isCorrectDeterministic:
        question.questionType === 'multiple_choice'
          ? gradeMultipleChoice(question.correctAnswer, userAnswer)
          : undefined,
    };
  });

  const grading = await gradeExam(aiClient, { questions: gradingQuestions });
  const passed = grading.score >= PASSING_SCORE;

  const { nextState, decision, status } = decideNextStep(
    {
      masteryScore: currentMastery.masteryScore,
      attemptsCount: currentMastery.attemptsCount,
      consecutiveSuccesses: currentMastery.consecutiveSuccesses,
      weakSpots: currentMastery.weakSpots,
    },
    {
      correct: passed,
      suggestedMasteryScore: grading.suggestedMasteryScore,
      identifiedWeakSpots: passed ? [] : currentMastery.weakSpots,
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
          recentExercisePrompts: [],
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
    const examAttempt = insertExamAttempt(db, {
      sessionId,
      answers,
      score: grading.score,
      aiFeedback: { overall: grading.overallFeedback, perQuestion: grading.perQuestionFeedback },
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
      const exerciseSession = insertStudySession(db, {
        topicId: session.topicId,
        sessionType: 'exercise',
        sessionNumber: countSessionsForTopic(db, session.topicId) + 1,
      });
      nextExercise = insertExercise(db, {
        sessionId: exerciseSession.id,
        prompt: nextExerciseGeneration.prompt,
        starterCode: nextExerciseGeneration.starterCode,
        difficulty: nextExerciseGeneration.difficulty,
        targetWeakSpots: nextExerciseGeneration.targetWeakSpots,
        hiddenTests: nextExerciseGeneration.hiddenTests,
        solutionCode: nextExerciseGeneration.solutionCode,
        solutionExplanationMd: nextExerciseGeneration.solutionExplanationMd,
        rawAiResponse: JSON.stringify(nextExerciseGeneration),
      });
    }

    let theorySession: TheorySessionResult | null = null;
    if (theoryGeneration) {
      const newSession = insertStudySession(db, {
        topicId: session.topicId,
        sessionType: 'theory',
        sessionNumber: countSessionsForTopic(db, session.topicId) + 1,
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

    return { examAttempt, masteryRecord, nextExercise, theorySession };
  });

  const { examAttempt, masteryRecord, nextExercise, theorySession } = persist();

  return { examAttempt, masteryRecord, decision, nextExercise, theorySession };
}
