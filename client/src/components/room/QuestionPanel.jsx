import { useState } from 'react';
import { Link } from 'react-router-dom';
import DifficultyBadge from '../DifficultyBadge.jsx';
import QuestionDetail from './QuestionDetail.jsx';

export default function QuestionPanel({
  role,
  questions,
  currentQuestion,
  currentQuestionId,
  status,
  actions,
  bank = [],
  onAttach,
  onRemove,
}) {
  const [openId, setOpenId] = useState(null);
  const [pickerId, setPickerId] = useState('');

  if (role === 'candidate') {
    return (
      <section className="flex h-full min-h-0 flex-col" aria-label="Question">
        <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Question</h2>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {currentQuestion ? (
            <QuestionDetail question={currentQuestion} />
          ) : (
            <p className="text-sm text-muted">
              {status === 'completed'
                ? 'The interview has ended.'
                : 'Waiting for the interviewer to share a question. It will appear here as soon as they send it.'}
            </p>
          )}
        </div>
      </section>
    );
  }

  const canSend = status === 'scheduled' || status === 'in-progress';
  const canEditQuestions = status === 'scheduled' || status === 'in-progress';
  const attachedIds = new Set(questions.map((q) => q._id));
  const available = bank.filter((q) => !attachedIds.has(q._id));

  const attach = () => {
    if (!pickerId) return;
    onAttach?.(pickerId);
    setPickerId('');
  };

  const send = (questionId) => {
    if (status === 'scheduled') actions.startAndSendQuestion(questionId);
    else actions.sendQuestion(questionId);
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Questions">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Questions</h2>
        {status === 'scheduled' && <span className="text-xs text-muted">Sending a question starts the interview</span>}
      </div>

      {canEditQuestions && (
        <div className="border-b border-line p-3">
          {available.length > 0 ? (
            <div className="flex gap-2">
              <select
                className="input min-w-0 flex-1"
                value={pickerId}
                onChange={(e) => setPickerId(e.target.value)}
                aria-label="Attach a question from the question bank"
              >
                <option value="">Attach a question…</option>
                {available.map((q) => (
                  <option key={q._id} value={q._id}>
                    {q.title} · {q.difficulty}
                  </option>
                ))}
              </select>
              <button className="btn btn-secondary shrink-0" disabled={!pickerId} onClick={attach}>
                Attach
              </button>
            </div>
          ) : bank.length === 0 ? (
            <p className="text-xs text-muted">
              Your question bank is empty.{' '}
              <Link to="/questions" className="text-signal-dark underline">
                Create a question
              </Link>{' '}
              to attach one here.
            </p>
          ) : (
            <p className="text-xs text-muted">Every question in your bank is already attached.</p>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {questions.length === 0 ? (
          <p className="p-4 text-sm text-muted">
            No questions are attached to this interview yet.{' '}
            {canEditQuestions ? 'Attach one above.' : (
              <>
                Add some from the{' '}
                <Link to="/questions" className="text-signal-dark underline">
                  question bank
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {questions.map((q) => {
              const live = q._id === currentQuestionId;
              const open = openId === q._id;
              return (
                <li key={q._id} className={live ? 'bg-signal-soft/50' : ''}>
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setOpenId(open ? null : q._id)}
                      aria-expanded={open}
                    >
                      <span className="block truncate text-sm font-medium">{q.title}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <DifficultyBadge difficulty={q.difficulty} />
                        {live && <span className="text-xs font-medium text-signal-dark">Shown to candidate</span>}
                      </span>
                    </button>
                    <button
                      className="btn btn-secondary shrink-0 px-2.5 py-1.5"
                      disabled={!canSend || live}
                      onClick={() => send(q._id)}
                    >
                      {live ? 'Sent' : status === 'scheduled' ? 'Start & send' : 'Send'}
                    </button>
                    {canEditQuestions && !live && (
                      <button
                        className="shrink-0 px-1.5 py-1.5 text-xs text-muted hover:text-rose"
                        title="Remove from this interview"
                        aria-label={`Remove ${q.title} from this interview`}
                        onClick={() => onRemove?.(q._id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="border-t border-line px-4 py-4">
                      <QuestionDetail question={q} showNotes />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
