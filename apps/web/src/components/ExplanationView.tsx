import ReactMarkdown from 'react-markdown';

export function ExplanationView({ markdown }: { markdown: string }) {
  if (!markdown) return null;
  return (
    <div className="explanation">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
