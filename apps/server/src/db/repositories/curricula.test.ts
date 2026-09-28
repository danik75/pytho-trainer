import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from './users';
import { insertCurriculum, getActiveCurriculum } from './curricula';

describe('curricula repository', () => {
  it('returns null when no curriculum exists yet', () => {
    const db = createTestDb();
    expect(getActiveCurriculum(db, LOCAL_USER_ID)).toBeNull();
  });

  it('inserts a curriculum as active and retrieves it', () => {
    const db = createTestDb();
    ensureLocalUser(db);

    const curriculum = insertCurriculum(db, {
      userId: LOCAL_USER_ID,
      title: 'My Curriculum',
      summary: 'A summary',
      rawAiResponse: '{}',
    });

    expect(curriculum.status).toBe('active');
    expect(getActiveCurriculum(db, LOCAL_USER_ID)?.id).toBe(curriculum.id);
  });
});
