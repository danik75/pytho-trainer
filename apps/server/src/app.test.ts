import { createTestDb } from './testUtils/createTestDb';
import { buildApp } from './app';

describe('app routes', () => {
  it('GET /api/health returns ok', async () => {
    const app = buildApp(createTestDb());
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /api/user seeds and returns the local user', async () => {
    const app = buildApp(createTestDb());
    const response = await app.inject({ method: 'GET', url: '/api/user' });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe('local-user');
  });

  it('GET /api/domains/catalog returns the domain list', async () => {
    const app = buildApp(createTestDb());
    const response = await app.inject({ method: 'GET', url: '/api/domains/catalog' });
    expect(response.statusCode).toBe(200);
    expect(response.json().length).toBeGreaterThan(0);
  });
});
