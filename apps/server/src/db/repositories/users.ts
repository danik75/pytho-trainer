import type Database from 'better-sqlite3';
import type { User } from '@pytho-trainer/shared';

export const LOCAL_USER_ID = 'local-user';

interface UserRow {
  id: string;
  goals: string;
  self_assessed_level: string;
  diagnostic_notes: string;
  selected_domains: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    goals: row.goals,
    selfAssessedLevel: row.self_assessed_level,
    diagnosticNotes: JSON.parse(row.diagnostic_notes) as Record<string, unknown>,
    selectedDomains: JSON.parse(row.selected_domains) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ensureLocalUser(db: Database.Database): User {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(LOCAL_USER_ID) as
    UserRow | undefined;
  if (existing) return mapRow(existing);

  db.prepare('INSERT INTO users (id) VALUES (?)').run(LOCAL_USER_ID);
  return mapRow(db.prepare('SELECT * FROM users WHERE id = ?').get(LOCAL_USER_ID) as UserRow);
}

export function getUser(db: Database.Database): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(LOCAL_USER_ID) as
    UserRow | undefined;
  return row ? mapRow(row) : null;
}

export interface UpdateUserInput {
  goals?: string;
  selfAssessedLevel?: string;
  diagnosticNotes?: Record<string, unknown>;
  selectedDomains?: string[];
}

export function updateUser(db: Database.Database, input: UpdateUserInput): User {
  const current = ensureLocalUser(db);
  const next = { ...current, ...input };

  db.prepare(
    `UPDATE users SET goals = ?, self_assessed_level = ?, diagnostic_notes = ?, selected_domains = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    next.goals,
    next.selfAssessedLevel,
    JSON.stringify(next.diagnosticNotes),
    JSON.stringify(next.selectedDomains),
    LOCAL_USER_ID,
  );

  return getUser(db) as User;
}
