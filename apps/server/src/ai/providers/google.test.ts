const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockImplementation(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => {
  const actual = jest.requireActual('@google/generative-ai');
  return {
    ...actual,
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

import { FunctionCallingMode } from '@google/generative-ai';
import { createGoogleClient } from './google';

const MODELS = { smart: 'gemini-1.5-pro', fast: 'gemini-1.5-flash' };

describe('createGoogleClient', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockGetGenerativeModel.mockClear();
  });

  it('forces a function call and returns its args', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { functionCalls: () => [{ name: 'my_tool', args: { foo: 'bar' } }] },
    });

    const client = createGoogleClient('test-key', MODELS);
    const result = await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: {
        type: 'object',
        properties: { foo: { type: ['string', 'null'] } },
        required: ['foo'],
      },
    });

    expect(result).toEqual({ foo: 'bar' });
    const modelParams = mockGetGenerativeModel.mock.calls[0]?.[0];
    expect(modelParams.model).toBe('gemini-1.5-pro');
    expect(modelParams.toolConfig.functionCallingConfig).toEqual({
      mode: FunctionCallingMode.ANY,
      allowedFunctionNames: ['my_tool'],
    });
    const schema = modelParams.tools[0].functionDeclarations[0].parameters;
    expect(schema.properties.foo).toEqual({ type: 'string', nullable: true });
  });

  it('resolves the fast-tier model when requested', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { functionCalls: () => [{ name: 'my_tool', args: {} }] },
    });

    const client = createGoogleClient('test-key', MODELS);
    await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object', properties: {} },
      tier: 'fast',
    });

    expect(mockGetGenerativeModel.mock.calls[0]?.[0].model).toBe('gemini-1.5-flash');
  });

  it('retries once when no function call is returned, then succeeds', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ response: { functionCalls: () => undefined } })
      .mockResolvedValueOnce({
        response: { functionCalls: () => [{ name: 'my_tool', args: { foo: 'bar' } }] },
      });

    const client = createGoogleClient('test-key', MODELS);
    const result = await client.createToolMessage({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      toolName: 'my_tool',
      toolDescription: 'desc',
      inputSchema: { type: 'object', properties: {} },
    });

    expect(result).toEqual({ foo: 'bar' });
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('throws once retries are exhausted with no function call', async () => {
    mockGenerateContent.mockResolvedValue({ response: { functionCalls: () => undefined } });

    const client = createGoogleClient('test-key', MODELS);

    await expect(
      client.createToolMessage({
        system: 'sys',
        messages: [{ role: 'user', content: 'hi' }],
        toolName: 'my_tool',
        toolDescription: 'desc',
        inputSchema: { type: 'object', properties: {} },
      }),
    ).rejects.toThrow('did not include the expected function call');

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });
});
