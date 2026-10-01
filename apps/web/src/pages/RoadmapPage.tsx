import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getRoadmap, startTopic, ApiError } from '../api/client';
import { TeachMeRequestBox } from '../components/TeachMeRequestBox';
import { Spinner } from '../components/Spinner';

const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  mastered: 'Mastered',
};

function StartTopicButton({ topicId, roadmapStatus }: { topicId: string; roadmapStatus: string }) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => startTopic(topicId),
    onSuccess: (result) => navigate(`/sessions/${result.session.id}`),
  });

  if (roadmapStatus !== 'available' && roadmapStatus !== 'in_progress') return null;

  return (
    <button
      type="button"
      className="btn btn--primary btn--small"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? (
        <>
          <Spinner /> Starting...
        </>
      ) : roadmapStatus === 'available' ? (
        'Start'
      ) : (
        'Continue'
      )}
    </button>
  );
}

export function RoadmapPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['roadmap'],
    queryFn: getRoadmap,
    retry: (failureCount, err) =>
      !(err instanceof ApiError && err.status === 404) && failureCount < 2,
  });

  if (isLoading) return <p className="loading-state">Loading your roadmap...</p>;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="empty-state">
        <p>You don&apos;t have a curriculum yet.</p>
        <Link to="/onboarding" className="btn btn--primary">
          Set up your curriculum
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert--error" role="alert">
        Could not load your roadmap: {(error as Error).message}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-header__title">{data.title}</h1>
        <p className="page-header__subtitle">{data.summary}</p>
      </div>

      <p>
        <Link to="/overview">View learning overview →</Link>
      </p>

      {data.tracks.map((track) => (
        <section className="track" key={track.trackId}>
          <div className="track__header">
            <h2>{track.title}</h2>
            {track.kind === 'foundations' && (
              <span className="badge badge--available">Foundations</span>
            )}
          </div>
          <p className="track__description">{track.description}</p>
          <ul className="topic-list">
            {track.topics.map((topic) => (
              <li className="topic-row" key={topic.topicId}>
                <div className="topic-row__main">
                  <div className="topic-row__title">{topic.title}</div>
                  <div className="topic-row__meta">
                    <span className={`badge badge--${topic.roadmapStatus}`}>
                      {STATUS_LABELS[topic.roadmapStatus]}
                    </span>
                    <span>{Math.round(topic.masteryScore * 100)}% mastery</span>
                  </div>
                </div>
                <div className="topic-row__mastery">
                  <div className="progress">
                    <div
                      className="progress__bar"
                      style={{
                        width: `${Math.round(topic.masteryScore * 100)}%`,
                        background:
                          topic.masteryScore >= 0.8
                            ? 'var(--color-success)'
                            : topic.masteryScore >= 0.5
                              ? 'var(--color-warning)'
                              : 'var(--color-danger)',
                      }}
                    />
                  </div>
                </div>
                <StartTopicButton topicId={topic.topicId} roadmapStatus={topic.roadmapStatus} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="card">
        <TeachMeRequestBox />
      </section>
    </div>
  );
}
