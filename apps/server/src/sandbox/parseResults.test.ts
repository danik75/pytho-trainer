import { parseSandboxOutput } from './parseResults';
import type { HiddenTestSpec } from '@pytho-trainer/shared';

const HIDDEN_TESTS: HiddenTestSpec[] = [
  { name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 },
];

describe('parseSandboxOutput', () => {
  it('parses the harness results line into a structured result', () => {
    const payload = {
      stdout: 'hello\n',
      stderr: '',
      testResults: [{ name: 'adds two numbers', passed: true }],
    };
    const result = parseSandboxOutput(
      { stdout: `##RESULTS##${JSON.stringify(payload)}`, stderr: '', exitCode: 0, timedOut: false },
      HIDDEN_TESTS,
    );

    expect(result.testResults).toEqual(payload.testResults);
    expect(result.stdout).toBe('hello\n');
    expect(result.timedOut).toBe(false);
  });

  it('finds the results line even with other output before it', () => {
    const payload = { stdout: '', stderr: '', testResults: [] };
    const result = parseSandboxOutput(
      {
        stdout: `some noise\n##RESULTS##${JSON.stringify(payload)}`,
        stderr: '',
        exitCode: 0,
        timedOut: false,
      },
      HIDDEN_TESTS,
    );
    expect(result.testResults).toEqual([]);
  });

  it('marks every test failed with a timeout reason when the run timed out', () => {
    const result = parseSandboxOutput(
      { stdout: '', stderr: '', exitCode: null, timedOut: true },
      HIDDEN_TESTS,
    );
    expect(result.timedOut).toBe(true);
    expect(result.testResults).toEqual([
      { name: 'adds two numbers', passed: false, details: 'Execution timed out.' },
    ]);
  });

  it('marks tests failed when no results line is present', () => {
    const result = parseSandboxOutput(
      { stdout: 'no results here', stderr: '', exitCode: 1, timedOut: false },
      HIDDEN_TESTS,
    );
    expect(result.testResults[0]?.details).toBe('Execution did not complete.');
  });

  it('marks tests failed when the results line is not valid JSON', () => {
    const result = parseSandboxOutput(
      { stdout: '##RESULTS##not-json', stderr: '', exitCode: 0, timedOut: false },
      HIDDEN_TESTS,
    );
    expect(result.testResults[0]?.details).toBe('Execution produced an unparseable result.');
  });

  it('truncates very long output', () => {
    const longText = 'x'.repeat(200_000);
    const payload = { stdout: longText, stderr: '', testResults: [] };
    const result = parseSandboxOutput(
      { stdout: `##RESULTS##${JSON.stringify(payload)}`, stderr: '', exitCode: 0, timedOut: false },
      HIDDEN_TESTS,
    );
    expect(result.stdout.length).toBeLessThan(longText.length);
    expect(result.stdout).toContain('[truncated]');
  });
});
