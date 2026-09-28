import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { ZodError } from 'zod';
import { registerHealthRoutes } from './routes/health';
import { registerUserRoutes } from './routes/user';
import { registerDomainRoutes } from './routes/domains';
import { registerOnboardingRoutes } from './routes/onboarding';
import { registerCurriculaRoutes } from './routes/curricula';
import { registerRoadmapRoutes } from './routes/roadmap';
import type { AiClient } from './ai/client';
import { AiGenerationError, NotFoundError } from './errors';

export interface AppDependencies {
  db: Database.Database;
  aiClient: AiClient;
}

export function buildApp({ db, aiClient }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: true });

  registerHealthRoutes(app);
  registerUserRoutes(app, db);
  registerDomainRoutes(app);
  registerOnboardingRoutes(app, db);
  registerCurriculaRoutes(app, db, aiClient);
  registerRoadmapRoutes(app, db);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send({ error: { code: 'validation_error', message: error.message } });
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: { code: 'not_found', message: error.message } });
    }
    if (error instanceof AiGenerationError) {
      return reply
        .status(502)
        .send({ error: { code: 'ai_generation_error', message: error.message } });
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: { code: 'internal_error', message: 'Internal server error' } });
  });

  return app;
}
