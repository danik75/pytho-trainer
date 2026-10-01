import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { runSandboxCode } from '../api/client';
import { CodeEditor } from './CodeEditor';
import { ExecutionResultPanel } from './ExecutionResultPanel';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

const STARTER_CODE = `# Try anything here - it runs in the same sandbox as exercises, with no
# grading and nothing saved. Write some code and hit Run.

print("Hello, world!")
`;

const DRAFT_STORAGE_KEY = 'pytho-trainer-sandbox-draft';

// There's only ever one scratch sandbox (shared globally, not per-exercise -
// it's meant for quickly testing a snippet of syntax, not for exercise
// solutions), so a single fixed key is enough to survive a reload or
// switching away and back, whether that's via the top nav or the Sandbox
// tab inside an exercise session.
function loadSandboxDraft(): string {
  try {
    return localStorage.getItem(DRAFT_STORAGE_KEY) ?? STARTER_CODE;
  } catch {
    return STARTER_CODE;
  }
}

function saveSandboxDraft(code: string): void {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, code);
  } catch {
    // ignore - the draft just won't persist (e.g. private browsing)
  }
}

export function SandboxPanel() {
  const [code, setCode] = useState(loadSandboxDraft);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => saveSandboxDraft(code), [code]);

  const mutation = useMutation({
    mutationFn: () => runSandboxCode(code),
    // A modal keeps the student on the code they're editing instead of
    // pushing the editor out of view to make room for output below it.
    onSettled: () => setShowResults(true),
  });

  return (
    <div>
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
        {(mutation.data || mutation.isError) && !showResults && (
          <button type="button" className="btn btn--secondary" onClick={() => setShowResults(true)}>
            Show last result
          </button>
        )}
      </div>

      {showResults && (mutation.data || mutation.isError) && (
        <Modal title="Run output" onClose={() => setShowResults(false)}>
          {mutation.isError && (
            <div className="alert alert--error alert--after-action" role="alert">
              {(mutation.error as Error).message}
            </div>
          )}
          {mutation.data && <ExecutionResultPanel result={mutation.data} />}
        </Modal>
      )}
    </div>
  );
}
