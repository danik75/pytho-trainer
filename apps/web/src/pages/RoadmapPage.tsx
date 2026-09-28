import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getRoadmap, startTopic, ApiError } from '../api/client';
import { TeachMeRequestBox } from '../components/TeachMeRequestBox';

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
    <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? 'Starting...' : roadmapStatus === 'available' ? 'Start' : 'Continue'}
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

  if (isLoading) return <p>Loading your roadmap...</p>;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div>
        <p>You don’t have a curriculum yet.</p>
        <Link to="/onboarding">Set up your curriculum</Link>
      </div>
    );
  }

  if (error) {
    return <p role="alert">Could not load your roadmap: {(error as Error).message}</p>;
  }

  if (!data) return null;

  return (
    <div>
      <h1>{data.title}</h1>
      <p>{data.summary}</p>
      <p>
        <Link to="/overview">View learning overview</Link>
      </p>

      {data.tracks.map((track) => (
        <section key={track.trackId}>
          <h2>
            {track.title}
            {track.kind === 'foundations' ? ' (Foundations)' : ''}
          </h2>
          <p>{track.description}</p>
          <ul>
            {track.topics.map((topic) => (
              <li key={topic.topicId}>
                <strong>{topic.title}</strong> - {STATUS_LABELS[topic.roadmapStatus]} (mastery:{' '}
                {Math.round(topic.masteryScore * 100)}%){' '}
                <StartTopicButton topicId={topic.topicId} roadmapStatus={topic.roadmapStatus} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <TeachMeRequestBox />
      </section>
    </div>
  );
}
