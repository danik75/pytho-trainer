const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    AzureOpenAI: jest.fn().mockImplementation((opts: { deployment: string }) => ({
      deployment: opts.deployment,
      chat: { completions: { create: mockCreate } },
    })),
  };
});

import { AzureOpenAI } from 'openai';
import { createAzureOpenAiClient } from './azureOpenai';

const CONFIG = {
  apiKey: 'test-key',
  endpoint: 'https://example-resource.azure.openai.com/',
  apiVersion: '2024-10-21',
  smartDeployment: 'gpt-4o-deployment',
  fastDeployment: 'gpt-4o-mini-deployment',
};

describe('createAzureOpenAiClient', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    (AzureOpenAI as unknown as jest.Mock).mockClear();
  });

  it("builds one client per tier, scoped to that tier's deployment", () => {
    createAzureOpenAiClient(CONFIG);

    expect(AzureOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      endpoint: CONFIG.endpoint,
      apiVersion: CONFIG.apiVersion,
      deployment: 'gpt-4o-deployment',
    });
    expect(AzureOpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      endpoint: CONFIG.endpoint,
      apiVersion: CONFIG.apiVersion,
      deployment: 'gpt-4o-mini-deployment',
    });
  });

  it('sends the request to the smart-tier deployment by default', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              { type: 'function', function: { name: 'my_tool', arguments: '{"foo":"bar"}' } },
            ],
          },
        },
      ],
    });

    const client = createAzureOpenAiClient(CONFIG);
    const result = await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
    });

    expect(result).toEqual({ foo: 'bar' });
    expect(mockCreate.mock.calls[0]?.[0].model).toBe('gpt-4o-deployment');
  });

  it('sends the request to the fast-tier deployment when requested', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              { type: 'function', function: { name: 'my_tool', arguments: '{"foo":"bar"}' } },
            ],
          },
        },
      ],
    });

    const client = createAzureOpenAiClient(CONFIG);
    await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
      tier: 'fast',
    });

    expect(mockCreate.mock.calls[0]?.[0].model).toBe('gpt-4o-mini-deployment');
  });
});
