import type { CurriculumGeneration } from '@pytho-trainer/shared';
import { createTestDb } from '../testUtils/createTestDb';
import { ensureLocalUser, LOCAL_USER_ID } from '../db/repositories/users';
import { persistGeneratedCurriculum } from './persistGeneratedCurriculum';
import { teachOnDemand } from '../sessions/teachOnDemand';
import { createFakeAiClient } from '../testUtils/fakeAiClient';
import { gatherLearningOverviewData } from './gatherLearningOverviewData';
import type { TheoryGeneration } from '@pytho-trainer/shared';

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
  explanationMd: '# Decorators',
  examQuestions: [
    {
      questionMd: 'What is a decorator?',
      questionType: 'short_answer',
      choices: null,
      correctAnswer: 'A function that wraps another function.',
      gradingNotes: '',
    },
  ],
};

describe('gatherLearningOverviewData', () => {
  it('returns null when there is no active curriculum', () => {
    const db = createTestDb();
    ensureLocalUser(db);
    expect(gatherLearningOverviewData(db, LOCAL_USER_ID)).toBeNull();
  });

  it('includes both roadmap and on-demand topics, labeling on-demand ones separately', async () => {
    const db = createTestDb();
    ensureLocalUser(db);
    persistGeneratedCurriculum(db, LOCAL_USER_ID, CURRICULUM);
    const aiClient = createFakeAiClient(THEORY);
    await teachOnDemand(db, aiClient, LOCAL_USER_ID, 'Decorators');

    const data = gatherLearningOverviewData(db, LOCAL_USER_ID);
    expect(data?.curriculumTitle).toBe('Python Basics');
    expect(data?.topicRows).toHaveLength(2);

    const roadmapTopic = data?.topicRows.find((row) => row.title === 'Syntax');
    expect(roadmapTopic?.trackTitle).toBe('Foundations');

    const onDemandTopic = data?.topicRows.find((row) => row.title === 'Decorators');
    expect(onDemandTopic?.trackTitle).toBe('On-demand');
    expect(onDemandTopic?.origin).toBe('on_demand');

    expect(data?.roadmapEntries).toHaveLength(1);
  });
});
