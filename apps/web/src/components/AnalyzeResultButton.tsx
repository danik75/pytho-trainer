import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExecutionResult } from '@pytho-trainer/shared';
import { analyzeExecutionResult } from '../api/client';
import { ExplanationView } from './ExplanationView';
import { Spinner } from './Spinner';

interface AnalyzeResultButtonProps {
  exerciseId: string;
  code: string;
  executionResult: ExecutionResult;
}

// Explains a Run/Submit result in plain language (what the output/error
// means, why a test failed) without requiring the student to retype all of
// that context into the tutor chat themselves. Reuses the same chat thread
// (and its query key) so the explanation also shows up if they open Chat.
export function AnalyzeResultButton({
  exerciseId,
  code,
  executionResult,
}: AnalyzeResultButtonProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => analyzeExecutionResult(exerciseId, code, executionResult),
    onSuccess: (messages) => queryClient.setQueryData(['exerciseHelp', exerciseId], messages),
  });

  const lastAnswer = mutation.data?.[mutation.data.length - 1];

  return (
    <div className="analyze-result">
      <button
        type="button"
        className="btn btn--secondary btn--small"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <>
            <Spinner /> Analyzing...
          </>
        ) : (
          '🔍 Analyze result'
        )}
      </button>
      {mutation.isError && (
        <div className="alert alert--error alert--after-action" role="alert">
          {(mutation.error as Error).message}
        </div>
      )}
      {lastAnswer && (
        <div className="analyze-result__answer">
          <ExplanationView markdown={lastAnswer.content} />
        </div>
      )}
    </div>
  );
}
