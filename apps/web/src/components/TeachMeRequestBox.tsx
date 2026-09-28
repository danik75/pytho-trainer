import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { teachOnDemand } from '../api/client';

export function TeachMeRequestBox() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');

  const mutation = useMutation({
    mutationFn: () => teachOnDemand(topic.trim()),
    onSuccess: (result) => navigate(`/sessions/${result.session.id}`),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (topic.trim()) mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="teach-topic">Ask the tutor to teach you something</label>
      <input
        id="teach-topic"
        type="text"
        placeholder="e.g. decorators, list comprehensions..."
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        disabled={mutation.isPending}
      />
      <button type="submit" disabled={mutation.isPending || !topic.trim()}>
        {mutation.isPending ? 'Preparing lesson...' : 'Teach me'}
      </button>
      {mutation.isError && <p role="alert">{(mutation.error as Error).message}</p>}
    </form>
  );
}
