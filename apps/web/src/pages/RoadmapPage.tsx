import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  getRoadmap,
  requestAdditionalPractice,
  resetTopic,
  startTopic,
  ApiError,
} from '../api/client';
import { TeachMeRequestBox } from '../components/TeachMeRequestBox';
import { Spinner } from '../components/Spinner';

const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  mastered: 'Mastered',
};

function TopicActions({ topicId, roadmapStatus }: { topicId: string; roadmapStatus: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const startMutation = useMutation({
    mutationFn: () => startTopic(topicId),
    onSuccess: (result) => navigate(`/sessions/${result.session.id}`),
  });

  const practiceMutation = useMutation({
    mutationFn: () => requestAdditionalPractice(topicId),
    onSuccess: (result) => navigate(`/sessions/${result.session.id}`),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetTopic(topicId),
    onSuccess: async () => {
      setConfirmingReset(false);
      await queryClient.invalidateQueries({ queryKey: ['roadmap'] });
    },
  });

  const canReset = roadmapStatus === 'in_progress' || roadmapStatus === 'mastered';

  if (confirmingReset) {
    return (
      <span className="reset-confirm">
        Reset all progress on this topic?
        <button
          type="button"
          className="btn btn--danger btn--small"
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? <Spinner /> : 'Yes, reset'}
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => setConfirmingReset(false)}
          disabled={resetMutation.isPending}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <div className="topic-row__actions">
      {(roadmapStatus === 'available' || roadmapStatus === 'in_progress') && (
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
        >
          {startMutation.isPending ? (
            <>
              <Spinner /> Starting...
            </>
          ) : roadmapStatus === 'available' ? (
            'Start'
          ) : (
            'Continue'
          )}
        </button>
      )}

      {roadmapStatus === 'mastered' && (
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={() => practiceMutation.mutate()}
          disabled={practiceMutation.isPending}
        >
          {practiceMutation.isPending ? (
            <>
              <Spinner /> Preparing...
            </>
          ) : (
            '↑ Practice more'
          )}
        </button>
      )}

      {canReset && (
        <button type="button" className="link-button" onClick={() => setConfirmingReset(true)}>
          Reset
        </button>
      )}

      {(practiceMutation.isError || resetMutation.isError) && (
        <span className="chat-empty">
          {((practiceMutation.error ?? resetMutation.error) as Error).message}
        </span>
      )}
    </div>
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
                <div className="topic-row__top">
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
                  <TopicActions topicId={topic.topicId} roadmapStatus={topic.roadmapStatus} />
                </div>
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
