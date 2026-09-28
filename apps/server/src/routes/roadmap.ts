import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { NotFoundError } from '../errors';
import { LOCAL_USER_ID } from '../db/repositories/users';
import { getRoadmapView } from '../curricula/getRoadmapView';

export function registerRoadmapRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/api/roadmap', async () => {
    const roadmap = getRoadmapView(db, LOCAL_USER_ID);
    if (!roadmap) {
      throw new NotFoundError('No active curriculum yet - generate one via POST /api/curricula');
    }
    return roadmap;
  });
}
