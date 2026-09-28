import { createTestDb } from '../testUtils/createTestDb';
import { runMigrations } from './migrate';

describe('runMigrations', () => {
  it('creates the expected tables', () => {
    const db = createTestDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toEqual(expect.arrayContaining(['users', 'curricula', 'tracks', 'topics']));
  });

  it('is idempotent when run more than once', () => {
    const db = createTestDb();
    expect(() => runMigrations(db)).not.toThrow();

    const appliedCount = db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as {
      count: number;
    };
    expect(appliedCount.count).toBe(1);
  });
});
