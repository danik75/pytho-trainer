const mockExeca = jest.fn();
jest.mock('execa', () => ({ execa: mockExeca }), { virtual: true });

import { createTestDb } from './testUtils/createTestDb';
import { createFakeAiClient } from './testUtils/fakeAiClient';
import { buildApp } from './app';
import type {
  CurriculumGeneration,
  ExamGradingGeneration,
  ExerciseGeneration,
  ExerciseHelpAnswerGeneration,
  OverviewNarrativeGeneration,
  SubmissionEvaluationGeneration,
  TheoryGeneration,
} from '@pytho-trainer/shared';

const SANDBOX_CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 5000, memoryMb: 128 };

function buildTestApp(defaultAiResponse?: unknown) {
  const db = createTestDb();
  const aiClient = createFakeAiClient(defaultAiResponse);
  return {
    app: buildApp({ db, aiClients: { anthropic: aiClient }, sandboxConfig: SANDBOX_CONFIG }),
    db,
    aiClient,
  };
}

const SAMPLE_CURRICULUM: CurriculumGeneration = {
  title: 'Python for Backend Engineers',
  summary: 'Foundations plus backend-focused Python.',
  tracks: [
    {
      kind: 'foundations',
      slug: 'foundations',
      title: 'Python Foundations',
      description: 'Core language basics.',
      topics: [
        {
          title: 'Variables and Types',
          description: 'Basic data types and variables.',
          learningObjectives: ['Declare variables', 'Use core types'],
          difficulty: 'intro',
        },
      ],
    },
    {
      kind: 'domain',
      slug: 'backend',
      title: 'Backend Development',
      description: 'Server-side Python.',
      topics: [
        {
          title: 'Building APIs',
          description: 'Intro to building HTTP APIs.',
          learningObjectives: ['Build a simple API endpoint'],
          difficulty: 'core',
        },
      ],
    },
  ],
};

const SAMPLE_EXERCISE: ExerciseGeneration = {
  prompt: 'Write a function that adds two numbers.',
  starterCode: 'def add(a, b):\n    pass\n',
  conceptsMd: '# Functions\n\nUse `def` to define a function.',
  difficulty: 'intro',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 }],
  solutionCode: 'def add(a, b):\n    return a + b\n',
  solutionExplanationMd: 'Add the two parameters with `+` and return the result.',
};

const SAMPLE_EVALUATION: SubmissionEvaluationGeneration = {
  correct: true,
  understandingNotes: 'Solid.',
  feedback: 'Nice work!',
  idiomaticFeedback: '',
  suggestedMasteryScore: 0.9,
  identifiedWeakSpots: [],
};

const SAMPLE_THEORY: TheoryGeneration = {
  explanationMd: '# Functions\n\nA function is a reusable block of code.',
  examQuestions: [
    {
      questionMd: 'What keyword defines a function?',
      questionType: 'multiple_choice',
      choices: ['def', 'func', 'function'],
      correctAnswer: 'def',
      gradingNotes: '',
    },
  ],
};

const SAMPLE_EXAM_GRADING: ExamGradingGeneration = {
  score: 0.9,
  overallFeedback: 'Great job!',
  perQuestionFeedback: {},
  suggestedMasteryScore: 0.85,
};

const SAMPLE_NARRATIVE: OverviewNarrativeGeneration = {
  narrativeMd: '# Great progress so far!',
};

const SAMPLE_HELP_ANSWER: ExerciseHelpAnswerGeneration = {
  answer: 'Use the `+` operator to add the two parameters together.',
};

describe('app routes', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('GET /api/health returns ok', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/user seeds and returns the local user', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/user' });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe('local-user');
  });

  it('GET /api/domains/catalog returns the domain list', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/domains/catalog' });
    expect(response.statusCode).toBe(200);
    expect(response.json().length).toBeGreaterThan(0);
  });

  it('POST /api/onboarding updates the user profile', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { goals: 'Learn Python for ML', selectedDomains: ['ml'] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().goals).toBe('Learn Python for ML');
    expect(response.json().selectedDomains).toEqual(['ml']);
  });

  it('POST /api/onboarding rejects an invalid body', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/onboarding',
      payload: { goals: 123 },
    });
    expect(response.statusCode).toBe(400);
  });

  it('GET /api/curricula/active returns 404 before any curriculum exists', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/curricula/active' });
    expect(response.statusCode).toBe(404);
  });

  it('GET /api/roadmap returns 404 before any curriculum exists', async () => {
    const { app } = buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/roadmap' });
    expect(response.statusCode).toBe(404);
  });

  it('POST /api/curricula generates and persists a curriculum, then roadmap reflects it', async () => {
    const { app } = buildTestApp(SAMPLE_CURRICULUM);

    const createResponse = await app.inject({ method: 'POST', url: '/api/curricula' });
    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json().curriculumId).toBeTruthy();

    const activeResponse = await app.inject({ method: 'GET', url: '/api/curricula/active' });
    expect(activeResponse.statusCode).toBe(200);
    expect(activeResponse.json().title).toBe(SAMPLE_CURRICULUM.title);

    const roadmapResponse = await app.inject({ method: 'GET', url: '/api/roadmap' });
    expect(roadmapResponse.statusCode).toBe(200);
    const roadmap = roadmapResponse.json();
    expect(roadmap.tracks).toHaveLength(2);
    expect(roadmap.tracks[0].kind).toBe('foundations');
    expect(roadmap.tracks[0].topics[0].roadmapStatus).toBe('available');
    expect(roadmap.tracks[1].topics[0].roadmapStatus).toBe('locked');
  });

  it('POST /api/curricula returns 502 when the AI response never validates', async () => {
    const { app } = buildTestApp({ not: 'a valid curriculum' });
    const response = await app.inject({ method: 'POST', url: '/api/curricula' });
    expect(response.statusCode).toBe(502);
  });

  it('returns a generic 500 for an unexpected error', async () => {
    const db = createTestDb();
    const aiClient = createFakeAiClient();
    aiClient.createToolMessage = async () => {
      throw new Error('boom');
    };
    const app = buildApp({ db, aiClients: { anthropic: aiClient }, sandboxConfig: SANDBOX_CONFIG });

    const response = await app.inject({ method: 'POST', url: '/api/curricula' });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('internal_error');
  });

  it('surfaces a Fastify body-parsing error as its own status code, not a 500', async () => {
    const { app } = buildTestApp();
    // Content-Type: application/json with no body is rejected by Fastify's
    // own JSON parser before our route handler ever runs - the real browser
    // client hit this for years by always setting this header (fixed in
    // api/client.ts), so this guards the server-side fallback too.
    const response = await app.inject({
      method: 'POST',
      url: '/api/curricula',
      headers: { 'content-type': 'application/json' },
      payload: '',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('bad_request');
  });

  async function setUpCurriculumAndTopic(app: ReturnType<typeof buildApp>) {
    await app.inject({ method: 'POST', url: '/api/curricula' });
    const roadmap = (await app.inject({ method: 'GET', url: '/api/roadmap' })).json();
    const availableTopicId = roadmap.tracks[0].topics[0].topicId as string;
    const lockedTopicId = roadmap.tracks[1].topics[0].topicId as string;
    return { availableTopicId, lockedTopicId };
  }

  describe('topics, sessions, and exercise submission', () => {
    it('GET /api/topics/:topicId returns 404 for an unknown topic', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({ method: 'GET', url: '/api/topics/missing' });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/topics/:topicId/start returns 409 for a locked topic', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { lockedTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const response = await app.inject({
        method: 'POST',
        url: `/api/topics/${lockedTopicId}/start`,
      });
      expect(response.statusCode).toBe(409);
    });

    it('starts an available topic, generates its first exercise, and updates roadmap/mastery status', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      expect(startResponse.statusCode).toBe(201);
      const { session, exercise } = startResponse.json();
      expect(exercise.prompt).toBe(SAMPLE_EXERCISE.prompt);

      const topicResponse = await app.inject({
        method: 'GET',
        url: `/api/topics/${availableTopicId}`,
      });
      expect(topicResponse.json().mastery.status).toBe('in_progress');

      const sessionResponse = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}`,
      });
      expect(sessionResponse.statusCode).toBe(200);

      const currentExerciseResponse = await app.inject({
        method: 'GET',
        url: `/api/sessions/${session.id}/exercises/current`,
      });
      expect(currentExerciseResponse.statusCode).toBe(200);
      expect(currentExerciseResponse.json().id).toBe(exercise.id);
    });

    it('POST /api/topics/:topicId/reset returns 409 for a topic that has not been started yet', async () => {
      const { app } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      const response = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/reset`,
      });
      expect(response.statusCode).toBe(409);
    });

    it('POST /api/topics/:topicId/practice returns 409 for a topic that is not mastered', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      await app.inject({ method: 'POST', url: `/api/topics/${availableTopicId}/start` });

      const response = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/practice`,
      });
      expect(response.statusCode).toBe(409);
    });

    it('lets a mastered topic request extra practice, then be reset back to available', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      let exercise = startResponse.json().exercise;

      mockExeca.mockResolvedValue({
        stdout:
          '##RESULTS##' +
          JSON.stringify({
            stdout: '',
            stderr: '',
            testResults: [{ name: 'adds two numbers', passed: true }],
          }),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      // Two correct submissions in a row cross the mastery threshold.
      aiClient.enqueue(SAMPLE_EVALUATION);
      aiClient.enqueue(SAMPLE_EXERCISE);
      const first = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/submit`,
        payload: { code: 'def add(a, b):\n    return a + b\n' },
      });
      exercise = first.json().nextExercise;

      aiClient.enqueue(SAMPLE_EVALUATION);
      const second = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/submit`,
        payload: { code: 'def add(a, b):\n    return a + b\n' },
      });
      expect(second.json().decision).toBe('advance_topic');

      const roadmapAfterMastery = (await app.inject({ method: 'GET', url: '/api/roadmap' })).json();
      expect(roadmapAfterMastery.tracks[0].topics[0].roadmapStatus).toBe('mastered');

      const tougherExercise = {
        ...SAMPLE_EXERCISE,
        prompt: 'A harder follow-up exercise.',
        difficulty: 'advanced' as const,
      };
      aiClient.enqueue(tougherExercise);
      const practiceResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/practice`,
      });
      expect(practiceResponse.statusCode).toBe(201);
      expect(practiceResponse.json().exercise.prompt).toBe('A harder follow-up exercise.');

      const roadmapAfterPractice = (
        await app.inject({ method: 'GET', url: '/api/roadmap' })
      ).json();
      expect(roadmapAfterPractice.tracks[0].topics[0].roadmapStatus).toBe('mastered');

      const resetResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/reset`,
      });
      expect(resetResponse.statusCode).toBe(200);
      expect(resetResponse.json().mastery.status).toBe('not_started');
      expect(resetResponse.json().roadmapEntry.status).toBe('available');

      const roadmapAfterReset = (await app.inject({ method: 'GET', url: '/api/roadmap' })).json();
      expect(roadmapAfterReset.tracks[0].topics[0].roadmapStatus).toBe('available');
      expect(roadmapAfterReset.tracks[0].topics[0].masteryScore).toBe(0);
    });

    it('GET /api/sessions/:sessionId returns 404 for an unknown session', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({ method: 'GET', url: '/api/sessions/missing' });
      expect(response.statusCode).toBe(404);
    });

    it('GET /api/sessions/:sessionId/exercises/current returns 404 for an unknown session', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'GET',
        url: '/api/sessions/missing/exercises/current',
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/exercises/:exerciseId/submit runs the sandbox and persists the result', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { exercise } = startResponse.json();

      mockExeca.mockResolvedValue({
        stdout:
          '##RESULTS##' +
          JSON.stringify({
            stdout: '',
            stderr: '',
            testResults: [{ name: 'adds two numbers', passed: true }],
          }),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      aiClient.enqueue(SAMPLE_EVALUATION);
      aiClient.enqueue(SAMPLE_EXERCISE);
      const submitResponse = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/submit`,
        payload: { code: 'def add(a, b):\n    return a + b\n' },
      });

      expect(submitResponse.statusCode).toBe(201);
      const result = submitResponse.json();
      expect(result.submission.testResults).toEqual([{ name: 'adds two numbers', passed: true }]);
      expect(result.decision).toBe('next_exercise');
      expect(result.nextExercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
      expect(result.masteryRecord.attemptsCount).toBe(1);
    });

    it('GET /api/exercises/:exerciseId/attempts counts only incorrect submissions', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { exercise } = startResponse.json();

      const initialAttempts = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/attempts`,
      });
      expect(initialAttempts.statusCode).toBe(200);
      expect(initialAttempts.json()).toEqual({ failedAttempts: 0 });

      mockExeca.mockResolvedValue({
        stdout:
          '##RESULTS##' +
          JSON.stringify({
            stdout: '',
            stderr: '',
            testResults: [{ name: 'adds two numbers', passed: false }],
          }),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const WRONG_EVALUATION = {
        correct: false,
        understandingNotes: 'Not quite',
        feedback: 'Try again',
        idiomaticFeedback: '',
        // Above the "bad first attempt" threshold so the mastery engine
        // generates another exercise (next_exercise) rather than inserting a
        // theory session, which would need a second queued AI response.
        suggestedMasteryScore: 0.5,
        identifiedWeakSpots: ['functions'],
      };
      aiClient.enqueue(WRONG_EVALUATION);
      aiClient.enqueue(SAMPLE_EXERCISE);
      await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/submit`,
        payload: { code: 'def add(a, b):\n    return a - b\n' },
      });

      const afterOneFailure = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/attempts`,
      });
      expect(afterOneFailure.json()).toEqual({ failedAttempts: 1 });
    });

    it('GET /api/exercises/:exerciseId/attempts returns 404 for an unknown exercise', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'GET',
        url: '/api/exercises/missing/attempts',
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/exercises/:exerciseId/submit returns 404 for an unknown exercise', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/missing/submit',
        payload: { code: 'pass' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/exercises/:exerciseId/run executes code without grading or persisting a submission', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { exercise } = startResponse.json();

      mockExeca.mockResolvedValue({
        stdout:
          '##RESULTS##' +
          JSON.stringify({
            stdout: 'hello\n',
            stderr: '',
            testResults: [{ name: 'adds two numbers', passed: true }],
          }),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const requestCountBeforeRun = aiClient.requests.length;
      const runResponse = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/run`,
        payload: { code: 'def add(a, b):\n    print("hello")\n    return a + b\n' },
      });

      expect(runResponse.statusCode).toBe(200);
      const result = runResponse.json();
      expect(result.stdout).toBe('hello\n');
      expect(result.testResults).toEqual([{ name: 'adds two numbers', passed: true }]);

      // Confirms no AI evaluation/next-exercise call happened, unlike /submit.
      expect(aiClient.requests.length).toBe(requestCountBeforeRun);
    });

    it('POST /api/exercises/:exerciseId/run returns 404 for an unknown exercise', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/missing/run',
        payload: { code: 'pass' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('exercise tutor help: starts empty, answers a question, and persists the chat history', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { exercise } = startResponse.json();

      const emptyHistory = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/help`,
      });
      expect(emptyHistory.statusCode).toBe(200);
      expect(emptyHistory.json()).toEqual([]);

      aiClient.enqueue(SAMPLE_HELP_ANSWER);
      const askResponse = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/help`,
        payload: { question: 'How do I add two numbers?', code: 'def add(a, b):\n    pass\n' },
      });
      expect(askResponse.statusCode).toBe(201);
      const messages = askResponse.json();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({ role: 'user', content: 'How do I add two numbers?' });
      expect(messages[1]).toMatchObject({ role: 'assistant', content: SAMPLE_HELP_ANSWER.answer });

      const helpToolCall = aiClient.requests.find((r) => r.toolName === 'answer_exercise_question');
      expect(helpToolCall?.messages[0]?.content).toContain('How do I add two numbers?');

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/help`,
      });
      expect(historyResponse.json()).toHaveLength(2);

      const clearResponse = await app.inject({
        method: 'DELETE',
        url: `/api/exercises/${exercise.id}/help`,
      });
      expect(clearResponse.statusCode).toBe(200);
      expect(clearResponse.json()).toEqual([]);

      const historyAfterClear = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/help`,
      });
      expect(historyAfterClear.json()).toEqual([]);
    });

    it('POST /api/exercises/:exerciseId/help returns 404 for an unknown exercise', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/missing/help',
        payload: { question: 'help?', code: '' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('analyzes a run result, persisting it into the same tutor chat thread as help', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);

      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { exercise } = startResponse.json();

      aiClient.enqueue(SAMPLE_HELP_ANSWER);
      const analyzeResponse = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/analyze-result`,
        payload: {
          code: 'def add(a, b):\n    return x\n',
          executionResult: {
            stdout: '',
            stderr: "NameError: name 'x' is not defined",
            exitCode: 1,
            timedOut: false,
            testResults: [{ name: 'adds two numbers', passed: false, details: 'raised error' }],
          },
        },
      });
      expect(analyzeResponse.statusCode).toBe(201);
      const messages = analyzeResponse.json();
      expect(messages).toHaveLength(2);
      expect(messages[1]).toMatchObject({ role: 'assistant', content: SAMPLE_HELP_ANSWER.answer });

      const analyzeToolCall = aiClient.requests.find((r) => r.toolName === 'explain_run_result');
      expect(analyzeToolCall?.messages[0]?.content).toContain("NameError: name 'x' is not defined");

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/exercises/${exercise.id}/help`,
      });
      expect(historyResponse.json()).toHaveLength(2);
    });

    it('POST /api/exercises/:exerciseId/analyze-result returns 404 for an unknown exercise', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/exercises/missing/analyze-result',
        payload: {
          code: '',
          executionResult: {
            stdout: '',
            stderr: '',
            exitCode: 0,
            timedOut: false,
            testResults: [],
          },
        },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('theory sessions, exams, and on-demand teaching', () => {
    it('POST /api/teach returns 409 without an active curriculum', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/teach',
        payload: { topic: 'Decorators' },
      });
      expect(response.statusCode).toBe(409);
    });

    it('POST /api/teach creates an on-demand theory session, and its exam can be fetched and graded', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      await app.inject({ method: 'POST', url: '/api/curricula' });

      aiClient.enqueue(SAMPLE_THEORY);
      const teachResponse = await app.inject({
        method: 'POST',
        url: '/api/teach',
        payload: { topic: 'Decorators' },
      });
      expect(teachResponse.statusCode).toBe(201);
      const taught = teachResponse.json();
      expect(taught.topic.origin).toBe('on_demand');
      expect(taught.session.sessionType).toBe('theory');

      const questionsResponse = await app.inject({
        method: 'GET',
        url: `/api/sessions/${taught.session.id}/exam/questions`,
      });
      expect(questionsResponse.statusCode).toBe(200);
      const questions = questionsResponse.json();
      expect(questions).toHaveLength(1);
      expect(questions[0].correctAnswer).toBeUndefined();
      expect(questions[0].gradingNotes).toBeUndefined();

      // Passing (score 0.9) but only the first attempt, so the mastery engine
      // asks for another exercise next rather than mastering immediately.
      aiClient.enqueue(SAMPLE_EXAM_GRADING);
      aiClient.enqueue(SAMPLE_EXERCISE);
      const submitResponse = await app.inject({
        method: 'POST',
        url: `/api/sessions/${taught.session.id}/exam/submit`,
        payload: { answers: { [questions[0].id]: 'def' } },
      });
      expect(submitResponse.statusCode).toBe(201);
      const result = submitResponse.json();
      expect(result.examAttempt.score).toBe(0.9);
      expect(result.decision).toBe('next_exercise');
      expect(result.nextExercise.prompt).toBe(SAMPLE_EXERCISE.prompt);
    });

    it('POST /api/sessions/:sessionId/exam/submit returns 409 for a non-theory session', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      const { availableTopicId } = await setUpCurriculumAndTopic(app);
      aiClient.enqueue(SAMPLE_EXERCISE);
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/topics/${availableTopicId}/start`,
      });
      const { session } = startResponse.json();

      const response = await app.inject({
        method: 'POST',
        url: `/api/sessions/${session.id}/exam/submit`,
        payload: { answers: {} },
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('learning overview', () => {
    it('GET /api/overview returns 404 before any curriculum exists', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({ method: 'GET', url: '/api/overview' });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/overview/refresh returns 409 before any curriculum exists', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({ method: 'POST', url: '/api/overview/refresh' });
      expect(response.statusCode).toBe(409);
    });

    it('GET /api/overview reflects current topics with a null narrative before refresh', async () => {
      const { app } = buildTestApp(SAMPLE_CURRICULUM);
      await app.inject({ method: 'POST', url: '/api/curricula' });

      const response = await app.inject({ method: 'GET', url: '/api/overview' });
      expect(response.statusCode).toBe(200);
      const overview = response.json();
      expect(overview.topics).toHaveLength(2);
      expect(overview.narrativeMd).toBeNull();
    });

    it('POST /api/overview/refresh generates a narrative, then GET /api/overview reflects it', async () => {
      const { app, aiClient } = buildTestApp(SAMPLE_CURRICULUM);
      await app.inject({ method: 'POST', url: '/api/curricula' });

      aiClient.enqueue(SAMPLE_NARRATIVE);
      const refreshResponse = await app.inject({ method: 'POST', url: '/api/overview/refresh' });
      expect(refreshResponse.statusCode).toBe(200);
      expect(refreshResponse.json().narrativeMd).toBe(SAMPLE_NARRATIVE.narrativeMd);

      const overviewResponse = await app.inject({ method: 'GET', url: '/api/overview' });
      expect(overviewResponse.json().narrativeMd).toBe(SAMPLE_NARRATIVE.narrativeMd);
    });
  });

  describe('sandbox', () => {
    it('POST /api/sandbox/run executes arbitrary code with no hidden tests and no AI call', async () => {
      const { app, aiClient } = buildTestApp();
      mockExeca.mockResolvedValue({
        stdout: '##RESULTS##' + JSON.stringify({ stdout: 'hi\n', stderr: '', testResults: [] }),
        stderr: '',
        exitCode: 0,
        timedOut: false,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/sandbox/run',
        payload: { code: 'print("hi")' },
      });

      expect(response.statusCode).toBe(200);
      const result = response.json();
      expect(result.stdout).toBe('hi\n');
      expect(result.testResults).toEqual([]);
      expect(aiClient.requests).toHaveLength(0);
    });
  });

  describe('AI provider settings', () => {
    it('GET /api/settings reports the default provider and what is configured', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        currentProvider: 'anthropic',
        availableProviders: ['anthropic'],
      });
    });

    it('POST /api/settings rejects an unknown provider', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings',
        payload: { provider: 'not-a-real-provider' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/settings rejects a known provider with no configured client', async () => {
      const { app } = buildTestApp();
      const response = await app.inject({
        method: 'POST',
        url: '/api/settings',
        payload: { provider: 'openai' },
      });
      expect(response.statusCode).toBe(409);
    });

    it('POST /api/settings switches the active provider, and later requests use it', async () => {
      const db = createTestDb();
      const anthropicClient = createFakeAiClient(SAMPLE_CURRICULUM);
      const openaiClient = createFakeAiClient(SAMPLE_CURRICULUM);
      const app = buildApp({
        db,
        aiClients: { anthropic: anthropicClient, openai: openaiClient },
        sandboxConfig: SANDBOX_CONFIG,
      });

      const switchResponse = await app.inject({
        method: 'POST',
        url: '/api/settings',
        payload: { provider: 'openai' },
      });
      expect(switchResponse.statusCode).toBe(200);
      expect(switchResponse.json()).toEqual({
        currentProvider: 'openai',
        availableProviders: ['anthropic', 'openai'],
      });

      await app.inject({ method: 'POST', url: '/api/curricula' });
      expect(anthropicClient.requests).toHaveLength(0);
      expect(openaiClient.requests).toHaveLength(1);
    });

    it('fails a request with 409 when the selected provider has no configured client', async () => {
      const db = createTestDb();
      const app = buildApp({ db, aiClients: {}, sandboxConfig: SANDBOX_CONFIG });

      const response = await app.inject({ method: 'POST', url: '/api/curricula' });
      expect(response.statusCode).toBe(409);
    });
  });
});
