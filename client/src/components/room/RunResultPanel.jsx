const STATUS = {
  passed: { label: 'Passed', cls: 'bg-signal-soft text-signal-dark' },
  failed: { label: 'Wrong output', cls: 'bg-rose-soft text-rose' },
  error: { label: 'Error', cls: 'bg-rose-soft text-rose' },
  pending: { label: 'No visible tests', cls: 'bg-amber-soft text-amber' },
  ran: { label: 'Ran', cls: 'bg-signal-soft text-signal-dark' },
};

const Out = ({ label, value }) => (
  <div>
    <p className="text-[11px] text-muted">{label}</p>
    <pre className="whitespace-pre-wrap break-words rounded bg-white px-2 py-1 font-mono text-xs">{value || ' '}</pre>
  </div>
);

// Shows the result of the candidate's last "Run". Two shapes:
//  - a question is attached: check against the question's visible test cases (unchanged)
//  - no question yet: freeform execution — just what the code printed, or the error it threw
// Nothing here is saved or shown to the interviewer; that only happens on "Submit solution".
export default function RunResultPanel({ result, running }) {
  if (!running && !result) return null;

  const badge = STATUS[result?.status] || STATUS.pending;
  const isFree = result?.mode === 'free';

  return (
    <div className="border-t border-line bg-paper/60 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">{isFree ? 'Run output' : 'Test run'}</span>
        <span className="text-[11px] text-muted">(not submitted — the interviewer can't see this)</span>
      </div>

      {running ? (
        <p className="text-sm text-muted">Running your code…</p>
      ) : isFree ? (
        <>
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
            {result.ms !== undefined && <span className="text-xs text-muted">{result.ms} ms</span>}
          </div>
          {result.message && <p className="mb-2 text-xs text-muted">{result.message}</p>}
          {result.status === 'ran' && (
            <pre className="whitespace-pre-wrap break-words rounded-md border border-line bg-white p-2 font-mono text-xs">
              {result.stdout || '(no output — nothing was printed with console.log)'}
            </pre>
          )}
          {result.error && <p className="mt-1 font-mono text-xs text-rose">{result.error}</p>}
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
            {result.total > 0 && (
              <span className="font-mono text-xs text-muted">
                {result.passed}/{result.total} visible tests
              </span>
            )}
          </div>
          {result.message && <p className="mb-2 text-xs text-muted">{result.message}</p>}
          <div className="space-y-2">
            {(result.details || []).map((d) => (
              <div key={d.index} className="rounded-md border border-line bg-white p-2">
                <p className="mb-1 flex items-center gap-2 text-xs font-medium">
                  <span className={d.passed ? 'text-signal-dark' : 'text-rose'}>{d.passed ? '✓' : '✕'}</span>
                  {`Test ${d.index}`}
                  {d.ms !== undefined && <span className="font-normal text-muted">{d.ms} ms</span>}
                </p>
                {!d.passed && (
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
        </>
      )}
    </div>
  );
}
