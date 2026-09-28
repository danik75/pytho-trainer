import { resolve } from 'node:path';

// apps/server/src -> repo root is three levels up. Resolving against this
// (rather than process.cwd()) keeps the DB path stable no matter which
// directory the process was launched from (repo root vs. apps/server).
const REPO_ROOT = resolve(__dirname, '../../..');

export interface AppConfig {
  port: number;
  dbPath: string;
  anthropicApiKey: string;
  sandboxImage: string;
  sandboxTimeoutMs: number;
  sandboxMemoryMb: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 3001),
    dbPath: resolve(REPO_ROOT, process.env.DB_PATH ?? 'data/pytho-trainer.db'),
    anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
    sandboxImage: process.env.SANDBOX_IMAGE ?? 'pytho-trainer-sandbox',
    sandboxTimeoutMs: Number(process.env.SANDBOX_TIMEOUT_MS ?? 10_000),
    sandboxMemoryMb: Number(process.env.SANDBOX_MEMORY_MB ?? 128),
  };
}
