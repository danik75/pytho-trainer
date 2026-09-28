import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRoadmap, ApiError } from '../api/client';

const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  mastered: 'Mastered',
};

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
                {Math.round(topic.masteryScore * 100)}%)
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
