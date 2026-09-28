import type { LearningOverview } from '@pytho-trainer/shared';

export function NextStepsPanel({ nextSteps }: { nextSteps: LearningOverview['nextSteps'] }) {
  return (
    <section className="section card">
      <h2 className="section__title">Next steps</h2>
      {nextSteps.length > 0 ? (
        <ul className="next-steps-list">
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
