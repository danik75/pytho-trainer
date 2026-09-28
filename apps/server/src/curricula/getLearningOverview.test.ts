import type { CurriculumGeneration, OverviewNarrativeGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { persistGeneratedCurriculum } from './persistGeneratedCurriculum';
import { InvalidStateError } from '../errors';
import { getLearningOverview, refreshLearningOverviewNarrative } from './getLearningOverview';

const CURRICULUM: CurriculumGeneration = {
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

const NARRATIVE: OverviewNarrativeGeneration = {
  narrativeMd: '# You are off to a great start!',
};

describe('getLearningOverview', () => {
  it('returns null with no active curriculum', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    expect(getLearningOverview(db, LOCAL_USER_ID)).toBeNull();
  });

  it('returns structured data with a null narrative before one is generated', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    persistGeneratedCurriculum(db, LOCAL_USER_ID, CURRICULUM);

    const overview = getLearningOverview(db, LOCAL_USER_ID);
    expect(overview?.topics).toHaveLength(1);
    expect(overview?.narrativeMd).toBeNull();
    expect(overview?.narrativeGeneratedAt).toBeNull();
  });
});

describe('refreshLearningOverviewNarrative', () => {
  it('throws InvalidStateError with no active curriculum', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const aiClient = createFakeAiClient(NARRATIVE);
    await expect(refreshLearningOverviewNarrative(db, aiClient, LOCAL_USER_ID)).rejects.toThrow(
      InvalidStateError,
    );
  });

  it('generates and persists a narrative, then getLearningOverview reflects it', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    persistGeneratedCurriculum(db, LOCAL_USER_ID, CURRICULUM);
    const aiClient = createFakeAiClient(NARRATIVE);

    const refreshed = await refreshLearningOverviewNarrative(db, aiClient, LOCAL_USER_ID);
    expect(refreshed.narrativeMd).toBe(NARRATIVE.narrativeMd);

    const overview = getLearningOverview(db, LOCAL_USER_ID);
    expect(overview?.narrativeMd).toBe(NARRATIVE.narrativeMd);
    expect(overview?.narrativeGeneratedAt).not.toBeNull();
  });
});
