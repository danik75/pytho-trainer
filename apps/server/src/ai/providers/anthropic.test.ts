const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

import { createAnthropicClient } from './anthropic';

const MODELS = { smart: 'claude-sonnet-5', fast: 'claude-haiku-4-5-20251001' };

describe('createAnthropicClient', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('sends a forced tool_choice and returns the tool_use input', async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: 'text', text: 'ignored' },
        { type: 'tool_use', id: 't1', name: 'my_tool', input: { foo: 'bar' } },
      ],
    });

    const client = createAnthropicClient('test-key', MODELS);
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
    expect(callArgs.tool_choice).toEqual({ type: 'tool', name: 'my_tool' });
    expect(callArgs.tools[0].name).toBe('my_tool');
    expect(callArgs.model).toBe('claude-sonnet-5');
  });

  it('resolves the fast-tier model when requested', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 't1', name: 'my_tool', input: { foo: 'bar' } }],
    });

    const client = createAnthropicClient('test-key', MODELS);
    await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object' },
      tier: 'fast',
    });

    const callArgs = mockCreate.mock.calls[0]?.[0];
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001');
  });

  it('retries once when no tool_use block is returned, then succeeds', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'no tool call' }] })
      .mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 't1', name: 'my_tool', input: { foo: 'bar' } }],
      });

    const client = createAnthropicClient('test-key', MODELS);
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

  it('throws once retries are exhausted with no tool_use block', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'no tool call' }] });

    const client = createAnthropicClient('test-key', MODELS);

    await expect(
      client.createToolMessage({
        system: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        toolName: 'my_tool',
        toolDescription: 'desc',
        inputSchema: { type: 'object' },
      }),
    ).rejects.toThrow('did not include the expected tool_use block');

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
