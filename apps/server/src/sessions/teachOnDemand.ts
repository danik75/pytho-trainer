import type Database from 'better-sqlite3';
import type { ExamQuestion, StudySession, Topic } from '@pytho-trainer/shared';
import type { AiClient } from '../ai/client';
import { generateTheorySession } from '../ai/theory';
import { getActiveCurriculum } from '../db/repositories/curricula';
import { listTracksByCurriculum } from '../db/repositories/tracks';
import { insertTopic } from '../db/repositories/topics';
import { insertMasteryRecord } from '../db/repositories/mastery';
import { insertStudySession } from '../db/repositories/sessions';
import { insertExamQuestion } from '../db/repositories/examQuestions';
import { InvalidStateError } from '../errors';

export interface TeachOnDemandResult {
  topic: Topic;
  session: StudySession;
  examQuestions: ExamQuestion[];
}

/**
 * Handles an ad hoc "teach me X" request: creates a topic with
 * origin='on_demand' (excluded from the regular roadmap view and never
 * gating/reordering it) plus its own mastery record and theory session.
 */
export async function teachOnDemand(
  db: Database.Database,
  aiClient: AiClient,
  userId: string,
  topicName: string,
): Promise<TeachOnDemandResult> {
  const curriculum = getActiveCurriculum(db, userId);
  if (!curriculum) {
    throw new InvalidStateError('Generate a curriculum before requesting an on-demand topic');
  }

  const foundationsTrack = listTracksByCurriculum(db, curriculum.id).find(
    (track) => track.kind === 'foundations',
  );
  if (!foundationsTrack) {
    throw new InvalidStateError('Curriculum has no foundations track to attach the topic to');
  }

  const generation = await generateTheorySession(aiClient, {
    topic: topicName,
    context: '',
    focusAreas: [],
  });

  const persist = db.transaction(() => {
    const topic = insertTopic(db, {
      trackId: foundationsTrack.id,
      origin: 'on_demand',
      orderIndex: 0,
      title: topicName,
      description: `On-demand topic: ${topicName}`,
      learningObjectives: [],
      difficulty: 'core',
    });
    insertMasteryRecord(db, topic.id);

    const session = insertStudySession(db, {
      topicId: topic.id,
      sessionType: 'theory',
      sessionNumber: 1,
      explanationMd: generation.explanationMd,
    });

    const examQuestions = generation.examQuestions.map((q) =>
      insertExamQuestion(db, {
        sessionId: session.id,
        questionMd: q.questionMd,
        questionType: q.questionType,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
        gradingNotes: q.gradingNotes,
        rawAiResponse: JSON.stringify(q),
      }),
    );

    return { topic, session, examQuestions };
  });

  return persist();
}
