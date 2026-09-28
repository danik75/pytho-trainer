import type { SubmissionEvaluationGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { HAIKU_MODEL } from './client';
import { evaluateSubmission } from './evaluation';

const SAMPLE: SubmissionEvaluationGeneration = {
  correct: true,
  understandingNotes: 'Solid grasp of arithmetic and f-strings.',
  feedback: 'Great job!',
  idiomaticFeedback: '',
  suggestedMasteryScore: 0.8,
  identifiedWeakSpots: [],
};

describe('evaluateSubmission', () => {
  it('calls the AI client with the evaluation tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await evaluateSubmission(aiClient, {
      exercisePrompt: 'Write add(a, b).',
      code: 'def add(a, b):\n    return a + b\n',
      stdout: '',
      stderr: '',
      testResults: [{ name: 'adds', passed: true }],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('evaluate_submission');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('adds');
    expect(aiClient.requests[0]?.model).toBe(HAIKU_MODEL);
  });
});
