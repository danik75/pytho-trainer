export function MasteryScoreBar({ score }: { score: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        background: '#e5e5e5',
        borderRadius: 4,
        height: 8,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: percent >= 80 ? '#2e7d32' : percent >= 50 ? '#f9a825' : '#c62828',
          height: '100%',
          width: `${percent}%`,
        }}
      />
    </div>
  );
}
