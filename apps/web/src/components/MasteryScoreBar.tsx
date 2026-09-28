export function MasteryScoreBar({ score }: { score: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const color =
    percent >= 80
      ? 'var(--color-success)'
      : percent >= 50
        ? 'var(--color-warning)'
        : 'var(--color-danger)';

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress__bar" style={{ background: color, width: `${percent}%` }} />
    </div>
  );
}
