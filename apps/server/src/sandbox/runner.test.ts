const mockExeca = jest.fn();

jest.mock('execa', () => ({ execa: mockExeca }), { virtual: true });

import type { HiddenTestSpec } from '@pytho-trainer/shared';
import { runSubmission } from './runner';

const HIDDEN_TESTS: HiddenTestSpec[] = [
  { name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 },
];
const CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 5000, memoryMb: 128 };

describe('runSubmission', () => {
  beforeEach(() => {
    mockExeca.mockReset();
  });

  it('rejects submissions over the length limit without invoking docker', async () => {
    const result = await runSubmission('x'.repeat(20_001), HIDDEN_TESTS, CONFIG);
    expect(mockExeca).not.toHaveBeenCalled();
    expect(result.testResults[0]?.details).toBe('Submission too long to run');
  });

  it('invokes docker run with a mounted temp dir and parses the results', async () => {
    const payload = {
      stdout: '',
      stderr: '',
      testResults: [{ name: 'adds two numbers', passed: true }],
    };
    mockExeca.mockResolvedValue({
      stdout: `##RESULTS##${JSON.stringify(payload)}`,
      stderr: '',
      exitCode: 0,
      timedOut: false,
    });

    const result = await runSubmission('def add(a, b):\n    return a + b\n', HIDDEN_TESTS, CONFIG);

    expect(result.testResults).toEqual(payload.testResults);
    expect(mockExeca).toHaveBeenCalledTimes(1);
    const [bin, args, options] = mockExeca.mock.calls[0] as [
      string,
      string[],
      { timeout: number; killSignal: string },
    ];
    expect(bin).toBe('docker');
    expect(args).toContain('pytho-trainer-sandbox');
    expect(options.timeout).toBe(5000);
    // Must be SIGKILL, not the execa default SIGTERM: `docker run` forwards
    // SIGTERM to the container and blocks until it exits, so a hung
    // submission would stall the timeout for many extra seconds otherwise.
    expect(options.killSignal).toBe('SIGKILL');
  });

  it('tolerates a result missing optional fields', async () => {
    mockExeca.mockResolvedValue({});

    const result = await runSubmission('def add(a, b):\n    return a + b\n', HIDDEN_TESTS, CONFIG);

    expect(result.exitCode).toBeNull();
    expect(result.timedOut).toBe(false);
  });

  it('kills the container when the run times out', async () => {
    mockExeca.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: null, timedOut: true });
    mockExeca.mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0, timedOut: false });

    const result = await runSubmission('while True: pass', HIDDEN_TESTS, CONFIG);

    expect(result.timedOut).toBe(true);
    expect(mockExeca).toHaveBeenCalledTimes(2);
    const killCall = mockExeca.mock.calls[1] as [string, string[]];
    expect(killCall[0]).toBe('docker');
    expect(killCall[1][0]).toBe('kill');
  });
});
