import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum } from './curricula';
import { insertTrack } from './tracks';
import { insertTopic } from './topics';
import { insertStudySession } from './sessions';
import { insertExamQuestion, listExamQuestionsBySession } from './examQuestions';
import { insertExamAttempt } from './examAttempts';

function setupTheorySession(db: ReturnType<typeof createTestDb>) {
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
  return insertStudySession(db, {
    topicId: topic.id,
    sessionType: 'theory',
    sessionNumber: 1,
    explanationMd: '# Recursion',
  });
}

describe('exam_questions repository', () => {
  it('inserts a multiple-choice question and round-trips choices', () => {
    const db = createTestDb();
    const session = setupTheorySession(db);

    const question = insertExamQuestion(db, {
      sessionId: session.id,
      questionMd: 'What is a base case?',
      questionType: 'multiple_choice',
      choices: ['Stops recursion', 'Starts recursion'],
      correctAnswer: 'Stops recursion',
      gradingNotes: '',
    });

    expect(question.choices).toEqual(['Stops recursion', 'Starts recursion']);
    expect(listExamQuestionsBySession(db, session.id)).toHaveLength(1);
  });

  it('inserts a short-answer question with null choices', () => {
    const db = createTestDb();
    const session = setupTheorySession(db);

    const question = insertExamQuestion(db, {
      sessionId: session.id,
      questionMd: 'Explain a base case.',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'The stopping condition.',
      gradingNotes: 'Accept any description of a stopping condition.',
    });

    expect(question.choices).toBeNull();
  });
});

describe('exam_attempts repository', () => {
  it('inserts an attempt and round-trips feedback', () => {
    const db = createTestDb();
    const session = setupTheorySession(db);

    const attempt = insertExamAttempt(db, {
      sessionId: session.id,
      answers: { q1: 'Stops recursion' },
      score: 0.8,
      aiFeedback: { overall: 'Good job', perQuestion: { q1: 'Correct' } },
      masteryScoreAfter: 0.75,
    });

    expect(attempt.answers).toEqual({ q1: 'Stops recursion' });
    expect(attempt.aiFeedback).toEqual({ overall: 'Good job', perQuestion: { q1: 'Correct' } });
    expect(attempt.masteryScoreAfter).toBe(0.75);
  });
});
