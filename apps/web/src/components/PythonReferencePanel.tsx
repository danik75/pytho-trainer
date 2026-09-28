import { useMemo, useState } from 'react';
import { PYTHON_SYNTAX_GUIDE } from '../content/pythonSyntaxGuide';
import { ExplanationView } from './ExplanationView';

export function PythonReferencePanel() {
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return PYTHON_SYNTAX_GUIDE;
    return PYTHON_SYNTAX_GUIDE.filter(
      (section) =>
        section.title.toLowerCase().includes(needle) ||
        section.markdown.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className="reference-panel">
      <input
        type="search"
        placeholder="Search the reference (e.g. loops, dict, try)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="reference-sections">
        {sections.length > 0 ? (
          sections.map((section) => (
            <details className="reference-section" key={section.id} open={sections.length <= 3}>
              <summary>{section.title}</summary>
              <ExplanationView markdown={section.markdown} />
            </details>
          ))
        ) : (
          <p className="chat-empty">No reference sections match &quot;{query}&quot;.</p>
        )}
      </div>
    </div>
  );
}
