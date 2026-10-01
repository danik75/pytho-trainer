import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { NotFoundError } from '../errors';
import type { AiClientResolver } from '../ai/client';
import { createCurriculumForUser } from '../curricula/createCurriculumForUser';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { getActiveCurriculum } from '../db/repositories/curricula';

export function registerCurriculaRoutes(
  app: FastifyInstance,
  db: Database.Database,
  resolveAiClient: AiClientResolver,
): void {
  app.post('/api/curricula', async (_request, reply) => {
    const user = ensureLocalUser(db);
    const result = await createCurriculumForUser(db, resolveAiClient(), LOCAL_USER_ID, {
      goals: user.goals,
      selfAssessedLevel: user.selfAssessedLevel,
      diagnosticNotes: user.diagnosticNotes,
      selectedDomains: user.selectedDomains,
    });
    return reply.status(201).send(result);
  });

  app.get('/api/curricula/active', async () => {
    const curriculum = getActiveCurriculum(db, LOCAL_USER_ID);
    if (!curriculum) {
      throw new NotFoundError('No active curriculum yet - generate one via POST /api/curricula');
    }
    return curriculum;
  });
}
