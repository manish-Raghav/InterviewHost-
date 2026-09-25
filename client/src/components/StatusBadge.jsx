const STYLES = {
  scheduled: 'bg-signal-soft text-signal-dark',
  'in-progress': 'bg-amber-soft text-amber',
  completed: 'bg-paper text-muted border border-line',
  cancelled: 'bg-rose-soft text-rose',
};

const LABELS = {
  scheduled: 'Scheduled',
  'in-progress': 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] || ''}`}>
      {status === 'in-progress' && <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber" />}
      {LABELS[status] || status}
    </span>
  );
}
