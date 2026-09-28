import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import {
  getLearningOverview,
  refreshLearningOverviewNarrative,
} from '../curricula/getLearningOverview';
import { LOCAL_USER_ID } from '../db/repositories/users';
import { NotFoundError } from '../errors';
import type { AiClient } from '../ai/client';

export function registerOverviewRoutes(
  app: FastifyInstance,
  db: Database.Database,
  aiClient: AiClient,
): void {
  app.get('/api/overview', async () => {
    const overview = getLearningOverview(db, LOCAL_USER_ID);
    if (!overview) {
      throw new NotFoundError('No active curriculum yet - generate one via POST /api/curricula');
    }
    return overview;
  });

  app.post('/api/overview/refresh', async () => {
    return refreshLearningOverviewNarrative(db, aiClient, LOCAL_USER_ID);
  });
}
