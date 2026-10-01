jest.mock('./openaiCompatible', () => ({ createOpenAiCompatibleClient: jest.fn(() => 'client') }));

import { createOpenAiCompatibleClient } from './openaiCompatible';
import { createDeepSeekClient } from './deepseek';

describe('createDeepSeekClient', () => {
  it('delegates to the shared OpenAI-compatible client with the DeepSeek base URL', () => {
    const models = { smart: 'deepseek-chat', fast: 'deepseek-chat' };
    const result = createDeepSeekClient('test-key', models);

    expect(createOpenAiCompatibleClient).toHaveBeenCalledWith(
      'test-key',
      models,
      'https://api.deepseek.com/v1',
    );
    expect(result).toBe('client');
  });
});
