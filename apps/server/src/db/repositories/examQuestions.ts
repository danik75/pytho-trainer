import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { ExamQuestion, QuestionType } from '@pytho-trainer/shared';

interface ExamQuestionRow {
  id: string;
  session_id: string;
  question_md: string;
  question_type: QuestionType;
  choices: string | null;
  correct_answer: string;
  grading_notes: string;
}

function mapRow(row: ExamQuestionRow): ExamQuestion {
  return {
    id: row.id,
    sessionId: row.session_id,
    questionMd: row.question_md,
    questionType: row.question_type,
    choices: row.choices ? (JSON.parse(row.choices) as string[]) : null,
    correctAnswer: row.correct_answer,
    gradingNotes: row.grading_notes,
  };
}

export interface InsertExamQuestionInput {
  sessionId: string;
  questionMd: string;
  questionType: QuestionType;
  choices: string[] | null;
  correctAnswer: string;
  gradingNotes: string;
  rawAiResponse?: string;
}

export function insertExamQuestion(
  db: Database.Database,
  input: InsertExamQuestionInput,
): ExamQuestion {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO exam_questions (id, session_id, question_md, question_type, choices, correct_answer, grading_notes, raw_ai_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.sessionId,
    input.questionMd,
    input.questionType,
    input.choices ? JSON.stringify(input.choices) : null,
    input.correctAnswer,
    input.gradingNotes,
    input.rawAiResponse ?? null,
  );
  return mapRow(db.prepare('SELECT * FROM exam_questions WHERE id = ?').get(id) as ExamQuestionRow);
}

export function listExamQuestionsBySession(
  db: Database.Database,
  sessionId: string,
): ExamQuestion[] {
  const rows = db
    .prepare('SELECT * FROM exam_questions WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as ExamQuestionRow[];
  return rows.map(mapRow);
}
