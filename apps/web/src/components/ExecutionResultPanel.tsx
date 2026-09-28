import type { Submission } from '@pytho-trainer/shared';

export function ExecutionResultPanel({ submission }: { submission: Submission }) {
  return (
    <div className="execution-result">
      <h3>Test results</h3>
      {submission.timedOut && <p role="alert">Execution timed out.</p>}
      <ul>
        {submission.testResults.map((test) => (
          <li key={test.name} style={{ color: test.passed ? '#2e7d32' : '#c62828' }}>
            {test.passed ? '✓' : '✗'} {test.name}
            {!test.passed && test.details ? ` — ${test.details}` : ''}
          </li>
        ))}
      </ul>
      {submission.stdout && (
        <>
          <h4>stdout</h4>
          <pre>{submission.stdout}</pre>
        </>
      )}
      {submission.stderr && (
        <>
          <h4>stderr</h4>
          <pre>{submission.stderr}</pre>
        </>
      )}
    </div>
  );
}
