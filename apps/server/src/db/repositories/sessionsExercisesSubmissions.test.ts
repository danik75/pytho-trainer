import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum } from './curricula';
import { insertTrack } from './tracks';
import { insertTopic } from './topics';
import {
  insertStudySession,
  getStudySession,
  countSessionsForTopic,
  getLatestSessionForTopic,
} from './sessions';
import {
  insertExercise,
  getExercise,
  getLatestExerciseBySession,
  listExercisesBySession,
} from './exercises';
import { insertSubmission, countFailedSubmissions } from './submissions';

function setupTopic(db: ReturnType<typeof createTestDb>) {
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
  return insertTopic(db, {
    trackId: track.id,
    orderIndex: 0,
    title: 'Functions',
    description: 'Basics',
    learningObjectives: ['Define a function'],
    difficulty: 'intro',
  });
}

describe('study_sessions repository', () => {
  it('inserts a session and counts sessions per topic', () => {
    const db = createTestDb();
    const topic = setupTopic(db);

    expect(countSessionsForTopic(db, topic.id)).toBe(0);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });

    expect(session.status).toBe('active');
    expect(countSessionsForTopic(db, topic.id)).toBe(1);
    expect(getStudySession(db, session.id)?.id).toBe(session.id);
    expect(getStudySession(db, 'missing')).toBeNull();
  });

  it('returns the most recently numbered session for a topic, or null if none exist', () => {
    const db = createTestDb();
    const topic = setupTopic(db);

    expect(getLatestSessionForTopic(db, topic.id)).toBeNull();

    insertStudySession(db, { topicId: topic.id, sessionType: 'exercise', sessionNumber: 1 });
    const second = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'theory',
      sessionNumber: 2,
    });

    expect(getLatestSessionForTopic(db, topic.id)?.id).toBe(second.id);
  });
});

describe('exercises repository', () => {
  it('inserts an exercise and round-trips JSON fields', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });

    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: 'def add(a, b):\n    pass\n',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [{ name: 'adds', functionName: 'add', args: [1, 2], expected: 3 }],
      solutionCode: 'def add(a, b):\n    return a + b\n',
      solutionExplanationMd: 'Add the two parameters.',
    });

    expect(exercise.hiddenTests).toHaveLength(1);
    expect(exercise.solutionCode).toBe('def add(a, b):\n    return a + b\n');
    expect(exercise.solutionExplanationMd).toBe('Add the two parameters.');
    expect(getExercise(db, exercise.id)?.prompt).toBe('Write add(a, b)');
    expect(getExercise(db, 'missing')).toBeNull();
    expect(getLatestExerciseBySession(db, session.id)?.id).toBe(exercise.id);
    expect(getLatestExerciseBySession(db, 'missing-session')).toBeNull();
  });

  it('defaults solutionCode and solutionExplanationMd to empty strings when omitted', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });

    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });

    expect(exercise.solutionCode).toBe('');
    expect(exercise.solutionExplanationMd).toBe('');
  });

  it('lists exercises for a session in creation order', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });

    const first = insertExercise(db, {
      sessionId: session.id,
      prompt: 'First prompt',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });
    const second = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Second prompt',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });

    expect(listExercisesBySession(db, session.id).map((e) => e.id)).toEqual([first.id, second.id]);
  });
});

describe('submissions repository', () => {
  it('inserts a submission with no AI evaluation yet', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });

    const submission = insertSubmission(db, {
      exerciseId: exercise.id,
      code: 'def add(a, b):\n    return a + b\n',
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      testResults: [{ name: 'adds', passed: true }],
    });

    expect(submission.aiEvaluation).toBeNull();
    expect(submission.masteryScoreAfter).toBeNull();
    expect(submission.timedOut).toBe(false);
    expect(submission.testResults).toEqual([{ name: 'adds', passed: true }]);
  });

  it('round-trips the AI evaluation and mastery score when provided', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });

    const evaluation = {
      correct: true,
      understandingNotes: 'Good',
      feedback: 'Nice job',
      idiomaticFeedback: '',
      suggestedMasteryScore: 0.9,
      identifiedWeakSpots: [],
    };

    const submission = insertSubmission(db, {
      exerciseId: exercise.id,
      code: 'def add(a, b):\n    return a + b\n',
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      testResults: [{ name: 'adds', passed: true }],
      aiEvaluation: evaluation,
      masteryScoreAfter: 0.9,
    });

    expect(submission.aiEvaluation).toEqual(evaluation);
    expect(submission.masteryScoreAfter).toBe(0.9);
  });

  it('counts only incorrect submissions, ignoring ones with no AI evaluation yet', () => {
    const db = createTestDb();
    const topic = setupTopic(db);
    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'exercise',
      sessionNumber: 1,
    });
    const exercise = insertExercise(db, {
      sessionId: session.id,
      prompt: 'Write add(a, b)',
      starterCode: '',
      difficulty: 'intro',
      targetWeakSpots: [],
      hiddenTests: [],
    });

    expect(countFailedSubmissions(db, exercise.id)).toBe(0);

    insertSubmission(db, {
      exerciseId: exercise.id,
      code: 'pass',
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      testResults: [],
    });
    expect(countFailedSubmissions(db, exercise.id)).toBe(0);

    const wrongEvaluation = {
      correct: false,
      understandingNotes: '',
      feedback: 'Not quite',
      idiomaticFeedback: '',
      suggestedMasteryScore: 0.2,
      identifiedWeakSpots: ['functions'],
    };
    insertSubmission(db, {
      exerciseId: exercise.id,
      code: 'def add(a, b):\n    return a - b\n',
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      testResults: [{ name: 'adds', passed: false }],
      aiEvaluation: wrongEvaluation,
    });
    insertSubmission(db, {
      exerciseId: exercise.id,
      code: 'def add(a, b):\n    return a - b\n',
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
      testResults: [{ name: 'adds', passed: false }],
      aiEvaluation: wrongEvaluation,
    });

    expect(countFailedSubmissions(db, exercise.id)).toBe(2);
  });
});
