import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { AiProvider, AiSettings } from '@pytho-trainer/shared';
import { AI_PROVIDER_CATALOG } from '@pytho-trainer/shared';
import { getAiProvider, setAiProvider } from '../db/repositories/users';
import { InvalidStateError } from '../errors';
import type { AiClient } from '../ai/client';

const KNOWN_PROVIDERS = AI_PROVIDER_CATALOG.map((entry) => entry.id) as [
  AiProvider,
  ...AiProvider[],
];
const bodySchema = z.object({ provider: z.enum(KNOWN_PROVIDERS) });

export function registerSettingsRoutes(
  app: FastifyInstance,
  db: Database.Database,
  aiClients: Partial<Record<AiProvider, AiClient>>,
): void {
  const availableProviders = (Object.keys(aiClients) as AiProvider[]).filter(
    (provider) => aiClients[provider] !== undefined,
  );

  app.get('/api/settings', async (): Promise<AiSettings> => ({
    currentProvider: getAiProvider(db),
    availableProviders,
  }));

  app.post('/api/settings', async (request): Promise<AiSettings> => {
    const { provider } = bodySchema.parse(request.body);
    if (!aiClients[provider]) {
      throw new InvalidStateError(
        `AI provider "${provider}" is not configured - add its API key to .env`,
      );
    }
    return { currentProvider: setAiProvider(db, provider), availableProviders };
  });
}
