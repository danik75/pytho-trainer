import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Exercise, HiddenTestSpec, SessionDecision } from '@pytho-trainer/shared';
import {
  ApiError,
  getCurrentExercise,
  getExamQuestions,
  getExerciseAttempts,
  getSession,
  getTopic,
  runExerciseCode,
  submitExamAnswers,
  submitExerciseCode,
  type TheorySessionResult,
} from '../api/client';
import { ExplanationView } from '../components/ExplanationView';
import { CodeEditor } from '../components/CodeEditor';
import { ExecutionResultPanel } from '../components/ExecutionResultPanel';
import { AnalyzeResultButton } from '../components/AnalyzeResultButton';
import { EvaluationFeedback } from '../components/EvaluationFeedback';
import { ExamForm } from '../components/ExamForm';
import { TutorSidebar } from '../components/TutorSidebar';
import { SandboxPanel } from '../components/SandboxPanel';
import { MasteryScoreBar } from '../components/MasteryScoreBar';
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

type ExercisePageTab = 'exercise' | 'tests' | 'code' | 'sandbox' | 'solution' | 'results';

const SOLUTION_UNLOCK_ATTEMPTS = 3;

function formatTestCase(test: HiddenTestSpec): { call: string; outcome: string } {
  const call = `${test.functionName}(${test.args.map((arg) => JSON.stringify(arg)).join(', ')})`;
  const outcome = test.expectedError
    ? `Raises ${test.expectedError.type}${
        test.expectedError.message ? `("${test.expectedError.message}")` : ''
      }`
    : `Returns ${JSON.stringify(test.expected)}`;
  return { call, outcome };
}

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

const MASTERY_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  mastered: 'Mastered',
  struggling: 'Struggling',
};

// Shared by both session types so a student always knows what topic they're
// in and how far along they are, without having to go back to the roadmap.
function SessionTitleHeader({ topicId }: { topicId: string }) {
  const { data } = useQuery({
    queryKey: ['topic', topicId],
    queryFn: () => getTopic(topicId),
  });

  if (!data) return null;

  return (
    <div className="session-title">
      <h2>{data.topic.title}</h2>
      {data.mastery && (
        <div className="session-title__progress">
          <MasteryScoreBar score={data.mastery.masteryScore} />
          <span className="session-title__progress-label">
            {Math.round(data.mastery.masteryScore * 100)}% mastery ·{' '}
            {MASTERY_STATUS_LABELS[data.mastery.status] ?? data.mastery.status} ·{' '}
            {data.mastery.attemptsCount} attempt{data.mastery.attemptsCount === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
}

function ExerciseSession({
  sessionId,
  topicId,
  explanationMd,
}: {
  sessionId: string;
  topicId: string;
  explanationMd: string;
}) {
  const queryClient = useQueryClient();
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

  const attemptsQuery = useQuery({
    queryKey: ['exerciseAttempts', exercise?.id],
    queryFn: () => getExerciseAttempts(exercise!.id),
    enabled: Boolean(exercise),
  });

  const runMutation = useMutation({
    mutationFn: () => runExerciseCode(exercise!.id, code),
    onSettled: () => setActiveTab('results'),
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
    onSettled: () => {
      setActiveTab('results');
      // Refreshes the Solution tab's unlock state right after a failed
      // attempt, instead of waiting for an unrelated refetch.
      if (exercise) {
        void queryClient.invalidateQueries({ queryKey: ['exerciseAttempts', exercise.id] });
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
      <SessionTitleHeader topicId={topicId} />
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
              className={activeTab === 'tests' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('tests')}
            >
              Tests
            </button>
            <button
              type="button"
              className={activeTab === 'code' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
            <button
              type="button"
              className={activeTab === 'sandbox' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('sandbox')}
            >
              Sandbox
            </button>
            <button
              type="button"
              className={activeTab === 'solution' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('solution')}
            >
              Solution
            </button>
            <button
              type="button"
              className={activeTab === 'results' ? 'page-tab page-tab--active' : 'page-tab'}
              onClick={() => setActiveTab('results')}
            >
              Results
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

            {activeTab === 'tests' && (
              <div>
                <p className="chat-hint">
                  Your solution is checked against these exact cases - the same inputs, expected
                  return value or exception, and function call you&apos;ll see in the Results tab.
                </p>
                {exercise.hiddenTests.length > 0 ? (
                  <ul className="test-result-list">
                    {exercise.hiddenTests.map((test) => {
                      const { call, outcome } = formatTestCase(test);
                      return (
                        <li
                          className="test-result test-result--neutral test-result--block"
                          key={test.name}
                        >
                          <strong>{test.name}</strong>
                          <pre className="code-block">{call}</pre>
                          <span className="test-result__outcome">{outcome}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="chat-empty">This exercise has no hidden tests.</p>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              // Fills the tab's available height so only the editor scrolls
              // for long code - the Run/Submit row stays pinned below it,
              // never pushed off-screen by a tall editor.
              <div className="code-panel">
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
                    up to 30 seconds. Switching to the Results tab when it&apos;s done.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'sandbox' && (
              <div className="code-panel">
                <p className="chat-hint">
                  A separate scratch space - doesn&apos;t touch your exercise code, nothing here is
                  graded.
                </p>
                <SandboxPanel />
              </div>
            )}

            {activeTab === 'solution' && (
              <div>
                {attemptsQuery.isLoading ? (
                  <p className="loading-state">Loading...</p>
                ) : (attemptsQuery.data?.failedAttempts ?? 0) >= SOLUTION_UNLOCK_ATTEMPTS ? (
                  exercise.solutionCode ? (
                    <div>
                      <p className="chat-hint">
                        A reference solution, since you&apos;ve had a few attempts at this one.
                      </p>
                      <pre className="code-block">{exercise.solutionCode}</pre>
                      <ExplanationView markdown={exercise.solutionExplanationMd} />
                    </div>
                  ) : (
                    <p className="chat-empty">
                      No reference solution was generated for this exercise.
                    </p>
                  )
                ) : (
                  <div className="alert alert--info">
                    The solution unlocks after {SOLUTION_UNLOCK_ATTEMPTS} unsuccessful Submit
                    attempts on this exercise, so you get a real chance to work through it first.
                    You&apos;re at {attemptsQuery.data?.failedAttempts ?? 0}/
                    {SOLUTION_UNLOCK_ATTEMPTS}.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div>
                {!runMutation.data &&
                  !mutation.data &&
                  !runMutation.isError &&
                  !mutation.isError && (
                    <p className="chat-empty">
                      Nothing here yet - hit Run or Submit on the Code tab.
                    </p>
                  )}
                {runMutation.isError && (
                  <div className="alert alert--error" role="alert">
                    {(runMutation.error as Error).message}
                  </div>
                )}
                {runMutation.data && !mutation.data && (
                  <div className="session-block">
                    <h4>Quick run (not graded)</h4>
                    <ExecutionResultPanel result={runMutation.data} />
                    <AnalyzeResultButton
                      exerciseId={exercise.id}
                      code={code}
                      executionResult={runMutation.data}
                    />
                  </div>
                )}
                {mutation.isError && (
                  <div className="alert alert--error" role="alert">
                    {(mutation.error as Error).message}
                  </div>
                )}
                {mutation.data && (
                  <div>
                    <ExecutionResultPanel result={mutation.data.result} />
                    <AnalyzeResultButton
                      exerciseId={exercise.id}
                      code={code}
                      executionResult={mutation.data.result}
                    />
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
  topicId,
  explanationMd,
}: {
  sessionId: string;
  topicId: string;
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
      <SessionTitleHeader topicId={topicId} />
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
    <ExerciseSession
      sessionId={sessionId}
      topicId={session.topicId}
      explanationMd={session.explanationMd}
    />
  ) : (
    <TheorySessionView
      sessionId={sessionId}
      topicId={session.topicId}
      explanationMd={session.explanationMd}
    />
  );
}
