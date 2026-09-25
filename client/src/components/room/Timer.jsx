import { useEffect, useState } from 'react';
import { formatClock } from '../../lib/format.js';

export default function Timer({ status, startedAt, endedAt, durationMinutes }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'in-progress') return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === 'scheduled' || !startedAt) {
    return <span className="text-sm text-muted">Not started</span>;
  }

  const end = status === 'completed' && endedAt ? new Date(endedAt).getTime() : now;
  const elapsed = (end - new Date(startedAt).getTime()) / 1000;

  if (status === 'completed') {
    return (
      <span className="text-sm text-muted">
        Ended after <span className="font-mono text-ink">{formatClock(elapsed)}</span>
      </span>
    );
  }

  const remaining = durationMinutes * 60 - elapsed;
  const over = remaining < 0;

  return (
    <span className="inline-flex items-baseline gap-2" aria-live="off">
      <span className={`font-mono text-xl font-medium tabular-nums ${over ? 'text-rose' : 'text-ink'}`}>
        {over ? '+' : ''}
        {formatClock(Math.abs(remaining))}
      </span>
      <span className={`text-xs ${over ? 'text-rose' : 'text-muted'}`}>{over ? 'over time' : 'left'}</span>
    </span>
  );
}
