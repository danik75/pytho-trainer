import type { ExecutionResult } from '@pytho-trainer/shared';

export function ExecutionResultPanel({ result }: { result: ExecutionResult }) {
  return (
    <div className="execution-result">
      {result.testResults.length > 0 && <h3>Test results</h3>}
      {result.timedOut && (
        <div className="alert alert--error" role="alert">
          Execution timed out.
        </div>
      )}
      {result.testResults.length > 0 && (
        <ul className="test-result-list">
          {result.testResults.map((test) => (
            <li
              className={`test-result ${test.passed ? 'test-result--pass' : 'test-result--fail'}`}
              key={test.name}
            >
              <span>{test.passed ? '✓' : '✗'}</span>
              <span>
                {test.name}
                {!test.passed && test.details ? ` — ${test.details}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {result.stdout && (
        <>
          <h4>stdout</h4>
          <pre className="code-block">{result.stdout}</pre>
        </>
      )}
      {result.stderr && (
        <>
          <h4>stderr</h4>
          <pre className="code-block">{result.stderr}</pre>
        </>
      )}
      {!result.timedOut && result.testResults.length === 0 && !result.stdout && !result.stderr && (
        <p className="chat-empty">Ran with no output.</p>
      )}
    </div>
  );
}
