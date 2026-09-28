import type { LearningOverview } from '@pytho-trainer/shared';

interface DifficultiesPanelProps {
  difficulties: LearningOverview['difficulties'];
  strugglingTopics: LearningOverview['strugglingTopics'];
}

export function DifficultiesPanel({ difficulties, strugglingTopics }: DifficultiesPanelProps) {
  return (
    <section>
      <h2>Difficulties</h2>
      {strugglingTopics.length > 0 && (
        <div>
          <strong>Struggling topics:</strong>
          <ul>
            {strugglingTopics.map((topic) => (
              <li key={topic.topicId}>{topic.title}</li>
            ))}
          </ul>
        </div>
      )}
      {difficulties.length > 0 ? (
        <ul>
          {difficulties.map((difficulty) => (
            <li key={difficulty.weakSpot}>
              {difficulty.weakSpot} (seen {difficulty.occurrences}x)
            </li>
          ))}
        </ul>
      ) : (
        <p>No recurring difficulties identified yet.</p>
      )}
    </section>
  );
}
