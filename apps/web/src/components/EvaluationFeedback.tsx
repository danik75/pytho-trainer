import type { SubmissionEvaluation } from '@pytho-trainer/shared';
import { ExplanationView } from './ExplanationView';

export function EvaluationFeedback({ evaluation }: { evaluation: SubmissionEvaluation }) {
  const modifier = evaluation.correct
    ? 'evaluation-feedback--correct'
    : 'evaluation-feedback--incorrect';
  return (
    <div className={`evaluation-feedback ${modifier}`}>
      <h3>{evaluation.correct ? '✓ Correct' : '✗ Not quite'}</h3>
      <p>{evaluation.feedback}</p>
      {evaluation.identifiedWeakSpots.length > 0 && (
        <p>
          <strong>Areas to work on:</strong> {evaluation.identifiedWeakSpots.join(', ')}
        </p>
      )}
      {evaluation.idiomaticFeedback && (
        <div className="evaluation-feedback__idiomatic">
          <h4>💡 A more idiomatic approach</h4>
          <ExplanationView markdown={evaluation.idiomaticFeedback} />
        </div>
      )}
    </div>
  );
}
