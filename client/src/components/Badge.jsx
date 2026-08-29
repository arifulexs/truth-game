export function Badge({ badge }) {
  return (
    <span
      className={`user-badge ${badge.animated ? 'user-badge-animated' : ''}`}
      style={{ '--badge-color': badge.color }}
      title={badge.label}
      aria-label={badge.label}
    >
      {badge.emoji}
    </span>
  );
}

export default function BadgeRow({ badges }) {
  if (!badges || badges.length === 0) return null;
  return (
    <span className="badge-row">
      {badges.map((b) => (
        <Badge key={b.key} badge={b} />
      ))}
    </span>
  );
}
