import { join } from 'node:path';
import dotenv from 'dotenv';
import { loadConfig } from './config';

dotenv.config({ path: join(__dirname, '../../../.env') });
import { createDbClient } from './db/client';
import { runMigrations } from './db/migrate';
import { ensureLocalUser } from './db/repositories/users';
import type { AiClient } from './ai/client';
import { createAnthropicClient } from './ai/providers/anthropic';
import { createOpenAiClient } from './ai/providers/openai';
import { createAzureOpenAiClient } from './ai/providers/azureOpenai';
import { createGoogleClient } from './ai/providers/google';
import { createDeepSeekClient } from './ai/providers/deepseek';
import { buildApp } from './app';
import type { AiProvider } from '@pytho-trainer/shared';

const config = loadConfig();
const db = createDbClient(config.dbPath);
runMigrations(db);
ensureLocalUser(db);

// Only providers whose API key is present in .env get a client - the
// resolver (see ai/resolveAiClient.ts) rejects a selected provider with no
// configured client rather than falling back silently.
const aiClients: Partial<Record<AiProvider, AiClient>> = {};
if (config.anthropic) {
  aiClients.anthropic = createAnthropicClient(config.anthropic.apiKey, {
    smart: config.anthropic.smartModel,
    fast: config.anthropic.fastModel,
  });
}
if (config.openai) {
  aiClients.openai = createOpenAiClient(config.openai.apiKey, {
    smart: config.openai.smartModel,
    fast: config.openai.fastModel,
  });
}
if (config.azureOpenai) {
  aiClients['azure-openai'] = createAzureOpenAiClient(config.azureOpenai);
}
if (config.google) {
  aiClients.google = createGoogleClient(config.google.apiKey, {
    smart: config.google.smartModel,
    fast: config.google.fastModel,
  });
}
if (config.deepseek) {
  aiClients.deepseek = createDeepSeekClient(config.deepseek.apiKey, {
    smart: config.deepseek.smartModel,
    fast: config.deepseek.fastModel,
  });
}

const sandboxConfig = {
  image: config.sandboxImage,
  timeoutMs: config.sandboxTimeoutMs,
  memoryMb: config.sandboxMemoryMb,
};
const app = buildApp({ db, aiClients, sandboxConfig });

app.listen({ port: config.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
