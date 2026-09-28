import type { SubmissionEvaluation } from '@pytho-trainer/shared';

export function EvaluationFeedback({ evaluation }: { evaluation: SubmissionEvaluation }) {
  return (
    <div className="evaluation-feedback">
      <h3>{evaluation.correct ? '✓ Correct' : '✗ Not quite'}</h3>
      <p>{evaluation.feedback}</p>
      {evaluation.identifiedWeakSpots.length > 0 && (
        <p>
          <strong>Areas to work on:</strong> {evaluation.identifiedWeakSpots.join(', ')}
        </p>
      )}
    </div>
  );
}
