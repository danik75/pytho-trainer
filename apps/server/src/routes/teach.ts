import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { teachOnDemand } from '../sessions/teachOnDemand';
import { LOCAL_USER_ID } from '../db/repositories/users';
import type { AiClientResolver } from '../ai/client';

const bodySchema = z.object({ topic: z.string().min(1) });

export function registerTeachRoutes(
  app: FastifyInstance,
  db: Database.Database,
  resolveAiClient: AiClientResolver,
): void {
  app.post('/api/teach', async (request, reply) => {
    const { topic } = bodySchema.parse(request.body);
    const result = await teachOnDemand(db, resolveAiClient(), LOCAL_USER_ID, topic);
    return reply.status(201).send(result);
  });
}
