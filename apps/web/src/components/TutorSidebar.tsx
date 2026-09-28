import { useRef, useState } from 'react';
import type { Exercise } from '@pytho-trainer/shared';
import { ExplanationView } from './ExplanationView';
import { ExerciseChatPanel } from './ExerciseChatPanel';
import { PythonReferencePanel } from './PythonReferencePanel';

interface TutorSidebarProps {
  exercise: Exercise;
  code: string;
}

type TutorTab = 'concepts' | 'chat' | 'reference';

const TABS: Array<{ id: TutorTab; label: string }> = [
  { id: 'concepts', label: 'Concepts' },
  { id: 'chat', label: 'Chat' },
  { id: 'reference', label: 'Python reference' },
];

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 280;
const MAX_WIDTH = 640;
const DRAG_THRESHOLD_PX = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TutorSidebar({ exercise, code }: TutorSidebarProps) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [tab, setTab] = useState<TutorTab>('concepts');
  const widthRef = useRef(width);
  widthRef.current = width;

  // A single control: click to toggle open/collapsed, or press-drag
  // horizontally to resize while open. Both live on the same edge handle so
  // there's one obvious thing to grab, rather than a separate toggle button
  // floating over the page.
  function handlePointerDown(event: React.MouseEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    let dragged = false;

    function onMove(moveEvent: MouseEvent) {
      const delta = startX - moveEvent.clientX;
      if (Math.abs(delta) > DRAG_THRESHOLD_PX) dragged = true;
      if (open) setWidth(clamp(startWidth + delta, MIN_WIDTH, MAX_WIDTH));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!dragged) setOpen((prev) => !prev);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return (
    <div
      className={open ? 'tutor-panel tutor-panel--open' : 'tutor-panel'}
      style={open ? { width } : undefined}
    >
      <button
        type="button"
        className="tutor-handle"
        onMouseDown={handlePointerDown}
        aria-label={open ? 'Collapse tutor panel' : 'Expand tutor panel'}
        aria-expanded={open}
        title={open ? 'Collapse (drag to resize)' : 'Expand tutor'}
      >
        {open ? '>' : '<'}
      </button>

      <aside className="tutor-panel__content" aria-hidden={!open}>
        <div className="tutor-sidebar__header">
          <h3>🎓 Tutor</h3>
        </div>

        <div className="tutor-sidebar__tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'tutor-tab tutor-tab--active' : 'tutor-tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tutor-sidebar__body">
          {tab === 'concepts' && (
            <div className="tutor-sidebar__section">
              <h4>What you need to know</h4>
              <ExplanationView markdown={exercise.conceptsMd} />
            </div>
          )}
          {tab === 'chat' && <ExerciseChatPanel exercise={exercise} code={code} />}
          {tab === 'reference' && <PythonReferencePanel />}
        </div>
      </aside>
    </div>
  );
}
