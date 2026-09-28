import type { CurriculumGeneration, TheoryGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { persistGeneratedCurriculum } from '../curricula/persistGeneratedCurriculum';
import { listRoadmapTopicsByTrack } from '../db/repositories/topics';
import { listTracksByCurriculum } from '../db/repositories/tracks';
import { getActiveCurriculum } from '../db/repositories/curricula';
import { InvalidStateError } from '../errors';
import { teachOnDemand } from './teachOnDemand';

const CURRICULUM: CurriculumGeneration = {
  title: 'Python Basics',
  summary: 'A gentle introduction.',
  tracks: [
    {
      kind: 'foundations',
      slug: 'foundations',
      title: 'Foundations',
      description: 'Core basics.',
      topics: [
        {
          title: 'Syntax',
          description: 'Python syntax basics.',
          learningObjectives: ['Write a script'],
          difficulty: 'intro',
        },
      ],
    },
  ],
};

const THEORY: TheoryGeneration = {
  explanationMd: '# Decorators\n\nFunctions that wrap other functions.',
  examQuestions: [
    {
      questionMd: 'What does a decorator do?',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'Wraps a function to extend its behavior.',
      gradingNotes: 'Accept any answer describing wrapping/extending behavior.',
    },
  ],
};

describe('teachOnDemand', () => {
  it('throws InvalidStateError when the user has no active curriculum', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    const aiClient = createFakeAiClient(THEORY);

    await expect(teachOnDemand(db, aiClient, LOCAL_USER_ID, 'Decorators')).rejects.toThrow(
      InvalidStateError,
    );
  });

  it('creates an on_demand topic and theory session attached to the foundations track', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    persistGeneratedCurriculum(db, LOCAL_USER_ID, CURRICULUM);
    const aiClient = createFakeAiClient(THEORY);

    const result = await teachOnDemand(db, aiClient, LOCAL_USER_ID, 'Decorators');

    expect(result.topic.origin).toBe('on_demand');
    expect(result.topic.title).toBe('Decorators');
    expect(result.session.sessionType).toBe('theory');
    expect(result.session.explanationMd).toBe(THEORY.explanationMd);
    expect(result.examQuestions).toHaveLength(1);

    const curriculum = getActiveCurriculum(db, LOCAL_USER_ID);
    const foundationsTrack = listTracksByCurriculum(db, curriculum!.id).find(
      (t) => t.kind === 'foundations',
    );
    expect(result.topic.trackId).toBe(foundationsTrack?.id);

    // The on-demand topic must never leak into the regular roadmap listing.
    const roadmapTopics = listRoadmapTopicsByTrack(db, foundationsTrack!.id);
    expect(roadmapTopics.some((t) => t.id === result.topic.id)).toBe(false);
  });
});
