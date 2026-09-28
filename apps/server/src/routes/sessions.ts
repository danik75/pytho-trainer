import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { getStudySession } from '../db/repositories/sessions';
import { getLatestExerciseBySession } from '../db/repositories/exercises';
import { listExamQuestionsBySession } from '../db/repositories/examQuestions';
import { NotFoundError } from '../errors';
import type { AiClient } from '../ai/client';
import { submitExam } from '../sessions/submitExam';

const paramsSchema = z.object({ sessionId: z.string() });
const examSubmitBodySchema = z.object({ answers: z.record(z.string(), z.string()) });

export function registerSessionRoutes(
  app: FastifyInstance,
  db: Database.Database,
  aiClient: AiClient,
): void {
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

  app.get('/api/sessions/:sessionId/exam/questions', async (request) => {
    const { sessionId } = paramsSchema.parse(request.params);
    const session = getStudySession(db, sessionId);
    if (!session) throw new NotFoundError(`Session ${sessionId} not found`);
    // correctAnswer/gradingNotes are the answer key - never sent to the client.
    return listExamQuestionsBySession(db, sessionId).map((q) => ({
      id: q.id,
      sessionId: q.sessionId,
      questionMd: q.questionMd,
      questionType: q.questionType,
      choices: q.choices,
    }));
  });

  app.post('/api/sessions/:sessionId/exam/submit', async (request, reply) => {
    const { sessionId } = paramsSchema.parse(request.params);
    const { answers } = examSubmitBodySchema.parse(request.body);
    const result = await submitExam(db, aiClient, sessionId, answers);
    return reply.status(201).send(result);
  });
}
