import { createTestDb } from '../../testUtils/createTestDb';
import { getLearningOverviewNarrative, upsertLearningOverviewNarrative } from './learningOverviews';

describe('learning_overviews repository', () => {
  it('returns nulls when no narrative has been generated yet', () => {
    const db = createTestDb();
    expect(getLearningOverviewNarrative(db)).toEqual({ narrativeMd: null, generatedAt: null });
  });

  it('inserts a narrative on first upsert', () => {
    const db = createTestDb();
    const result = upsertLearningOverviewNarrative(db, 'You are making great progress.');
    expect(result.narrativeMd).toBe('You are making great progress.');
    expect(result.generatedAt).not.toBeNull();
  });

  it('overwrites the narrative on a second upsert rather than duplicating rows', () => {
    const db = createTestDb();
    upsertLearningOverviewNarrative(db, 'First summary.');
    const second = upsertLearningOverviewNarrative(db, 'Second summary.');

    expect(second.narrativeMd).toBe('Second summary.');
    const count = db.prepare('SELECT COUNT(*) as count FROM learning_overviews').get() as {
      count: number;
    };
    expect(count.count).toBe(1);
  });
});
