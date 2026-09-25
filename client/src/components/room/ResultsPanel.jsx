import { formatTime } from '../../lib/format.js';

const STATUS = {
  passed: { label: 'Passed', cls: 'bg-signal-soft text-signal-dark' },
  failed: { label: 'Wrong answer', cls: 'bg-rose-soft text-rose' },
  error: { label: 'Error', cls: 'bg-rose-soft text-rose' },
  pending: { label: 'Needs review', cls: 'bg-amber-soft text-amber' },
};

const Out = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-muted">{label}</p>
    <pre className="whitespace-pre-wrap break-words rounded bg-white px-2 py-1 font-mono text-xs">{value || ' '}</pre>
  </div>
);

export default function ResultsPanel({ submissions, titleFor, role }) {
  if (submissions.length === 0) {
    return (
      <p className="p-4 text-sm text-muted">
        {role === 'candidate'
          ? 'Submit your solution to see test results here.'
          : 'Test results appear here as soon as the candidate submits.'}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {submissions.map((s, index) => {
        const st = STATUS[s.result?.status] || STATUS.pending;
        const title = s.question?.title || titleFor(s.question) || 'Question';
        return (
          <li key={s._id}>
            <details open={index === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                {s.result?.total > 0 && (
                  <span className="font-mono text-xs text-muted">
                    {s.result.passed}/{s.result.total} tests
                  </span>
                )}
                <span className="text-xs text-muted">{formatTime(s.submittedAt)}</span>
              </summary>

              <div className="space-y-2 bg-paper/60 px-4 pb-3 pt-1">
                {s.result?.message && <p className="text-xs text-muted">{s.result.message}</p>}
                {(s.result?.details || []).map((d) => (
                  <div key={d.index} className="rounded-md border border-line bg-white p-2">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium">
                      <span className={d.passed ? 'text-signal-dark' : 'text-rose'}>{d.passed ? '✓' : '✕'}</span>
                      {d.isHidden ? 'Hidden test' : `Test ${d.index}`}
                      {d.ms !== undefined && <span className="font-normal text-muted">{d.ms} ms</span>}
                    </p>
                    {!d.isHidden && !d.passed && (
                      <div className="grid gap-1.5 sm:grid-cols-3">
                        <Out label="Input" value={d.input} />
                        <Out label="Expected" value={d.expected} />
                        <Out label="Your output" value={d.actual} />
                      </div>
                    )}
                    {d.error && <p className="mt-1 font-mono text-xs text-rose">{d.error}</p>}
                  </div>
                ))}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
