import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getTopic } from '../db/repositories/topics';
import { getMasteryRecordByTopic } from '../db/repositories/mastery';
import { NotFoundError } from '../errors';
import type { AiClient } from '../ai/client';
import { startTopic } from '../sessions/startTopic';
import { resetTopic } from '../sessions/resetTopic';
import { requestAdditionalPractice } from '../sessions/requestAdditionalPractice';

const paramsSchema = z.object({ topicId: z.string() });

export function registerTopicRoutes(
  app: FastifyInstance,
  db: Database.Database,
  aiClient: AiClient,
): void {
  app.get('/api/topics/:topicId', async (request) => {
    const { topicId } = paramsSchema.parse(request.params);
    const topic = getTopic(db, topicId);
    if (!topic) throw new NotFoundError(`Topic ${topicId} not found`);
    return { topic, mastery: getMasteryRecordByTopic(db, topicId) };
  });

  app.post('/api/topics/:topicId/start', async (request, reply) => {
    const { topicId } = paramsSchema.parse(request.params);
    const result = await startTopic(db, aiClient, topicId);
    return reply.status(201).send(result);
  });

  app.post('/api/topics/:topicId/reset', async (request) => {
    const { topicId } = paramsSchema.parse(request.params);
    return resetTopic(db, topicId);
  });

  app.post('/api/topics/:topicId/practice', async (request, reply) => {
    const { topicId } = paramsSchema.parse(request.params);
    const result = await requestAdditionalPractice(db, aiClient, topicId);
    return reply.status(201).send(result);
  });
}
