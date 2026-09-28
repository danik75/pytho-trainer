import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { ensureLocalUser } from '../db/repositories/users';

export function registerUserRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/api/user', async () => ensureLocalUser(db));
}
