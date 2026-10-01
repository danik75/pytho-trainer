import { resolve } from 'node:path';

// apps/server/src -> repo root is three levels up. Resolving against this
// (rather than process.cwd()) keeps the DB path stable no matter which
// directory the process was launched from (repo root vs. apps/server).
const REPO_ROOT = resolve(__dirname, '../../..');

export interface AiProviderConfig {
  apiKey: string;
  smartModel: string;
  fastModel: string;
}

export interface AzureOpenAiProviderConfig {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  smartDeployment: string;
  fastDeployment: string;
}

export interface AppConfig {
  port: number;
  dbPath: string;
  sandboxImage: string;
  sandboxTimeoutMs: number;
  sandboxMemoryMb: number;
  anthropic?: AiProviderConfig;
  openai?: AiProviderConfig;
  azureOpenai?: AzureOpenAiProviderConfig;
  google?: AiProviderConfig;
  deepseek?: AiProviderConfig;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Only configured when the given API key env var is present - a provider
 * with no key simply isn't offered, rather than failing boot. */
function optionalProviderConfig(
  apiKeyEnv: string,
  smartModelEnv: string,
  defaultSmartModel: string,
  fastModelEnv: string,
  defaultFastModel: string,
): AiProviderConfig | undefined {
  const apiKey = process.env[apiKeyEnv];
  if (!apiKey) return undefined;
  return {
    apiKey,
    smartModel: process.env[smartModelEnv] ?? defaultSmartModel,
    fastModel: process.env[fastModelEnv] ?? defaultFastModel,
  };
}

/**
 * Azure OpenAI has no sensible model/deployment defaults (deployment names
 * are chosen per Azure resource) and needs an endpoint + api version, unlike
 * the other OpenAI-compatible providers - so once AZURE_OPENAI_API_KEY is
 * present, the rest of its settings are required, failing fast rather than
 * booting with a half-configured client.
 */
function optionalAzureOpenAiConfig(): AzureOpenAiProviderConfig | undefined {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) return undefined;
  return {
    apiKey,
    endpoint: requireEnv('AZURE_OPENAI_ENDPOINT'),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21',
    smartDeployment: requireEnv('AZURE_OPENAI_SMART_DEPLOYMENT'),
    fastDeployment: requireEnv('AZURE_OPENAI_FAST_DEPLOYMENT'),
  };
}

export function loadConfig(): AppConfig {
  const anthropic = optionalProviderConfig(
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_SMART_MODEL',
    'claude-sonnet-5',
    'ANTHROPIC_FAST_MODEL',
    'claude-haiku-4-5-20251001',
  );
  if (!anthropic) {
    // Anthropic remains the one provider required at boot - it's the
    // always-on default (new users start on it) even once other providers
    // are configured, so the app always has at least one working client.
    requireEnv('ANTHROPIC_API_KEY');
  }

  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: resolve(REPO_ROOT, process.env.DB_PATH ?? 'data/pytho-trainer.db'),
    sandboxImage: process.env.SANDBOX_IMAGE ?? 'pytho-trainer-sandbox',
    sandboxTimeoutMs: Number(process.env.SANDBOX_TIMEOUT_MS ?? 10_000),
    sandboxMemoryMb: Number(process.env.SANDBOX_MEMORY_MB ?? 128),
    anthropic,
    openai: optionalProviderConfig(
      'OPENAI_API_KEY',
      'OPENAI_SMART_MODEL',
      'gpt-4o',
      'OPENAI_FAST_MODEL',
      'gpt-4o-mini',
    ),
    azureOpenai: optionalAzureOpenAiConfig(),
    google: optionalProviderConfig(
      'GOOGLE_API_KEY',
      'GOOGLE_SMART_MODEL',
      'gemini-1.5-pro',
      'GOOGLE_FAST_MODEL',
      'gemini-1.5-flash',
    ),
    deepseek: optionalProviderConfig(
      'DEEPSEEK_API_KEY',
      'DEEPSEEK_SMART_MODEL',
      'deepseek-chat',
      'DEEPSEEK_FAST_MODEL',
      'deepseek-chat',
    ),
  };
}
