import type { ExamGradingGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { gradeExam } from './examGrading';

const SAMPLE: ExamGradingGeneration = {
  score: 0.8,
  overallFeedback: 'Good understanding overall.',
  perQuestionFeedback: { q1: 'Correct.' },
  suggestedMasteryScore: 0.75,
};

describe('gradeExam', () => {
  it('calls the AI client with the exam grading tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await gradeExam(aiClient, {
      questions: [
        {
          id: 'q1',
          questionMd: 'What is a base case?',
          questionType: 'short_answer',
          userAnswer: 'The stopping condition.',
          correctAnswer: 'The condition that stops recursion.',
          gradingNotes: 'Accept any answer describing a stopping condition.',
        },
      ],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('grade_exam');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('base case');
  });
});
