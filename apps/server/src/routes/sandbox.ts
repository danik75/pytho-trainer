import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { runSubmission, type SandboxConfig } from '../sandbox/runner';

const bodySchema = z.object({ code: z.string() });

/**
 * A free-form scratchpad: runs arbitrary code in the same locked-down
 * sandbox as exercises, but with no hidden tests, no AI evaluation, and
 * nothing persisted - just execute and see stdout/stderr, independent of any
 * exercise or topic.
 */
export function registerSandboxRoutes(app: FastifyInstance, sandboxConfig: SandboxConfig): void {
  app.post('/api/sandbox/run', async (request) => {
    const { code } = bodySchema.parse(request.body);
    return runSubmission(code, [], sandboxConfig);
  });
}
