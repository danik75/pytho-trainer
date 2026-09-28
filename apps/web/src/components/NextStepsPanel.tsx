import type { LearningOverview } from '@pytho-trainer/shared';

export function NextStepsPanel({ nextSteps }: { nextSteps: LearningOverview['nextSteps'] }) {
  return (
    <section>
      <h2>Next steps</h2>
      {nextSteps.length > 0 ? (
        <ul>
          {nextSteps.map((topic) => (
            <li key={topic.topicId}>
              {topic.title} <em>({topic.trackTitle})</em>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nothing queued up yet - check the roadmap.</p>
      )}
    </section>
  );
}
