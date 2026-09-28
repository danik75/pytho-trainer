import type { ExerciseGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { generateExercise } from './exercises';

const SAMPLE: ExerciseGeneration = {
  prompt: 'Write a function that adds two numbers.',
  starterCode: 'def add(a, b):\n    pass\n',
  difficulty: 'intro',
  targetWeakSpots: [],
  hiddenTests: [{ name: 'adds two numbers', functionName: 'add', args: [2, 3], expected: 5 }],
};

describe('generateExercise', () => {
  it('calls the AI client with the exercise tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await generateExercise(aiClient, {
      topicTitle: 'Functions',
      topicDescription: 'Defining and calling functions',
      learningObjectives: ['Define a function'],
      difficulty: 'intro',
      weakSpots: [],
      recentExercisePrompts: [],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('generate_exercise');
  });
});
