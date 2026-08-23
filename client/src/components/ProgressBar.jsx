export default function ProgressBar({ current, total }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>
          Question {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
