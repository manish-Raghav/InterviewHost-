import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import DifficultyBadge from '../components/DifficultyBadge.jsx';
import { createInterview } from '../features/interviews/interviewSlice.js';
import { fetchQuestions } from '../features/questions/questionSlice.js';
import api, { getErrorMessage } from '../services/api.js';
import { toLocalInputValue } from '../lib/format.js';

export default function ScheduleInterview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const questions = useSelector((s) => s.questions.items);
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(() => {
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    return {
      title: '',
      candidateId: '',
      scheduledAt: toLocalInputValue(start),
      durationMinutes: 60,
      questions: [],
    };
  });

  useEffect(() => {
    dispatch(fetchQuestions());
    api
      .get('/users', { params: { role: 'candidate' } })
      .then(({ data }) => setCandidates(data.users))
      .catch((err) => setError(getErrorMessage(err)));
  }, [dispatch]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleQuestion = (id) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.includes(id) ? f.questions.filter((q) => q !== id) : [...f.questions, id],
    }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await dispatch(
      createInterview({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
      })
    );
    setSaving(false);
    if (createInterview.fulfilled.match(result)) {
      toast.success('Interview scheduled');
      navigate('/');
    } else {
      setError(result.payload);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Schedule an interview</h1>
      <p className="mb-6 mt-1 text-sm text-muted">The candidate will see it on their dashboard straight away.</p>

      <form onSubmit={onSubmit} className="panel space-y-5 p-5 sm:p-6">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input"
            placeholder="Frontend screening"
            value={form.title}
            onChange={set('title')}
            maxLength={150}
          />
        </div>

        <div>
          <label className="label" htmlFor="candidate">
            Candidate
          </label>
          <select id="candidate" className="input" value={form.candidateId} onChange={set('candidateId')} required>
            <option value="">Select a candidate…</option>
            {candidates.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <p className="mt-1 text-xs text-muted">No candidate accounts yet. Ask the candidate to register first.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="when">
              Date and time
            </label>
            <input id="when" type="datetime-local" className="input" value={form.scheduledAt} onChange={set('scheduledAt')} required />
          </div>
          <div>
            <label className="label" htmlFor="duration">
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min={5}
              max={480}
              className="input"
              value={form.durationMinutes}
              onChange={set('durationMinutes')}
              required
            />
          </div>
        </div>

        <fieldset>
          <legend className="label">Questions</legend>
          {questions.length === 0 ? (
            <p className="text-sm text-muted">
              Your question bank is empty.{' '}
              <Link to="/questions" className="text-signal-dark underline">
                Add questions
              </Link>{' '}
              first, then come back.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {questions.map((q) => (
                <li key={q._id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-paper">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-signal"
                      checked={form.questions.includes(q._id)}
                      onChange={() => toggleQuestion(q._id)}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{q.title}</span>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-muted">You choose which one to send to the candidate during the interview.</p>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-md bg-rose-soft px-3 py-2 text-sm text-rose">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Link to="/" className="btn btn-secondary">
            Cancel
          </Link>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Scheduling…' : 'Schedule interview'}
          </button>
        </div>
      </form>
    </>
  );
}
