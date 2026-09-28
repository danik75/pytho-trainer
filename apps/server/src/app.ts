import Fastify, { type FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { registerHealthRoutes } from './routes/health';
import { registerUserRoutes } from './routes/user';
import { registerDomainRoutes } from './routes/domains';

export function buildApp(db: Database.Database): FastifyInstance {
  const app = Fastify({ logger: true });

  registerHealthRoutes(app);
  registerUserRoutes(app, db);
  registerDomainRoutes(app);

  return app;
}
