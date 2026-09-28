import type { ExerciseHelpAnswerGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { HAIKU_MODEL } from './client';
import { askExerciseQuestion } from './exerciseHelp';

const SAMPLE: ExerciseHelpAnswerGeneration = {
  answer: 'A `for` loop lets you repeat an action for each item in a sequence.',
};

describe('askExerciseQuestion', () => {
  it('calls the AI client with the help tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await askExerciseQuestion(aiClient, {
      exercisePrompt: 'Write a function that sums a list.',
      conceptsMd: '# Loops\n\nUse `for` to iterate.',
      currentCode: 'def total(nums):\n    pass\n',
      history: [],
      question: 'How do I loop over the list?',
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('answer_exercise_question');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('How do I loop over the list?');
    expect(aiClient.requests[0]?.model).toBe(HAIKU_MODEL);
  });

  it('includes prior conversation history in the prompt', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    await askExerciseQuestion(aiClient, {
      exercisePrompt: 'Write a function that sums a list.',
      conceptsMd: '# Loops',
      currentCode: '',
      history: [
        { role: 'user', content: 'What does sum mean here?' },
        { role: 'assistant', content: 'It means adding all the numbers together.' },
      ],
      question: 'Can you show an example?',
    });

    expect(aiClient.requests[0]?.messages[0]?.content).toContain('What does sum mean here?');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain(
      'It means adding all the numbers together.',
    );
  });
});
