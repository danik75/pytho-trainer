import type {
  ExamGradingGeneration,
  ExerciseGeneration,
  TheoryGeneration,
} from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { insertCurriculum } from '../db/repositories/curricula';
import { insertTrack } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExercise } from '../db/repositories/exercises';
import { insertExamQuestion } from '../db/repositories/examQuestions';
import {
  insertMasteryRecord,
  getMasteryRecordByTopic,
  updateMasteryAfterEvaluation,
} from '../db/repositories/mastery';
import { insertRoadmapEntry, getRoadmapEntryByTopic } from '../db/repositories/roadmap';
import { InvalidStateError, NotFoundError } from '../errors';
import { submitExam } from './submitExam';

function setupTheoryTopic(db: ReturnType<typeof createTestDb>) {
  ensureLocalUser(db);
  const curriculum = insertCurriculum(db, {
    userId: LOCAL_USER_ID,
    title: 'C',
    summary: 'S',
    rawAiResponse: '{}',
  });
  const track = insertTrack(db, {
    curriculumId: curriculum.id,
    kind: 'foundations',
    slug: 'foundations',
    title: 'Foundations',
    description: 'D',
    trackOrder: 0,
  });
  const topic = insertTopic(db, {
    trackId: track.id,
    orderIndex: 0,
    title: 'Recursion',
    description: 'Functions calling themselves',
    learningObjectives: ['Write a recursive function'],
    difficulty: 'core',
  });
  const nextTopic = insertTopic(db, {
    trackId: track.id,
    orderIndex: 1,
    title: 'Sorting',
    description: 'Sorting algorithms',
    learningObjectives: ['Implement bubble sort'],
    difficulty: 'core',
  });
  insertMasteryRecord(db, topic.id);
  insertMasteryRecord(db, nextTopic.id);
  insertRoadmapEntry(db, {
    curriculumId: curriculum.id,
    topicId: topic.id,
    sequenceIndex: 0,
    status: 'in_progress',
  });
  insertRoadmapEntry(db, {
    curriculumId: curriculum.id,
    topicId: nextTopic.id,
    sequenceIndex: 1,
    status: 'locked',
  });
  const session = insertStudySession(db, {
    topicId: topic.id,
    sessionType: 'theory',
    sessionNumber: 1,
    explanationMd: '# Recursion',
  });
  const question = insertExamQuestion(db, {
    sessionId: session.id,
    questionMd: 'What stops recursion?',
    questionType: 'short_answer',
    choices: null,
    correctAnswer: 'The base case.',
    gradingNotes: 'Accept any description of a stopping condition.',
  });
  return { topic, nextTopic, session, question };
}

const NEXT_EXERCISE: ExerciseGeneration = {
  prompt: 'Write a recursive factorial function.',
  starterCode: '',
  conceptsMd: 'Recursion: a function that calls itself.',
  difficulty: 'core',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'factorial_5', functionName: 'factorial', args: [5], expected: 120 }],
};

const FOLLOWUP_THEORY: TheoryGeneration = {
  explanationMd: '# Base cases, revisited',
  examQuestions: [
    {
      questionMd: 'Try again: what stops recursion?',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'The base case.',
      gradingNotes: 'Accept any description of a stopping condition.',
    },
  ],
};

describe('submitExam', () => {
  it('throws NotFoundError for an unknown session', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient();
    await expect(submitExam(db, aiClient, 'missing', {})).rejects.toThrow(NotFoundError);
  });

  it('throws InvalidStateError when the session is not a theory session', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const curriculum = insertCurriculum(db, {
      userId: LOCAL_USER_ID,
      title: 'C',
      summary: 'S',
      rawAiResponse: '{}',
    });
    const track = insertTrack(db, {
      curriculumId: curriculum.id,
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'D',
      trackOrder: 0,
    });
    const topic = insertTopic(db, {
      trackId: track.id,
      orderIndex: 0,
      title: 'Functions',
      description: 'D',
      learningObjectives: [],
      difficulty: 'intro',
    });
    const exerciseSession = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    insertExercise(db, {
      sessionId: exerciseSession.id,
      prompt: 'p',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });
    const aiClient = createFakeAiClient();

    await expect(submitExam(db, aiClient, exerciseSession.id, {})).rejects.toThrow(
      InvalidStateError,
    );
  });

  it('passes the exam, clears weak spots, and generates the next exercise in a new session', async () => {
    const db = createTestDb();
    const { topic, session, question } = setupTheoryTopic(db);
    const grading: ExamGradingGeneration = {
      score: 0.9,
      overallFeedback: 'Great job.',
      perQuestionFeedback: { [question.id]: 'Correct.' },
      suggestedMasteryScore: 0.85,
    };
    const aiClient = createFakeAiClient();
    aiClient.enqueue(grading);
    aiClient.enqueue(NEXT_EXERCISE);

    const result = await submitExam(db, aiClient, session.id, {
      [question.id]: 'The base case.',
    });

    expect(result.decision).toBe('next_exercise');
    expect(result.examAttempt.score).toBe(0.9);
    expect(result.masteryRecord.weakSpots).toEqual([]);
    expect(result.nextExercise?.prompt).toBe(NEXT_EXERCISE.prompt);
    expect(result.theorySession).toBeNull();
    expect(getMasteryRecordByTopic(db, topic.id)?.attemptsCount).toBe(1);
  });

  it('advances the topic and unlocks the next roadmap entry once mastered', async () => {
    const db = createTestDb();
    const { topic, nextTopic, session, question } = setupTheoryTopic(db);
    const grading: ExamGradingGeneration = {
      score: 0.95,
      overallFeedback: 'Excellent.',
      perQuestionFeedback: { [question.id]: 'Correct.' },
      suggestedMasteryScore: 0.95,
    };
    const aiClient = createFakeAiClient();

    aiClient.enqueue(grading);
    aiClient.enqueue(NEXT_EXERCISE);
    const first = await submitExam(db, aiClient, session.id, { [question.id]: 'The base case.' });
    expect(first.decision).toBe('next_exercise');

    // Take the exam again via a freshly-created theory session is unrealistic
    // (exams belong to one session), so simulate the second pass being graded
    // through the same session id - decideNextStep only needs the mastery
    // record's evolving state, which submitExam reads fresh each call.
    aiClient.enqueue(grading);
    const second = await submitExam(db, aiClient, session.id, {
      [question.id]: 'The base case.',
    });

    expect(second.decision).toBe('advance_topic');
    expect(getMasteryRecordByTopic(db, topic.id)?.status).toBe('mastered');
    expect(getRoadmapEntryByTopic(db, topic.id)?.status).toBe('mastered');
    expect(getRoadmapEntryByTopic(db, nextTopic.id)?.status).toBe('available');
  });

  it('inserts another theory session when the exam is failed and the weak spot persists', async () => {
    const db = createTestDb();
    const { topic, session, question } = setupTheoryTopic(db);
    // Simulate this theory session having been triggered after a prior
    // struggle that already identified a weak spot on this topic.
    updateMasteryAfterEvaluation(db, topic.id, {
      masteryScore: 0.3,
      attemptsCount: 1,
      consecutiveSuccesses: 0,
      weakSpots: ['recursive base cases'],
      status: 'in_progress',
    });

    const failingGrading: ExamGradingGeneration = {
      score: 0.4,
      overallFeedback: 'Needs more practice.',
      perQuestionFeedback: { [question.id]: 'Not quite.' },
      suggestedMasteryScore: 0.3,
    };
    const aiClient = createFakeAiClient();
    aiClient.enqueue(failingGrading);
    aiClient.enqueue(FOLLOWUP_THEORY);

    const result = await submitExam(db, aiClient, session.id, {
      [question.id]: 'I do not know',
    });

    expect(result.decision).toBe('insert_theory_session');
    expect(result.nextExercise).toBeNull();
    expect(result.theorySession?.session.explanationMd).toBe(FOLLOWUP_THEORY.explanationMd);
    expect(getMasteryRecordByTopic(db, topic.id)?.weakSpots).toEqual(['recursive base cases']);
  });
});
