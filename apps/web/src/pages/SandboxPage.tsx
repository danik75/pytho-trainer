import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runSandboxCode } from '../api/client';
import { CodeEditor } from '../components/CodeEditor';
import { ExecutionResultPanel } from '../components/ExecutionResultPanel';
import { Spinner } from '../components/Spinner';

const STARTER_CODE = `# Try anything here - it runs in the same sandbox as exercises, with no
# grading and nothing saved. Write some code and hit Run.

print("Hello, world!")
`;

export function SandboxPage() {
  const [code, setCode] = useState(STARTER_CODE);

  const mutation = useMutation({
    mutationFn: () => runSandboxCode(code),
  });

  return (
    <div className="page page--wide session-page">
      <div className="card session-panel">
        <div className="page-tabs">
          <span className="page-tab page-tab--active">Sandbox</span>
        </div>
        <div className="session-panel__body">
          <CodeEditor value={code} onChange={setCode} />
          <div className="button-row">
            <button
              type="button"
              className="btn btn--primary"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Spinner /> Running...
                </>
              ) : (
                '▶ Run'
              )}
            </button>
          </div>
          {mutation.isError && (
            <div className="alert alert--error alert--after-action" role="alert">
              {(mutation.error as Error).message}
            </div>
          )}
          {mutation.data && (
            <div className="session-block">
              <ExecutionResultPanel result={mutation.data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
