import type { TheoryGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { generateTheorySession } from './theory';

const SAMPLE: TheoryGeneration = {
  explanationMd: '# Recursion\n\nA function that calls itself.',
  examQuestions: [
    {
      questionMd: 'What is a base case?',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'The condition that stops recursion.',
      gradingNotes: 'Accept any answer describing a stopping condition.',
    },
  ],
};

describe('generateTheorySession', () => {
  it('calls the AI client with the theory tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await generateTheorySession(aiClient, {
      topic: 'Recursion',
      context: 'Functions calling themselves',
      focusAreas: ['base cases'],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('generate_theory_session');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('Recursion');
  });
});
