import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { submitExercise } from '../sessions/submitExercise';
import type { SandboxConfig } from '../sandbox/runner';

const paramsSchema = z.object({ exerciseId: z.string() });
const bodySchema = z.object({ code: z.string() });

export function registerExerciseRoutes(
  app: FastifyInstance,
  db: Database.Database,
  sandboxConfig: SandboxConfig,
): void {
  app.post('/api/exercises/:exerciseId/submit', async (request, reply) => {
    const { exerciseId } = paramsSchema.parse(request.params);
    const { code } = bodySchema.parse(request.body);
    const submission = await submitExercise(db, sandboxConfig, exerciseId, code);
    return reply.status(201).send(submission);
  });
}
