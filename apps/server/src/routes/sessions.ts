import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getStudySession } from '../db/repositories/sessions';
import { getLatestExerciseBySession } from '../db/repositories/exercises';
import { NotFoundError } from '../errors';

const paramsSchema = z.object({ sessionId: z.string() });

export function registerSessionRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get('/api/sessions/:sessionId', async (request) => {
    const { sessionId } = paramsSchema.parse(request.params);
    const session = getStudySession(db, sessionId);
    if (!session) throw new NotFoundError(`Session ${sessionId} not found`);
    return session;
  });

  app.get('/api/sessions/:sessionId/exercises/current', async (request) => {
    const { sessionId } = paramsSchema.parse(request.params);
    const session = getStudySession(db, sessionId);
    if (!session) throw new NotFoundError(`Session ${sessionId} not found`);
    const exercise = getLatestExerciseBySession(db, sessionId);
    if (!exercise) throw new NotFoundError(`No exercise yet for session ${sessionId}`);
    return exercise;
  });
}
