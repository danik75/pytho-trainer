import type { ExecutionResult, HiddenTestSpec, TestResult } from '@pytho-trainer/shared';

export type SandboxExecutionResult = ExecutionResult;

export const RESULTS_PREFIX = '##RESULTS##';
const MAX_OUTPUT_LENGTH = 100_000;

interface RawProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

interface HarnessPayload {
  stdout: string;
  stderr: string;
  testResults: TestResult[];
}

function truncate(text: string): string {
  return text.length > MAX_OUTPUT_LENGTH
    ? `${text.slice(0, MAX_OUTPUT_LENGTH)}\n...[truncated]`
    : text;
}

function incompleteResult(
  hiddenTests: HiddenTestSpec[],
  reason: string,
  raw: RawProcessOutput,
): SandboxExecutionResult {
  return {
    stdout: truncate(raw.stdout),
    stderr: truncate(raw.stderr || reason),
    exitCode: raw.exitCode,
    timedOut: raw.timedOut,
    testResults: hiddenTests.map((test) => ({ name: test.name, passed: false, details: reason })),
  };
}

/**
 * Parses the sandbox container's raw stdout to find the harness's final
 * "##RESULTS##<json>" line. Pure and testable without Docker - the container
 * process itself is executed elsewhere.
 */
export function parseSandboxOutput(
  raw: RawProcessOutput,
  hiddenTests: HiddenTestSpec[],
): SandboxExecutionResult {
  if (raw.timedOut) {
    return incompleteResult(hiddenTests, 'Execution timed out.', raw);
  }

  const resultsLine = raw.stdout.split('\n').find((line) => line.startsWith(RESULTS_PREFIX));
  if (!resultsLine) {
    return incompleteResult(hiddenTests, 'Execution did not complete.', raw);
  }

  let payload: HarnessPayload;
  try {
    payload = JSON.parse(resultsLine.slice(RESULTS_PREFIX.length)) as HarnessPayload;
  } catch {
    return incompleteResult(hiddenTests, 'Execution produced an unparseable result.', raw);
  }

  return {
    stdout: truncate(payload.stdout),
    stderr: truncate(payload.stderr),
    exitCode: raw.exitCode,
    timedOut: false,
    testResults: payload.testResults,
  };
}
