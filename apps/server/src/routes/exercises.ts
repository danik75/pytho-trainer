import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { submitExercise } from '../sessions/submitExercise';
import { runExerciseCode } from '../sessions/runExerciseCode';
import { askExerciseHelp } from '../sessions/askExerciseHelp';
import { listExerciseHelpMessages } from '../db/repositories/exerciseHelp';
import type { AiClient } from '../ai/client';
import type { SandboxConfig } from '../sandbox/runner';

const paramsSchema = z.object({ exerciseId: z.string() });
const submitBodySchema = z.object({ code: z.string() });
const runBodySchema = z.object({ code: z.string() });
const askBodySchema = z.object({ question: z.string().min(1), code: z.string() });

export function registerExerciseRoutes(
  app: FastifyInstance,
  db: Database.Database,
  aiClient: AiClient,
  sandboxConfig: SandboxConfig,
): void {
  app.post('/api/exercises/:exerciseId/submit', async (request, reply) => {
    const { exerciseId } = paramsSchema.parse(request.params);
    const { code } = submitBodySchema.parse(request.body);
    const result = await submitExercise(db, aiClient, sandboxConfig, exerciseId, code);
    return reply.status(201).send(result);
  });

  app.post('/api/exercises/:exerciseId/run', async (request, reply) => {
    const { exerciseId } = paramsSchema.parse(request.params);
    const { code } = runBodySchema.parse(request.body);
    const result = await runExerciseCode(db, sandboxConfig, exerciseId, code);
    return reply.status(200).send(result);
  });

  app.get('/api/exercises/:exerciseId/help', async (request) => {
    const { exerciseId } = paramsSchema.parse(request.params);
    return listExerciseHelpMessages(db, exerciseId);
  });

  app.post('/api/exercises/:exerciseId/help', async (request, reply) => {
    const { exerciseId } = paramsSchema.parse(request.params);
    const { question, code } = askBodySchema.parse(request.body);
    const messages = await askExerciseHelp(db, aiClient, exerciseId, question, code);
    return reply.status(201).send(messages);
  });
}
