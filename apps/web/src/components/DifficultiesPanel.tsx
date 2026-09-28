import type { LearningOverview } from '@pytho-trainer/shared';

interface DifficultiesPanelProps {
  difficulties: LearningOverview['difficulties'];
  strugglingTopics: LearningOverview['strugglingTopics'];
}

export function DifficultiesPanel({ difficulties, strugglingTopics }: DifficultiesPanelProps) {
  return (
    <section className="section card">
      <h2 className="section__title">Difficulties</h2>
      {strugglingTopics.length > 0 && (
        <div className="difficulties-group">
          <p>
            <strong>Struggling topics:</strong>
          </p>
          <ul className="difficulty-list">
            {strugglingTopics.map((topic) => (
              <li key={topic.topicId}>{topic.title}</li>
            ))}
          </ul>
        </div>
      )}
      {difficulties.length > 0 ? (
        <ul className="difficulty-list">
          {difficulties.map((difficulty) => (
            <li key={difficulty.weakSpot}>
              {difficulty.weakSpot} <span className="badge">seen {difficulty.occurrences}x</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No recurring difficulties identified yet.</p>
      )}
    </section>
  );
}
