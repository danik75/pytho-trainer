import { createTestDb } from './testUtils/createTestDb';
import { createFakeAiClient } from './testUtils/fakeAiClient';
import { buildApp } from './app';
import type { CurriculumGeneration } from '@pytho-trainer/shared';

function buildTestApp(defaultAiResponse?: unknown) {
  const db = createTestDb();
  const aiClient = createFakeAiClient(defaultAiResponse);
  return { app: buildApp({ db, aiClient }), db, aiClient };
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

describe('app routes', () => {
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
    const app = buildApp({ db, aiClient });

    const response = await app.inject({ method: 'POST', url: '/api/curricula' });
    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('internal_error');
  });
});
