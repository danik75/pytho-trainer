import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { SONNET_MODEL } from './client';
import { generateCurriculum } from './curriculum';

const SAMPLE: CurriculumGeneration = {
  title: 'Python Basics',
  summary: 'A gentle introduction.',
  tracks: [
    {
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'Core basics.',
      topics: [
        {
          title: 'Syntax',
          description: 'Python syntax basics.',
          learningObjectives: ['Write a script'],
          difficulty: 'intro',
        },
      ],
    },
  ],
};

describe('generateCurriculum', () => {
  it('calls the AI client with the curriculum tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await generateCurriculum(aiClient, {
      goals: 'Learn Python',
      selfAssessedLevel: 'beginner',
      diagnosticNotes: {},
      selectedDomains: [],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests).toHaveLength(1);
    expect(aiClient.requests[0]?.toolName).toBe('generate_curriculum');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('Learn Python');
    expect(aiClient.requests[0]?.model).toBe(SONNET_MODEL);
  });
});
