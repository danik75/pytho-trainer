import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { teachOnDemand } from '../api/client';
import { Spinner } from './Spinner';

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
      <div className="form-field form-field--tight">
        <label className="form-label" htmlFor="teach-topic">
          Ask the tutor to teach you something
        </label>
        <div className="inline-add">
          <input
            id="teach-topic"
            type="text"
            placeholder="e.g. decorators, list comprehensions..."
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            disabled={mutation.isPending}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={mutation.isPending || !topic.trim()}
          >
            {mutation.isPending ? (
              <>
                <Spinner /> Preparing...
              </>
            ) : (
              'Teach me'
            )}
          </button>
        </div>
        {mutation.isPending && (
          <p className="loading-hint">
            <Spinner /> Writing a lesson and quiz - this can take up to 30 seconds.
          </p>
        )}
      </div>
      {mutation.isError && (
        <div className="alert alert--error" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}
    </form>
  );
}
