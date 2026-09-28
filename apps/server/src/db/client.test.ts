import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDbClient } from './client';

describe('createDbClient', () => {
  it('creates the parent directory and an operable database file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pytho-trainer-test-'));
    const dbPath = join(dir, 'nested', 'test.db');

    const db = createDbClient(dbPath);
    try {
      expect(existsSync(dbPath)).toBe(true);
      expect(db.prepare('SELECT 1 as one').get()).toEqual({ one: 1 });
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
