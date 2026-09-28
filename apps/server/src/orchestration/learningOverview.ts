import type {
  LearningOverviewTopicSummary,
  MasteryLevel,
  MasteryStatus,
  RoadmapEntry,
  TopicOrigin,
} from '@pytho-trainer/shared';

export interface TopicMasteryRow {
  topicId: string;
  title: string;
  trackTitle: string;
  origin: TopicOrigin;
  masteryScore: number;
  attemptsCount: number;
  status: MasteryStatus;
  weakSpots: string[];
}

export interface StructuredLearningOverview {
  topics: LearningOverviewTopicSummary[];
  difficulties: Array<{ weakSpot: string; occurrences: number }>;
  strugglingTopics: LearningOverviewTopicSummary[];
  nextSteps: LearningOverviewTopicSummary[];
}

const PROFICIENT_SCORE_THRESHOLD = 0.5;
const MAX_NEXT_STEPS = 3;
const ON_DEMAND_TRACK_LABEL = 'On-demand';

export function mapMasteryToLevel(status: MasteryStatus, masteryScore: number): MasteryLevel {
  if (status === 'mastered') return 'mastered';
  if (status === 'not_started') return 'not_started';
  return masteryScore >= PROFICIENT_SCORE_THRESHOLD ? 'proficient' : 'developing';
}

/**
 * Pure aggregation over already-loaded rows - no DB/AI calls here, so the
 * levels/difficulties/next-steps logic is unit-testable on its own. The
 * narrative summary (AI-authored, cached separately) is layered on top by
 * the caller, not computed here.
 */
export function computeLearningOverview(
  topicRows: TopicMasteryRow[],
  roadmapEntries: RoadmapEntry[],
): StructuredLearningOverview {
  const topics: LearningOverviewTopicSummary[] = topicRows.map((row) => ({
    topicId: row.topicId,
    title: row.title,
    trackTitle: row.trackTitle,
    masteryScore: row.masteryScore,
    level: mapMasteryToLevel(row.status, row.masteryScore),
    attemptsCount: row.attemptsCount,
    status: row.status,
  }));

  const strugglingTopics = topics.filter((topic) => topic.status === 'struggling');

  const weakSpotCounts = new Map<string, number>();
  for (const row of topicRows) {
    for (const spot of row.weakSpots) {
      weakSpotCounts.set(spot, (weakSpotCounts.get(spot) ?? 0) + 1);
    }
  }
  const difficulties = Array.from(weakSpotCounts.entries())
    .map(([weakSpot, occurrences]) => ({ weakSpot, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const topicById = new Map(topics.map((topic) => [topic.topicId, topic]));
  const upcomingFromRoadmap = [...roadmapEntries]
    .filter((entry) => entry.status === 'available' || entry.status === 'locked')
    .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
    .slice(0, MAX_NEXT_STEPS)
    .map((entry) => topicById.get(entry.topicId))
    .filter((topic): topic is LearningOverviewTopicSummary => Boolean(topic));

  const inProgressOnDemand = topics.filter(
    (topic) => topic.trackTitle === ON_DEMAND_TRACK_LABEL && topic.status === 'in_progress',
  );

  return {
    topics,
    difficulties,
    strugglingTopics,
    nextSteps: [...upcomingFromRoadmap, ...inProgressOnDemand],
  };
}

export { ON_DEMAND_TRACK_LABEL };
