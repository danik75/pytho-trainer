import { SandboxPanel } from '../components/SandboxPanel';

export function SandboxPage() {
  return (
    <div className="page page--wide session-page">
      <div className="card session-panel">
        <div className="page-tabs">
          <span className="page-tab page-tab--active">Sandbox</span>
        </div>
        <div className="session-panel__body">
          <SandboxPanel />
        </div>
      </div>
    </div>
  );
}
