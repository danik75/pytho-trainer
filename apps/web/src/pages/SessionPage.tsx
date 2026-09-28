import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Exercise, SessionDecision } from '@pytho-trainer/shared';
import {
  ApiError,
  getCurrentExercise,
  getExamQuestions,
  getSession,
  submitExamAnswers,
  submitExerciseCode,
  type TheorySessionResult,
} from '../api/client';
import { ExplanationView } from '../components/ExplanationView';
import { CodeEditor } from '../components/CodeEditor';
import { ExecutionResultPanel } from '../components/ExecutionResultPanel';
import { EvaluationFeedback } from '../components/EvaluationFeedback';
import { ExamForm } from '../components/ExamForm';

function DecisionOutcome({
  decision,
  nextExercise,
  theorySession,
}: {
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
}) {
  if (decision === 'advance_topic') {
    return (
      <p>
        🎉 Topic mastered! <Link to="/roadmap">Back to roadmap</Link>
      </p>
    );
  }
  if (decision === 'flag_struggling') {
    return (
      <p>
        This topic needs another approach - it’s been flagged for review.{' '}
        <Link to="/roadmap">Back to roadmap</Link>
      </p>
    );
  }
  if (decision === 'insert_theory_session' && theorySession) {
    return (
      <p>
        Let’s review the theory first.{' '}
        <Link to={`/sessions/${theorySession.session.id}`}>Go to theory session</Link>
      </p>
    );
  }
  if (nextExercise) {
    return <p>Next exercise is ready below (or reload if it doesn’t appear).</p>;
  }
  return null;
}

function ExerciseSession({
  sessionId,
  explanationMd,
}: {
  sessionId: string;
  explanationMd: string;
}) {
  const { data: initialExercise, isLoading } = useQuery({
    queryKey: ['currentExercise', sessionId],
    queryFn: () => getCurrentExercise(sessionId),
  });

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (initialExercise) {
      setExercise(initialExercise);
      setCode(initialExercise.starterCode);
    }
  }, [initialExercise]);

  const mutation = useMutation({
    mutationFn: () => submitExerciseCode(exercise!.id, code),
    onSuccess: (outcome) => {
      if (outcome.decision === 'next_exercise' && outcome.nextExercise) {
        setExercise(outcome.nextExercise);
        setCode(outcome.nextExercise.starterCode);
      }
    },
  });

  if (isLoading || !exercise) return <p>Loading exercise...</p>;

  return (
    <div>
      <ExplanationView markdown={explanationMd} />
      <h2>Exercise</h2>
      <ExplanationView markdown={exercise.prompt} />
      <CodeEditor value={code} onChange={setCode} />
      <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Running...' : 'Submit'}
      </button>
      {mutation.isError && <p role="alert">{(mutation.error as Error).message}</p>}
      {mutation.data && (
        <div>
          <ExecutionResultPanel submission={mutation.data.result} />
          {mutation.data.result.aiEvaluation && (
            <EvaluationFeedback evaluation={mutation.data.result.aiEvaluation} />
          )}
          <DecisionOutcome
            decision={mutation.data.decision}
            nextExercise={mutation.data.nextExercise}
            theorySession={mutation.data.theorySession}
          />
        </div>
      )}
      <p>
        <Link to="/roadmap">Back to roadmap</Link>
      </p>
    </div>
  );
}

function TheorySessionView({
  sessionId,
  explanationMd,
}: {
  sessionId: string;
  explanationMd: string;
}) {
  const { data: questions, isLoading } = useQuery({
    queryKey: ['examQuestions', sessionId],
    queryFn: () => getExamQuestions(sessionId),
  });

  const mutation = useMutation({
    mutationFn: (answers: Record<string, string>) => submitExamAnswers(sessionId, answers),
  });

  if (isLoading || !questions) return <p>Loading lesson...</p>;

  return (
    <div>
      <ExplanationView markdown={explanationMd} />
      <h2>Check your understanding</h2>
      {!mutation.data && (
        <ExamForm
          questions={questions}
          disabled={mutation.isPending}
          onSubmit={(answers) => mutation.mutate(answers)}
        />
      )}
      {mutation.isError && <p role="alert">{(mutation.error as Error).message}</p>}
      {mutation.data && (
        <div>
          <h3>Score: {Math.round(mutation.data.result.score * 100)}%</h3>
          <ExplanationView markdown={mutation.data.result.aiFeedback.overall} />
          <DecisionOutcome
            decision={mutation.data.decision}
            nextExercise={mutation.data.nextExercise}
            theorySession={mutation.data.theorySession}
          />
          {mutation.data.decision === 'next_exercise' && mutation.data.nextExercise && (
            <p>
              <Link to={`/sessions/${mutation.data.nextExercise.sessionId}`}>
                Continue to next exercise
              </Link>
            </p>
          )}
        </div>
      )}
      <p>
        <Link to="/roadmap">Back to roadmap</Link>
      </p>
    </div>
  );
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    data: session,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId!),
    enabled: Boolean(sessionId),
  });

  if (isLoading) return <p>Loading session...</p>;
  if (error) {
    const message = error instanceof ApiError ? error.message : 'Could not load session.';
    return <p role="alert">{message}</p>;
  }
  if (!session || !sessionId) return null;

  return session.sessionType === 'exercise' ? (
    <ExerciseSession sessionId={sessionId} explanationMd={session.explanationMd} />
  ) : (
    <TheorySessionView sessionId={sessionId} explanationMd={session.explanationMd} />
  );
}
