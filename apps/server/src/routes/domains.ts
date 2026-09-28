import type { FastifyInstance } from 'fastify';
import { DOMAIN_CATALOG } from '@pytho-trainer/shared';

export function registerDomainRoutes(app: FastifyInstance): void {
  app.get('/api/domains/catalog', async () => DOMAIN_CATALOG);
}
