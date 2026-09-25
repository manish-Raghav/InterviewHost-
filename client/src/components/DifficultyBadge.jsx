const STYLES = {
  easy: 'bg-signal-soft text-signal-dark',
  medium: 'bg-amber-soft text-amber',
  hard: 'bg-rose-soft text-rose',
};

export default function DifficultyBadge({ difficulty }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STYLES[difficulty] || ''}`}>
      {difficulty}
    </span>
  );
}
