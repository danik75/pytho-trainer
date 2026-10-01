/**
 * Real-Docker smoke test for the sandbox: no mocks, no AI, no Jest. Run via
 * `npm run test:e2e` (which builds the pytho-trainer-sandbox image first).
 *
 * This exists because runner.test.ts mocks execa entirely, so a regression
 * in the Dockerfile, run_submission.py, or the security flags in
 * dockerArgs.ts could pass every other test and still be broken. It's a
 * plain tsx script rather than a Jest test because execa is ESM-only and
 * Jest's CommonJS module loader can't `await import()` it for real (only
 * works when mocked) - tsx has no such restriction.
 */
import assert from 'node:assert/strict';
import type { HiddenTestSpec } from '@pytho-trainer/shared';
import { runSubmission } from './runner';

const CONFIG = { image: 'pytho-trainer-sandbox', timeoutMs: 8000, memoryMb: 128 };
const ADD_TEST: HiddenTestSpec[] = [
  { name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 },
];

interface Check {
  name: string;
  run: () => Promise<void>;
}

const checks: Check[] = [
  {
    name: 'runs a correct solution and passes the hidden test',
    run: async () => {
      const result = await runSubmission('def add(a, b):\n    return a + b\n', ADD_TEST, CONFIG);
      assert.equal(result.timedOut, false);
      assert.deepEqual(result.testResults, [{ name: 'adds two numbers', passed: true }]);
    },
  },
  {
    name: 'runs an incorrect solution and reports the failure with details',
    run: async () => {
      const result = await runSubmission('def add(a, b):\n    return a - b\n', ADD_TEST, CONFIG);
      assert.equal(result.testResults.length, 1);
      assert.equal(result.testResults[0]?.passed, false);
      assert.match(result.testResults[0]?.details ?? '', /Expected 5/);
    },
  },
  {
    name: 'reports a runtime exception raised by the submission itself',
    run: async () => {
      const result = await runSubmission(
        'def add(a, b):\n    raise ValueError("boom")\n',
        ADD_TEST,
        CONFIG,
      );
      assert.equal(result.testResults[0]?.passed, false);
      assert.match(result.testResults[0]?.details ?? '', /ValueError/);
    },
  },
  {
    name: 'passes an expectedError test when the right exception and message are raised',
    run: async () => {
      const result = await runSubmission(
        'def add(a, b):\n    raise ValueError("bad input")\n',
        [
          {
            name: 'rejects bad input',
            functionName: 'add',
            args: [2, 3],
            expectedError: { type: 'ValueError', message: 'bad input' },
          },
        ],
        CONFIG,
      );
      assert.deepEqual(result.testResults, [{ name: 'rejects bad input', passed: true }]);
    },
  },
  {
    name: 'fails an expectedError test when no exception is raised',
    run: async () => {
      const result = await runSubmission(
        'def add(a, b):\n    return a + b\n',
        [
          {
            name: 'rejects bad input',
            functionName: 'add',
            args: [2, 3],
            expectedError: { type: 'ValueError', message: 'bad input' },
          },
        ],
        CONFIG,
      );
      assert.equal(result.testResults[0]?.passed, false);
      assert.match(result.testResults[0]?.details ?? '', /ValueError.*to be raised/);
    },
  },
  {
    name: 'blocks network access from inside the sandbox',
    run: async () => {
      const result = await runSubmission(
        [
          'import urllib.request',
          'def add(a, b):',
          '    try:',
          '        urllib.request.urlopen("http://example.com", timeout=2)',
          '        return "reached network"',
          '    except Exception as e:',
          '        return type(e).__name__',
        ].join('\n'),
        [{ name: 'network blocked', functionName: 'add', args: [1, 2], expected: 'blocked' }],
        CONFIG,
      );
      assert.doesNotMatch(result.testResults[0]?.details ?? '', /reached network/);
    },
  },
  {
    name: 'kills a genuinely hung submission at the configured timeout, without hanging the host',
    run: async () => {
      const start = Date.now();
      const result = await runSubmission(
        'def add(a, b):\n    while True:\n        pass\n',
        ADD_TEST,
        { ...CONFIG, timeoutMs: 3000 },
      );
      const elapsedMs = Date.now() - start;
      assert.equal(result.timedOut, true);
      // Generous upper bound: guards against the old SIGTERM-then-wait
      // behavior (see runner.ts's killSignal comment), which took ~8s for a
      // 3s timeout.
      assert.ok(elapsedMs < 6000, `expected under 6000ms, took ${elapsedMs}ms`);
    },
  },
];

async function main() {
  let failures = 0;
  for (const check of checks) {
    try {
      await check.run();
      console.log(`✓ ${check.name}`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${check.name}`);
      console.error(error);
    }
  }

  console.log(`\n${checks.length - failures}/${checks.length} passed`);
  process.exit(failures > 0 ? 1 : 0);
}

void main();
