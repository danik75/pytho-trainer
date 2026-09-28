import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HiddenTestSpec } from '@pytho-trainer/shared';
import { buildDockerRunArgs } from './dockerArgs';
import { parseSandboxOutput, type SandboxExecutionResult } from './parseResults';

export interface SandboxConfig {
  image: string;
  timeoutMs: number;
  memoryMb: number;
}

const MAX_CODE_LENGTH = 20_000;

function tooLongResult(hiddenTests: HiddenTestSpec[]): SandboxExecutionResult {
  return {
    stdout: '',
    stderr: `Submission exceeds the maximum allowed length of ${MAX_CODE_LENGTH} characters.`,
    exitCode: null,
    timedOut: false,
    testResults: hiddenTests.map((test) => ({
      name: test.name,
      passed: false,
      details: 'Submission too long to run',
    })),
  };
}

/**
 * Runs submitted Python code against hidden tests inside the locked-down
 * sandbox container (see docker/sandbox). Execa is loaded via dynamic
 * import because it is ESM-only and this package is CommonJS.
 */
export async function runSubmission(
  code: string,
  hiddenTests: HiddenTestSpec[],
  config: SandboxConfig,
): Promise<SandboxExecutionResult> {
  if (code.length > MAX_CODE_LENGTH) {
    return tooLongResult(hiddenTests);
  }

  const { execa } = await import('execa');
  const hostDir = await mkdtemp(join(tmpdir(), 'pytho-trainer-submission-'));
  const containerName = `pytho-trainer-run-${randomUUID()}`;

  try {
    await writeFile(join(hostDir, 'solution.py'), code, 'utf-8');
    await writeFile(join(hostDir, 'tests.json'), JSON.stringify(hiddenTests), 'utf-8');

    const args = buildDockerRunArgs(config, containerName, hostDir);
    const result = await execa('docker', args, {
      timeout: config.timeoutMs,
      reject: false,
      // On timeout, kill the local `docker run` client immediately rather
      // than the SIGTERM-then-wait default: `docker run` forwards SIGTERM to
      // the container and blocks until it exits (or its own stop-timeout
      // elapses), which a hung submission never does cooperatively. SIGKILL
      // drops the client instantly so the explicit `docker kill` below (the
      // actual container-level backstop) runs right after the deadline.
      killSignal: 'SIGKILL',
    });

    if (result.timedOut) {
      // The `docker run` client process was killed by execa's timeout, but
      // the container itself keeps running under the daemon unless
      // explicitly killed too.
      await execa('docker', ['kill', containerName], { reject: false });
    }

    return parseSandboxOutput(
      {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? null,
        timedOut: result.timedOut ?? false,
      },
      hiddenTests,
    );
  } finally {
    await rm(hostDir, { recursive: true, force: true });
  }
}
