import type Database from 'better-sqlite3';

export interface LearningOverviewNarrative {
  narrativeMd: string | null;
  generatedAt: string | null;
}

interface LearningOverviewRow {
  narrative_md: string | null;
  generated_at: string | null;
}

export function getLearningOverviewNarrative(db: Database.Database): LearningOverviewNarrative {
  const row = db
    .prepare("SELECT narrative_md, generated_at FROM learning_overviews WHERE id = 'singleton'")
    .get() as LearningOverviewRow | undefined;
  return row
    ? { narrativeMd: row.narrative_md, generatedAt: row.generated_at }
    : { narrativeMd: null, generatedAt: null };
}

export function upsertLearningOverviewNarrative(
  db: Database.Database,
  narrativeMd: string,
): LearningOverviewNarrative {
  db.prepare(
    `INSERT INTO learning_overviews (id, narrative_md, generated_at) VALUES ('singleton', ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET narrative_md = excluded.narrative_md, generated_at = excluded.generated_at`,
  ).run(narrativeMd);
  return getLearningOverviewNarrative(db);
}
