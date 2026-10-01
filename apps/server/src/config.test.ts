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
    expect(config.anthropic?.apiKey).toBe('test-key');
    expect(config.anthropic?.smartModel).toBe('claude-sonnet-5');
    expect(config.anthropic?.fastModel).toBe('claude-haiku-4-5-20251001');
    expect(config.openai).toBeUndefined();
    expect(config.azureOpenai).toBeUndefined();
    expect(config.google).toBeUndefined();
    expect(config.deepseek).toBeUndefined();
    expect(config.port).toBe(3001);
    expect(config.dbPath.replace(/\\/g, '/')).toMatch(/\/data\/pytho-trainer\.db$/);
    expect(config.sandboxTimeoutMs).toBe(10_000);
  });

  it('configures additional providers only when their API key env var is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.OPENAI_SMART_MODEL = 'gpt-custom';
    delete process.env.GOOGLE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;

    const config = loadConfig();
    expect(config.openai).toEqual({
      apiKey: 'openai-key',
      smartModel: 'gpt-custom',
      fastModel: 'gpt-4o-mini',
    });
    expect(config.google).toBeUndefined();
    expect(config.deepseek).toBeUndefined();
  });

  it('configures Azure OpenAI once its API key, endpoint, and deployments are all set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_API_KEY = 'azure-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example-resource.azure.openai.com/';
    process.env.AZURE_OPENAI_SMART_DEPLOYMENT = 'gpt-4o-deployment';
    process.env.AZURE_OPENAI_FAST_DEPLOYMENT = 'gpt-4o-mini-deployment';
    delete process.env.AZURE_OPENAI_API_VERSION;

    const config = loadConfig();
    expect(config.azureOpenai).toEqual({
      apiKey: 'azure-key',
      endpoint: 'https://example-resource.azure.openai.com/',
      apiVersion: '2024-10-21',
      smartDeployment: 'gpt-4o-deployment',
      fastDeployment: 'gpt-4o-mini-deployment',
    });
  });

  it('throws when AZURE_OPENAI_API_KEY is set but its endpoint/deployments are missing', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_API_KEY = 'azure-key';
    delete process.env.AZURE_OPENAI_ENDPOINT;

    expect(() => loadConfig()).toThrow('AZURE_OPENAI_ENDPOINT');
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
