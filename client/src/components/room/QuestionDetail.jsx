import DifficultyBadge from '../DifficultyBadge.jsx';

const Block = ({ label, children }) => (
  <div>
    <p className="mb-0.5 text-xs text-muted">{label}</p>
    <pre className="whitespace-pre-wrap break-words rounded bg-paper px-2 py-1.5 font-mono text-xs">{children || ' '}</pre>
  </div>
);

export default function QuestionDetail({ question, showNotes = false }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold">{question.title}</h3>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.description}</p>

      {question.testCases?.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Examples</h4>
          <ul className="space-y-3">
            {question.testCases.map((tc, i) => (
              <li key={i} className="rounded-md border border-line p-2.5">
                {tc.isHidden && <p className="mb-2 text-xs font-medium text-amber">Hidden from candidate</p>}
                <div className="grid gap-2">
                  <Block label="Input">{tc.input}</Block>
                  <Block label="Expected output">{tc.expectedOutput}</Block>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showNotes && question.expectedOutput && (
        <div className="rounded-md bg-signal-soft p-3">
          <h4 className="mb-1 text-sm font-semibold text-signal-dark">Interviewer notes</h4>
          <p className="whitespace-pre-wrap text-sm">{question.expectedOutput}</p>
        </div>
      )}
    </div>
  );
}
