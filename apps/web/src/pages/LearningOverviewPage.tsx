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

  if (isLoading) return <p className="loading-state">Loading your learning overview...</p>;
  if (error)
    return (
      <div className="alert alert--error" role="alert">
        You don&apos;t have a curriculum yet.
      </div>
    );
  if (!overview) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-header__title">Learning Overview</h1>
      </div>

      <section className="section card">
        <div className="section__header-row">
          <h2 className="section__title">Summary</h2>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh summary'}
          </button>
        </div>
        {overview.narrativeMd ? (
          <ExplanationView markdown={overview.narrativeMd} />
        ) : (
          <p>No summary yet - click refresh to generate one.</p>
        )}
      </section>

      <section className="section card">
        <h2 className="section__title">Topics</h2>
        <ul>
          {overview.topics.map((topic) => (
            <li className="topic-overview-row" key={topic.topicId}>
              <div className="topic-overview-row__head">
                <div>
                  <strong>{topic.title}</strong> <em>({topic.trackTitle})</em>
                </div>
                <span className="topic-overview-row__level">{topic.level}</span>
              </div>
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
