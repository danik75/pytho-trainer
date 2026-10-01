const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

import { createOpenAiCompatibleClient } from './openaiCompatible';

const MODELS = { smart: 'gpt-4o', fast: 'gpt-4o-mini' };

describe('createOpenAiCompatibleClient', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('sends a forced tool_choice and returns the parsed arguments', async () => {
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

    const client = createOpenAiCompatibleClient('test-key', MODELS);
    const result = await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
    });

    expect(result).toEqual({ foo: 'bar' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs.tool_choice).toEqual({ type: 'function', function: { name: 'my_tool' } });
    expect(callArgs.model).toBe('gpt-4o');
  });

  it('resolves the fast-tier model when requested', async () => {
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

    const client = createOpenAiCompatibleClient('test-key', MODELS);
    await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
      tier: 'fast',
    });

    expect(mockCreate.mock.calls[0]?.[0].model).toBe('gpt-4o-mini');
  });

  it('retries once when the tool call arguments are malformed JSON, then succeeds', async () => {
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [{ type: 'function', function: { name: 'my_tool', arguments: '{bad' } }],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
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

    const client = createOpenAiCompatibleClient('test-key', MODELS);
    const result = await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
    });

    expect(result).toEqual({ foo: 'bar' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('throws once retries are exhausted with no tool call', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: {} }] });

    const client = createOpenAiCompatibleClient('test-key', MODELS);

    await expect(
      client.createToolMessage({
        system: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        toolName: 'my_tool',
        toolDescription: 'desc',
        inputSchema: { type: 'object' },
      }),
    ).rejects.toThrow('did not include the expected tool call');

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('passes a custom base URL through to the OpenAI client constructor', async () => {
    const OpenAI = jest.requireMock('openai') as jest.Mock;
    OpenAI.mockClear();
    createOpenAiCompatibleClient('test-key', MODELS, 'https://api.deepseek.com/v1');

    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'test-key',
      baseURL: 'https://api.deepseek.com/v1',
    });
  });
});
