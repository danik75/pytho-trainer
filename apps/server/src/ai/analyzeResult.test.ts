import type { ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { TIER_FAST } from './client';
import { analyzeExecutionResult } from './analyzeResult';

const SAMPLE: ExerciseHelpAnswerGeneration = {
  answer: 'Your function raised a NameError because `x` is never defined - did you mean `n`?',
};

describe('analyzeExecutionResult', () => {
  it('calls the AI client with the explain tool and includes the run output in the prompt', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await analyzeExecutionResult(aiClient, {
      exercisePrompt: 'Write a function that sums a list.',
      conceptsMd: '# Loops\n\nUse `for` to iterate.',
      code: 'def total(nums):\n    return x\n',
      stdout: '',
      stderr: "NameError: name 'x' is not defined",
      timedOut: false,
      testResults: [{ name: 'sums a list', passed: false, details: 'raised NameError' }],
      history: [],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('explain_run_result');
    expect(aiClient.requests[0]?.tier).toBe(TIER_FAST);
    const prompt = aiClient.requests[0]?.messages[0]?.content ?? '';
    expect(prompt).toContain("NameError: name 'x' is not defined");
    expect(prompt).toContain('raised NameError');
  });

  it('notes a timeout in the prompt when the run timed out', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    await analyzeExecutionResult(aiClient, {
      exercisePrompt: 'Write a function.',
      conceptsMd: '',
      code: 'while True:\n    pass\n',
      stdout: '',
      stderr: '',
      timedOut: true,
      testResults: [],
      history: [],
    });

    expect(aiClient.requests[0]?.messages[0]?.content).toContain('TIMED OUT');
  });

  it('includes prior conversation history in the prompt', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    await analyzeExecutionResult(aiClient, {
      exercisePrompt: 'Write a function.',
      conceptsMd: '',
      code: 'pass',
      stdout: '',
      stderr: '',
      timedOut: false,
      testResults: [],
      history: [
        { role: 'user', content: 'Can you analyze this result and explain what happened?' },
        { role: 'assistant', content: 'Sure, here is what happened last time.' },
      ],
    });

    expect(aiClient.requests[0]?.messages[0]?.content).toContain(
      'Sure, here is what happened last time.',
    );
  });
});
