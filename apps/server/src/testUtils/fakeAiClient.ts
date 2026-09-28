import type { AiClient, ToolMessageRequest } from '../ai/client';

/**
 * A test double for AiClient. Queue responses with `enqueue`, or fall back to
 * always returning `defaultResponse`. Records every request for assertions.
 */
export function createFakeAiClient(defaultResponse?: unknown): AiClient & {
  requests: ToolMessageRequest[];
  enqueue: (response: unknown) => void;
} {
  const queue: unknown[] = [];
  const requests: ToolMessageRequest[] = [];

  return {
    requests,
    enqueue(response: unknown) {
      queue.push(response);
    },
    async createToolMessage(request: ToolMessageRequest): Promise<unknown> {
      requests.push(request);
      if (queue.length > 0) return queue.shift();
      if (defaultResponse !== undefined) return defaultResponse;
      throw new Error('createFakeAiClient: no response queued and no defaultResponse set');
    },
  };
}
