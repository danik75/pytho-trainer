import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Exercise } from '@pytho-trainer/shared';
import { askExerciseHelp, getExerciseHelp } from '../api/client';
import { ExplanationView } from './ExplanationView';

interface ExerciseChatPanelProps {
  exercise: Exercise;
  code: string;
}

export function ExerciseChatPanel({ exercise, code }: ExerciseChatPanelProps) {
  const [question, setQuestion] = useState('');
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ['exerciseHelp', exercise.id],
    queryFn: () => getExerciseHelp(exercise.id),
  });

  const mutation = useMutation({
    mutationFn: () => askExerciseHelp(exercise.id, question.trim(), code),
    onSuccess: (updated) => {
      queryClient.setQueryData(['exerciseHelp', exercise.id], updated);
      setQuestion('');
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim()) mutation.mutate();
  }

  return (
    <div className="tutor-sidebar__chat">
      <div className="chat-thread">
        {messages?.length ? (
          messages.map((message) => (
            <div className={`chat-message chat-message--${message.role}`} key={message.id}>
              <ExplanationView markdown={message.content} />
            </div>
          ))
        ) : (
          <p className="chat-empty">
            Stuck on the syntax, or want a hint? Ask anything about this exercise.
          </p>
        )}
        {mutation.isPending && (
          <div className="chat-message chat-message--assistant chat-message--pending">
            Thinking...
          </div>
        )}
      </div>
      {mutation.isError && (
        <div className="alert alert--error alert--after-action" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}
      <p className="chat-hint">
        {code.trim()
          ? 'Your current code is included automatically.'
          : 'Write some code first, or just ask.'}
      </p>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="e.g. what does this error mean?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          className="btn btn--primary btn--small"
          disabled={mutation.isPending || !question.trim()}
        >
          Ask
        </button>
      </form>
    </div>
  );
}
