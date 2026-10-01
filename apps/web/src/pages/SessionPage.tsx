import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Exercise, SessionDecision } from '@pytho-trainer/shared';
import {
  ApiError,
  getCurrentExercise,
  getExamQuestions,
  getSession,
  runExerciseCode,
  submitExamAnswers,
  submitExerciseCode,
  type TheorySessionResult,
} from '../api/client';
import { ExplanationView } from '../components/ExplanationView';
import { CodeEditor } from '../components/CodeEditor';
import { ExecutionResultPanel } from '../components/ExecutionResultPanel';
import { EvaluationFeedback } from '../components/EvaluationFeedback';
import { ExamForm } from '../components/ExamForm';
import { TutorSidebar } from '../components/TutorSidebar';
import { Spinner } from '../components/Spinner';

function DecisionOutcome({
  decision,
  nextExercise,
  theorySession,
  onContinue,
}: {
  decision: SessionDecision;
  nextExercise: Exercise | null;
  theorySession: TheorySessionResult | null;
  onContinue: () => void;
}) {
  if (decision === 'advance_topic') {
    return (
      <div className="alert alert--success decision-banner">
        🎉 Topic mastered! <Link to="/roadmap">Back to roadmap</Link>
      </div>
    );
  }
  if (decision === 'flag_struggling') {
    return (
      <div className="alert alert--info decision-banner">
        This topic needs another approach - it&apos;s been flagged for review.{' '}
        <Link to="/roadmap">Back to roadmap</Link>
      </div>
    );
  }
  if (decision === 'insert_theory_session' && theorySession) {
    return (
      <div className="alert alert--info decision-banner">
        Let&apos;s review the theory first.{' '}
        <Link to={`/sessions/${theorySession.session.id}`}>Go to theory session</Link>
      </div>
    );
  }
  if (nextExercise) {
    return (
      <div className="decision-banner">
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Continue to next exercise →
        </button>
      </div>
    );
  }
  return null;
}

type ExercisePageTab = 'exercise' | 'code';

interface ExerciseDraft {
  code: string;
  activeTab: ExercisePageTab;
}

const DRAFT_STORAGE_PREFIX = 'pytho-trainer-draft:';

// Drafts live in localStorage (not the backend) so returning to an exercise -
// via a page reload, the back button, or just revisiting the roadmap - never
// silently discards code the student already wrote, without needing a
// "save" step for work that was never submitted.
function loadExerciseDraft(exerciseId: string): ExerciseDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_PREFIX + exerciseId);
    return raw ? (JSON.parse(raw) as ExerciseDraft) : null;
  } catch {
    return null;
  }
}

function saveExerciseDraft(exerciseId: string, draft: ExerciseDraft): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_PREFIX + exerciseId, JSON.stringify(draft));
  } catch {
    // ignore - the draft just won't persist (e.g. private browsing)
  }
}

function clearExerciseDraft(exerciseId: string): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_PREFIX + exerciseId);
  } catch {
    // ignore
  }
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
  const [activeTab, setActiveTab] = useState<ExercisePageTab>('exercise');

  useEffect(() => {
    if (initialExercise) {
      const draft = loadExerciseDraft(initialExercise.id);
      setExercise(initialExercise);
      setCode(draft?.code ?? initialExercise.starterCode);
      setActiveTab(draft?.activeTab ?? 'exercise');
    }
  }, [initialExercise]);

  // Persist whatever the student has typed (and which tab they're on) as
  // they go, so it survives a reload or navigating away before they submit.
  useEffect(() => {
    if (exercise) {
      saveExerciseDraft(exercise.id, { code, activeTab });
    }
  }, [exercise, code, activeTab]);

  const runMutation = useMutation({
    mutationFn: () => runExerciseCode(exercise!.id, code),
  });

  const mutation = useMutation({
    mutationFn: () => submitExerciseCode(exercise!.id, code),
    onMutate: () => runMutation.reset(),
    onSuccess: (outcome) => {
      // Nothing more to come back and edit for this exercise once it's
      // mastered, flagged struggling, or handed off to a theory session.
      if (outcome.decision !== 'next_exercise' && exercise) {
        clearExerciseDraft(exercise.id);
      }
    },
  });

  function handleContinueToNextExercise() {
    if (mutation.data?.nextExercise && exercise) {
      clearExerciseDraft(exercise.id);
      const next = mutation.data.nextExercise;
      const draft = loadExerciseDraft(next.id);
      setExercise(next);
      setCode(draft?.code ?? next.starterCode);
      setActiveTab(draft?.activeTab ?? 'exercise');
      mutation.reset();
      runMutation.reset();
    }
  }

  if (isLoading || !exercise) return <p className="loading-state">Loading exercise...</p>;

  return (
    <div className="page page--wide session-page">
      <div className="session-layout">
        <div className="card session-panel">
          <div className="page-tabs">
            <button
              type="button"
              className={activeTab === 'exercise' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('exercise')}
            >
              Exercise
            </button>
            <button
              type="button"
              className={activeTab === 'code' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
          </div>

          <div className="session-panel__body">
            {activeTab === 'exercise' && (
              <div>
                {explanationMd && <ExplanationView markdown={explanationMd} />}
                <ExplanationView markdown={exercise.prompt} />
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setActiveTab('code')}
                >
                  Start coding →
                </button>
              </div>
            )}

            {activeTab === 'code' && (
              <div>
                <CodeEditor value={code} onChange={setCode} />
                <div className="button-row">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={runMutation.isPending || mutation.isPending}
                    onClick={() => runMutation.mutate()}
                  >
                    {runMutation.isPending ? (
                      <>
                        <Spinner /> Running...
                      </>
                    ) : (
                      '▶ Run'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate()}
                  >
                    {mutation.isPending ? (
                      <>
                        <Spinner /> Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
                {mutation.isPending && (
                  <p className="loading-hint">
                    <Spinner /> Running your code and asking the AI to evaluate it - this can take
                    up to 30 seconds.
                  </p>
                )}
                {runMutation.isError && (
                  <div className="alert alert--error alert--after-action" role="alert">
                    {(runMutation.error as Error).message}
                  </div>
                )}
                {runMutation.data && !mutation.data && (
                  <div className="session-block">
                    <h4>Quick run (not graded)</h4>
                    <ExecutionResultPanel result={runMutation.data} />
                  </div>
                )}
                {mutation.isError && (
                  <div className="alert alert--error alert--after-action" role="alert">
                    {(mutation.error as Error).message}
                  </div>
                )}
                {mutation.data && (
                  <div>
                    <ExecutionResultPanel result={mutation.data.result} />
                    {mutation.data.result.aiEvaluation && (
                      <EvaluationFeedback evaluation={mutation.data.result.aiEvaluation} />
                    )}
                    <DecisionOutcome
                      decision={mutation.data.decision}
                      nextExercise={mutation.data.nextExercise}
                      theorySession={mutation.data.theorySession}
                      onContinue={handleContinueToNextExercise}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <TutorSidebar exercise={exercise} code={code} />
      </div>
      <Link className="back-link" to="/roadmap">
        ← Back to roadmap
      </Link>
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

  if (isLoading || !questions) return <p className="loading-state">Loading lesson...</p>;

  return (
    <div className="page">
      {explanationMd && (
        <div className="card session-block">
          <ExplanationView markdown={explanationMd} />
        </div>
      )}

      <div className="card session-block">
        <h2>Check your understanding</h2>
        {!mutation.data && (
          <ExamForm
            questions={questions}
            disabled={mutation.isPending}
            onSubmit={(answers) => mutation.mutate(answers)}
          />
        )}
        {mutation.isPending && (
          <p className="loading-hint">
            <Spinner /> Grading your answers - this can take up to 30 seconds.
          </p>
        )}
        {mutation.isError && (
          <div className="alert alert--error alert--after-action" role="alert">
            {(mutation.error as Error).message}
          </div>
        )}
        {mutation.data && (
          <div>
            <div
              className={`alert ${mutation.data.result.score >= 0.8 ? 'alert--success' : 'alert--info'}`}
            >
              Score: {Math.round(mutation.data.result.score * 100)}%
            </div>
            <ExplanationView markdown={mutation.data.result.aiFeedback.overall} />
            {mutation.data.decision !== 'next_exercise' && (
              <DecisionOutcome
                decision={mutation.data.decision}
                nextExercise={mutation.data.nextExercise}
                theorySession={mutation.data.theorySession}
                onContinue={() => {}}
              />
            )}
            {mutation.data.decision === 'next_exercise' && mutation.data.nextExercise && (
              <p>
                <Link to={`/sessions/${mutation.data.nextExercise.sessionId}`}>
                  Continue to next exercise →
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
      <Link className="back-link" to="/roadmap">
        ← Back to roadmap
      </Link>
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

  if (isLoading) return <p className="loading-state">Loading session...</p>;
  if (error) {
    const message = error instanceof ApiError ? error.message : 'Could not load session.';
    return (
      <div className="alert alert--error" role="alert">
        {message}
      </div>
    );
  }
  if (!session || !sessionId) return null;

  return session.sessionType === 'exercise' ? (
    <ExerciseSession sessionId={sessionId} explanationMd={session.explanationMd} />
  ) : (
    <TheorySessionView sessionId={sessionId} explanationMd={session.explanationMd} />
  );
}
