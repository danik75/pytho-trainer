import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { updateUser } from '../db/repositories/users';

const onboardingBodySchema = z.object({
  goals: z.string().optional(),
  selfAssessedLevel: z.string().optional(),
  diagnosticNotes: z.record(z.string(), z.unknown()).optional(),
  selectedDomains: z.array(z.string()).optional(),
});

export function registerOnboardingRoutes(app: FastifyInstance, db: Database.Database): void {
  app.post('/api/onboarding', async (request, reply) => {
    const body = onboardingBodySchema.parse(request.body);
    const user = updateUser(db, body);
    return reply.send(user);
  });
}
