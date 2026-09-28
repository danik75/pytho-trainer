import type { RoadmapEntry } from '@pytho-trainer/shared';
import {
  computeLearningOverview,
  mapMasteryToLevel,
  type TopicMasteryRow,
} from './learningOverview';

describe('mapMasteryToLevel', () => {
  it('maps mastered status to mastered regardless of score', () => {
    expect(mapMasteryToLevel('mastered', 0.1)).toBe('mastered');
  });

  it('maps not_started status to not_started regardless of score', () => {
    expect(mapMasteryToLevel('not_started', 0.9)).toBe('not_started');
  });

  it('maps in_progress with a low score to developing', () => {
    expect(mapMasteryToLevel('in_progress', 0.2)).toBe('developing');
  });

  it('maps in_progress with a high enough score to proficient', () => {
    expect(mapMasteryToLevel('in_progress', 0.6)).toBe('proficient');
  });

  it('maps struggling to developing when score is low', () => {
    expect(mapMasteryToLevel('struggling', 0.1)).toBe('developing');
  });
});

function makeRow(overrides: Partial<TopicMasteryRow>): TopicMasteryRow {
  return {
    topicId: 't1',
    title: 'Topic',
    trackTitle: 'Foundations',
    origin: 'roadmap',
    masteryScore: 0,
    attemptsCount: 0,
    status: 'not_started',
    weakSpots: [],
    ...overrides,
  };
}

describe('computeLearningOverview', () => {
  it('maps each topic row to a summary with the right level', () => {
    const rows = [
      makeRow({ topicId: 't1', title: 'Variables', masteryScore: 0.9, status: 'mastered' }),
    ];
    const overview = computeLearningOverview(rows, []);

    expect(overview.topics).toEqual([
      {
        topicId: 't1',
        title: 'Variables',
        trackTitle: 'Foundations',
        masteryScore: 0.9,
        level: 'mastered',
        attemptsCount: 0,
        status: 'mastered',
      },
    ]);
  });

  it('collects struggling topics separately', () => {
    const rows = [
      makeRow({ topicId: 't1', status: 'struggling' }),
      makeRow({ topicId: 't2', status: 'in_progress' }),
    ];
    const overview = computeLearningOverview(rows, []);
    expect(overview.strugglingTopics.map((t) => t.topicId)).toEqual(['t1']);
  });

  it('ranks difficulties by frequency across topics', () => {
    const rows = [
      makeRow({ topicId: 't1', weakSpots: ['loops', 'recursion'] }),
      makeRow({ topicId: 't2', weakSpots: ['loops'] }),
    ];
    const overview = computeLearningOverview(rows, []);
    expect(overview.difficulties[0]).toEqual({ weakSpot: 'loops', occurrences: 2 });
    expect(overview.difficulties[1]).toEqual({ weakSpot: 'recursion', occurrences: 1 });
  });

  it('picks the next available/locked roadmap topics in sequence order, capped at 3', () => {
    const rows = [
      makeRow({ topicId: 't1', title: 'A' }),
      makeRow({ topicId: 't2', title: 'B' }),
      makeRow({ topicId: 't3', title: 'C' }),
      makeRow({ topicId: 't4', title: 'D' }),
      makeRow({ topicId: 't5', title: 'Mastered', status: 'mastered' }),
    ];
    const roadmapEntries: RoadmapEntry[] = [
      {
        id: 'r5',
        curriculumId: 'c',
        topicId: 't5',
        sequenceIndex: 0,
        status: 'mastered',
        unlockedAt: null,
        masteredAt: null,
      },
      {
        id: 'r1',
        curriculumId: 'c',
        topicId: 't1',
        sequenceIndex: 1,
        status: 'available',
        unlockedAt: null,
        masteredAt: null,
      },
      {
        id: 'r2',
        curriculumId: 'c',
        topicId: 't2',
        sequenceIndex: 2,
        status: 'locked',
        unlockedAt: null,
        masteredAt: null,
      },
      {
        id: 'r3',
        curriculumId: 'c',
        topicId: 't3',
        sequenceIndex: 3,
        status: 'locked',
        unlockedAt: null,
        masteredAt: null,
      },
      {
        id: 'r4',
        curriculumId: 'c',
        topicId: 't4',
        sequenceIndex: 4,
        status: 'locked',
        unlockedAt: null,
        masteredAt: null,
      },
    ];

    const overview = computeLearningOverview(rows, roadmapEntries);
    expect(overview.nextSteps.map((t) => t.topicId)).toEqual(['t1', 't2', 't3']);
  });

  it('includes in-progress on-demand topics in next steps', () => {
    const rows = [
      makeRow({
        topicId: 't1',
        title: 'On-demand topic',
        trackTitle: 'On-demand',
        status: 'in_progress',
        origin: 'on_demand',
      }),
    ];
    const overview = computeLearningOverview(rows, []);
    expect(overview.nextSteps.map((t) => t.topicId)).toEqual(['t1']);
  });

  it('excludes a not-yet-started on-demand topic from next steps', () => {
    const rows = [
      makeRow({
        topicId: 't1',
        trackTitle: 'On-demand',
        status: 'not_started',
        origin: 'on_demand',
      }),
    ];
    const overview = computeLearningOverview(rows, []);
    expect(overview.nextSteps).toEqual([]);
  });

  it('returns empty collections for an empty curriculum', () => {
    const overview = computeLearningOverview([], []);
    expect(overview).toEqual({ topics: [], difficulties: [], strugglingTopics: [], nextSteps: [] });
  });
});
