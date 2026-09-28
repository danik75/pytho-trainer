import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOverview, refreshOverview } from '../api/client';
import { ExplanationView } from '../components/ExplanationView';
import { MasteryScoreBar } from '../components/MasteryScoreBar';
import { DifficultiesPanel } from '../components/DifficultiesPanel';
import { NextStepsPanel } from '../components/NextStepsPanel';

export function LearningOverviewPage() {
  const queryClient = useQueryClient();
  const {
    data: overview,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['overview'],
    queryFn: getOverview,
  });

  const refreshMutation = useMutation({
    mutationFn: refreshOverview,
    onSuccess: (updated) => queryClient.setQueryData(['overview'], updated),
  });

  if (isLoading) return <p>Loading your learning overview...</p>;
  if (error) return <p role="alert">You don’t have a curriculum yet.</p>;
  if (!overview) return null;

  return (
    <div>
      <h1>Learning Overview</h1>

      <section>
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? 'Refreshing summary...' : 'Refresh summary'}
        </button>
        {overview.narrativeMd ? (
          <ExplanationView markdown={overview.narrativeMd} />
        ) : (
          <p>No summary yet - click refresh to generate one.</p>
        )}
      </section>

      <section>
        <h2>Topics</h2>
        <ul>
          {overview.topics.map((topic) => (
            <li key={topic.topicId}>
              <strong>{topic.title}</strong> <em>({topic.trackTitle})</em> - {topic.level}
              <MasteryScoreBar score={topic.masteryScore} />
            </li>
          ))}
        </ul>
      </section>

      <DifficultiesPanel
        difficulties={overview.difficulties}
        strugglingTopics={overview.strugglingTopics}
      />
      <NextStepsPanel nextSteps={overview.nextSteps} />
    </div>
  );
}
