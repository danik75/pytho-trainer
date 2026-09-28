import type { OverviewNarrativeGeneration } from '@pytho-trainer/shared';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { HAIKU_MODEL } from './client';
import { generateOverviewNarrative } from './overview';

const SAMPLE: OverviewNarrativeGeneration = {
  narrativeMd: '# Great progress!\n\nYou have mastered Variables.',
};

describe('generateOverviewNarrative', () => {
  it('calls the AI client with the overview tool and returns validated data', async () => {
    const aiClient = createFakeAiClient(SAMPLE);

    const result = await generateOverviewNarrative(aiClient, {
      curriculumTitle: 'Python Basics',
      topics: [],
      difficulties: [],
      strugglingTopics: [],
      nextSteps: [],
    });

    expect(result).toEqual(SAMPLE);
    expect(aiClient.requests[0]?.toolName).toBe('generate_learning_overview_narrative');
    expect(aiClient.requests[0]?.messages[0]?.content).toContain('Python Basics');
    expect(aiClient.requests[0]?.model).toBe(HAIKU_MODEL);
  });
});
