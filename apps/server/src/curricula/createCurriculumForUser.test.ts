import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { getActiveCurriculum } from '../db/repositories/curricula';
import { createCurriculumForUser } from './createCurriculumForUser';

const GENERATION: CurriculumGeneration = {
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

describe('createCurriculumForUser', () => {
  it('generates via the AI client and persists the result', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const aiClient = createFakeAiClient(GENERATION);

    const { curriculumId } = await createCurriculumForUser(db, aiClient, LOCAL_USER_ID, {
      goals: 'Learn Python',
      selfAssessedLevel: 'beginner',
      diagnosticNotes: {},
      selectedDomains: [],
    });

    expect(curriculumId).toBeTruthy();
    expect(getActiveCurriculum(db, LOCAL_USER_ID)?.title).toBe('Python Basics');
  });
});
