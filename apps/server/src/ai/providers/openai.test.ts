jest.mock('./openaiCompatible', () => ({ createOpenAiCompatibleClient: jest.fn(() => 'client') }));

import { createOpenAiCompatibleClient } from './openaiCompatible';
import { createOpenAiClient } from './openai';

describe('createOpenAiClient', () => {
  it('delegates to the shared OpenAI-compatible client with no base URL override', () => {
    const models = { smart: 'gpt-4o', fast: 'gpt-4o-mini' };
    const result = createOpenAiClient('test-key', models);

    expect(createOpenAiCompatibleClient).toHaveBeenCalledWith('test-key', models);
    expect(result).toBe('client');
  });
});
