import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { ZodError } from 'zod';
import { registerHealthRoutes } from './routes/health';
import { registerUserRoutes } from './routes/user';
import { registerDomainRoutes } from './routes/domains';
import { registerOnboardingRoutes } from './routes/onboarding';
import { registerCurriculaRoutes } from './routes/curricula';
import { registerRoadmapRoutes } from './routes/roadmap';
import { registerTopicRoutes } from './routes/topics';
import { registerSessionRoutes } from './routes/sessions';
import { registerExerciseRoutes } from './routes/exercises';
import { registerTeachRoutes } from './routes/teach';
import { registerOverviewRoutes } from './routes/overview';
import { registerSandboxRoutes } from './routes/sandbox';
import { registerSettingsRoutes } from './routes/settings';
import type { AiClient } from './ai/client';
import { createAiClientResolver } from './ai/resolveAiClient';
import type { SandboxConfig } from './sandbox/runner';
import { AiGenerationError, InvalidStateError, NotFoundError } from './errors';
import type { AiProvider } from '@pytho-trainer/shared';

export interface AppDependencies {
  db: Database.Database;
  aiClients: Partial<Record<AiProvider, AiClient>>;
  sandboxConfig: SandboxConfig;
}

export function buildApp({ db, aiClients, sandboxConfig }: AppDependencies): FastifyInstance {
  const app = Fastify({ logger: true });
  const resolveAiClient = createAiClientResolver(db, aiClients);

  registerHealthRoutes(app);
  registerUserRoutes(app, db);
  registerDomainRoutes(app);
  registerOnboardingRoutes(app, db);
  registerCurriculaRoutes(app, db, resolveAiClient);
  registerRoadmapRoutes(app, db);
  registerTopicRoutes(app, db, resolveAiClient);
  registerSessionRoutes(app, db, resolveAiClient);
  registerExerciseRoutes(app, db, resolveAiClient, sandboxConfig);
  registerTeachRoutes(app, db, resolveAiClient);
  registerOverviewRoutes(app, db, resolveAiClient);
  registerSandboxRoutes(app, sandboxConfig);
  registerSettingsRoutes(app, db, aiClients);

  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send({ error: { code: 'validation_error', message: error.message } });
    }
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: { code: 'not_found', message: error.message } });
    }
    if (error instanceof InvalidStateError) {
      return reply.status(409).send({ error: { code: 'invalid_state', message: error.message } });
    }
    if (error instanceof AiGenerationError) {
      return reply
        .status(502)
        .send({ error: { code: 'ai_generation_error', message: error.message } });
    }
    // Fastify's own errors (malformed body, unsupported media type, etc.)
    // carry a statusCode - respect it instead of masking a client mistake as
    // a 500, but still fall through to 500 for anything without one.
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: 'bad_request', message: error.message } });
    }
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: { code: 'internal_error', message: 'Internal server error' } });
  });

  return app;
}
