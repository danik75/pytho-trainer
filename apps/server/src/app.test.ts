const mockExeca = jest.fn();
jest.mock('execa', () => ({ execa: mockExeca }), { virtual: true });

import { createTestDb } from './testUtils/createTestDb';
import { createFakeAiClient } from './testUtils/fakeAiClient';
import { buildApp } from './app';
import type { CurriculumGeneration, ExerciseGeneration } from '@pytho-trainer/shared';

const SANDBOX_CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 5000, memoryMb: 128 };

function buildTestApp(defaultAiResponse?: unknown) {
  const db = createTestDb();
  const aiClient = createFakeAiClient(defaultAiResponse);
  return { app: buildApp({ db, aiClient, sandboxConfig: SANDBOX_CONFIG }), db, aiClient };
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
  difficulty: 'intro',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 }],
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
    const app = buildApp({ db, aiClient, sandboxConfig: SANDBOX_CONFIG });

    const response = await app.inject({ method: 'POST', url: '/api/curricula' });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('internal_error');
  });

  describe('topics, sessions, and exercise submission', () => {
    async function setUpCurriculumAndTopic(app: ReturnType<typeof buildApp>) {
      await app.inject({ method: 'POST', url: '/api/curricula' });
      const roadmap = (await app.inject({ method: 'GET', url: '/api/roadmap' })).json();
      const availableTopicId = roadmap.tracks[0].topics[0].topicId as string;
      const lockedTopicId = roadmap.tracks[1].topics[0].topicId as string;
      return { availableTopicId, lockedTopicId };
    }

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

      const submitResponse = await app.inject({
        method: 'POST',
        url: `/api/exercises/${exercise.id}/submit`,
        payload: { code: 'def add(a, b):\n    return a + b\n' },
      });

      expect(submitResponse.statusCode).toBe(201);
      const submission = submitResponse.json();
      expect(submission.testResults).toEqual([{ name: 'adds two numbers', passed: true }]);
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
  });
});
