import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Track } from '@pytho-trainer/shared';

interface TrackRow {
  id: string;
  curriculum_id: string;
  kind: Track['kind'];
  slug: string;
  title: string;
  description: string;
  track_order: number;
}

function mapRow(row: TrackRow): Track {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    description: row.description,
    trackOrder: row.track_order,
  };
}

export interface InsertTrackInput {
  curriculumId: string;
  kind: Track['kind'];
  slug: string;
  title: string;
  description: string;
  trackOrder: number;
}

export function insertTrack(db: Database.Database, input: InsertTrackInput): Track {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO tracks (id, curriculum_id, kind, slug, title, description, track_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.curriculumId,
    input.kind,
    input.slug,
    input.title,
    input.description,
    input.trackOrder,
  );

  return mapRow(db.prepare('SELECT * FROM tracks WHERE id = ?').get(id) as TrackRow);
}

export function listTracksByCurriculum(db: Database.Database, curriculumId: string): Track[] {
  const rows = db
    .prepare('SELECT * FROM tracks WHERE curriculum_id = ? ORDER BY track_order ASC')
    .all(curriculumId) as TrackRow[];
  return rows.map(mapRow);
}
