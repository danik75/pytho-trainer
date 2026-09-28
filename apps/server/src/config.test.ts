import { loadConfig } from './config';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => loadConfig()).toThrow('ANTHROPIC_API_KEY');
  });

  it('returns defaults when only the required key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    delete process.env.PORT;
    delete process.env.DB_PATH;

    const config = loadConfig();
    expect(config.anthropicApiKey).toBe('test-key');
    expect(config.port).toBe(3001);
    expect(config.dbPath.replace(/\\/g, '/')).toMatch(/\/data\/pytho-trainer\.db$/);
    expect(config.sandboxTimeoutMs).toBe(10_000);
  });

  it('resolves a relative DB_PATH override against the repo root, not cwd', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.DB_PATH = 'data/custom.db';

    const config = loadConfig();
    const normalized = config.dbPath.replace(/\\/g, '/');
    expect(normalized).toMatch(/\/data\/custom\.db$/);
    // Regardless of the test runner's cwd (apps/server), the path must be
    // anchored at the repo root, not nested under apps/server.
    expect(normalized).not.toContain('/apps/server/');
  });

  it('respects overrides from environment variables', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.PORT = '4000';
    process.env.SANDBOX_MEMORY_MB = '256';

    const config = loadConfig();
    expect(config.port).toBe(4000);
    expect(config.sandboxMemoryMb).toBe(256);
  });
});
