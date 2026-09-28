import { createTestDb } from '../../testUtils/createTestDb';
import { ensureLocalUser, getUser, updateUser, LOCAL_USER_ID } from './users';

describe('users repository', () => {
  it('returns null before the local user is created', () => {
    const db = createTestDb();
    expect(getUser(db)).toBeNull();
  });

  it('creates the local user on first call and is idempotent', () => {
    const db = createTestDb();
    const first = ensureLocalUser(db);
    const second = ensureLocalUser(db);

    expect(first.id).toBe(LOCAL_USER_ID);
    expect(second.id).toBe(LOCAL_USER_ID);
    expect(first.createdAt).toBe(second.createdAt);
  });

  it('updates user fields and preserves unspecified ones', () => {
    const db = createTestDb();
    ensureLocalUser(db);

    const updated = updateUser(db, {
      goals: 'Learn Python for data work',
      selectedDomains: ['ml'],
    });
    expect(updated.goals).toBe('Learn Python for data work');
    expect(updated.selectedDomains).toEqual(['ml']);

    const updatedAgain = updateUser(db, { selfAssessedLevel: 'beginner' });
    expect(updatedAgain.goals).toBe('Learn Python for data work');
    expect(updatedAgain.selfAssessedLevel).toBe('beginner');
  });
});
