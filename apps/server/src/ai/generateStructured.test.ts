import { z } from 'zod';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { generateStructured } from './generateStructured';
import { AiGenerationError } from '../errors';

const schema = z.object({ name: z.string().min(1) });

const baseRequest = {
  system: 'system prompt',
  userMessage: 'user message',
  toolName: 'test_tool',
  toolDescription: 'a test tool',
  schema,
  jsonSchema: { type: 'object' },
};

describe('generateStructured', () => {
  it('returns the parsed value when the first attempt is valid', async () => {
    const aiClient = createFakeAiClient({ name: 'Alice' });
    const result = await generateStructured(aiClient, baseRequest);
    expect(result).toEqual({ name: 'Alice' });
    expect(aiClient.requests).toHaveLength(1);
  });

  it('retries once with validation feedback and succeeds on the second attempt', async () => {
    const aiClient = createFakeAiClient();
    aiClient.enqueue({ name: '' });
    aiClient.enqueue({ name: 'Bob' });

    const result = await generateStructured(aiClient, baseRequest);

    expect(result).toEqual({ name: 'Bob' });
    expect(aiClient.requests).toHaveLength(2);
    const retryMessage = aiClient.requests[1]?.messages[0];
    expect(retryMessage?.content).toContain('failed validation');
  });

  it('throws AiGenerationError when both attempts fail validation', async () => {
    const aiClient = createFakeAiClient();
    aiClient.enqueue({ name: '' });
    aiClient.enqueue({ name: '' });

    await expect(generateStructured(aiClient, baseRequest)).rejects.toThrow(AiGenerationError);
  });
});
