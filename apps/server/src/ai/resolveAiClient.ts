import type Database from 'better-sqlite3';
import type { AiProvider } from '@pytho-trainer/shared';
import { getAiProvider } from '../db/repositories/users';
import { InvalidStateError } from '../errors';
import type { AiClient, AiClientResolver } from './client';

/**
 * Builds a resolver that reads the user's currently selected provider fresh
 * on every call (so a provider switch takes effect on the very next request)
 * and looks it up in the map of clients actually configured at boot (only
 * providers with an API key present get an entry).
 */
export function createAiClientResolver(
  db: Database.Database,
  aiClients: Partial<Record<AiProvider, AiClient>>,
): AiClientResolver {
  return () => {
    const provider = getAiProvider(db);
    const client = aiClients[provider];
    if (!client) {
      throw new InvalidStateError(
        `AI provider "${provider}" is not configured - add its API key to .env`,
      );
    }
    return client;
  };
}
