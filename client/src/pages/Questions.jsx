import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import { deleteQuestion, fetchQuestions, saveQuestion } from '../features/questions/questionSlice.js';

const EMPTY = {
  title: '',
  description: '',
  difficulty: 'easy',
  expectedOutput: '',
  testCases: [{ input: '', expectedOutput: '', isHidden: false }],
};

function QuestionForm({ initial, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setCase = (index, patch) =>
    setForm((f) => ({ ...f, testCases: f.testCases.map((tc, i) => (i === index ? { ...tc, ...patch } : tc)) }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    // Ignore test cases the interviewer left completely blank.
    const testCases = form.testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
    const result = await dispatch(saveQuestion({ ...form, testCases }));
    setSaving(false);
    if (saveQuestion.fulfilled.match(result)) {
      toast.success(form._id ? 'Question updated' : 'Question added');
      onClose();
    } else {
      setError(result.payload);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label" htmlFor="q-title">
            Title
          </label>
          <input id="q-title" className="input" value={form.title} onChange={set('title')} required maxLength={150} />
        </div>
        <div>
          <label className="label" htmlFor="q-diff">
            Difficulty
          </label>
          <select id="q-diff" className="input" value={form.difficulty} onChange={set('difficulty')}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="q-desc">
          Problem statement
        </label>
        <textarea id="q-desc" rows={5} className="input" value={form.description} onChange={set('description')} required />
        <p className="mt-1 text-xs text-muted">
          JavaScript solutions read the test input from the global <code className="font-mono">input</code> string and
          print with <code className="font-mono">console.log</code>.
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label mb-0">Test cases</span>
          <button
            type="button"
            className="btn btn-ghost px-2 py-1"
            onClick={() =>
              setForm((f) => ({ ...f, testCases: [...f.testCases, { input: '', expectedOutput: '', isHidden: false }] }))
            }
          >
            Add test case
          </button>
        </div>
        <ul className="space-y-3">
          {form.testCases.map((tc, i) => (
            <li key={i} className="rounded-md border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted" htmlFor={`tc-in-${i}`}>
                    Input
                  </label>
                  <textarea
                    id={`tc-in-${i}`}
                    rows={2}
                    className="input font-mono text-xs"
                    value={tc.input}
                    onChange={(e) => setCase(i, { input: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted" htmlFor={`tc-out-${i}`}>
                    Expected output
                  </label>
                  <textarea
                    id={`tc-out-${i}`}
                    rows={2}
                    className="input font-mono text-xs"
                    value={tc.expectedOutput}
                    onChange={(e) => setCase(i, { expectedOutput: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-signal"
                    checked={tc.isHidden}
                    onChange={(e) => setCase(i, { isHidden: e.target.checked })}
                  />
                  Hide from candidate
                </label>
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-1 text-rose"
                  onClick={() => setForm((f) => ({ ...f, testCases: f.testCases.filter((_, j) => j !== i) }))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label className="label" htmlFor="q-notes">
          Interviewer notes
        </label>
        <textarea
          id="q-notes"
          rows={3}
          className="input"
          placeholder="Reference approach, follow-up questions, what a strong answer covers"
          value={form.expectedOutput}
          onChange={set('expectedOutput')}
        />
        <p className="mt-1 text-xs text-muted">Only you can see these notes.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : form._id ? 'Save changes' : 'Add question'}
        </button>
      </div>
    </form>
  );
}

export default function Questions() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.questions);
  const [editing, setEditing] = useState(null); // null | question | EMPTY

  useEffect(() => {
    dispatch(fetchQuestions());
  }, [dispatch]);

  const onDelete = async (q) => {
    if (!window.confirm(`Delete "${q.title}"?`)) return;
    const result = await dispatch(deleteQuestion(q._id));
    if (result.error) toast.error(result.payload || 'Could not delete the question');
    else toast.success('Question deleted');
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Question bank</h1>
          <p className="mt-1 text-sm text-muted">Questions you can attach to interviews.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}>
          New question
        </button>
      </div>

      {status === 'loading' && items.length === 0 ? (
        <Spinner full />
      ) : items.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">Your question bank is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add a problem with a few test cases and the platform will judge JavaScript solutions automatically.
          </p>
          <button className="btn btn-primary mt-5" onClick={() => setEditing(EMPTY)}>
            Add your first question
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((q) => (
            <li key={q._id} className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5">
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate font-medium">{q.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {q.testCases.length} test case{q.testCases.length === 1 ? '' : 's'} (
                  {q.testCases.filter((t) => t.isHidden).length} hidden)
                </p>
              </div>
              <DifficultyBadge difficulty={q.difficulty} />
              <div className="flex gap-1">
                <button className="btn btn-secondary" onClick={() => setEditing(q)}>
                  Edit
                </button>
                <button className="btn btn-ghost" onClick={() => onDelete(q)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing._id ? 'Edit question' : 'New question'} wide onClose={() => setEditing(null)}>
          <QuestionForm initial={editing} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}
