import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { cancelInterview, deleteInterview, fetchInterviews } from '../features/interviews/interviewSlice.js';
import { formatDateTime } from '../lib/format.js';

function InterviewRow({ interview, role }) {
  const dispatch = useDispatch();
  const other = role === 'interviewer' ? interview.candidate : interview.interviewer;
  const joinable = ['scheduled', 'in-progress'].includes(interview.status);
  const removable = ['completed', 'cancelled'].includes(interview.status);

  const run = async (action, success) => {
    const result = await dispatch(action);
    if (result.error) toast.error(result.payload || 'Something went wrong');
    else toast.success(success);
  };

  const onCancel = () =>
    window.confirm(`Cancel "${interview.title}"? The candidate will no longer be able to join.`) &&
    run(cancelInterview(interview._id), 'Interview cancelled');

  const onDelete = () =>
    window.confirm(`Delete "${interview.title}" with its chat and submissions? This can't be undone.`) &&
    run(deleteInterview(interview._id), 'Interview deleted');

  return (
    <li className="panel flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
      <div className="min-w-0 flex-1 basis-56">
        <p className="truncate font-medium">{interview.title}</p>
        <p className="mt-0.5 text-sm text-muted">
          {role === 'interviewer' ? 'Candidate' : 'Interviewer'}: {other?.name} · {formatDateTime(interview.scheduledAt)} ·{' '}
          {interview.durationMinutes} min
          {role === 'interviewer' && ` · ${interview.questionCount ?? interview.questions?.length ?? 0} questions`}
        </p>
      </div>

      <StatusBadge status={interview.status} />

      <div className="flex items-center gap-2">
        {joinable && (
          <Link to={`/interviews/${interview._id}/room`} className="btn btn-primary">
            {interview.status === 'in-progress' ? 'Rejoin room' : 'Open room'}
          </Link>
        )}
        {interview.status === 'completed' && role === 'interviewer' && (
          <Link to={`/interviews/${interview._id}/room`} className="btn btn-secondary">
            Review
          </Link>
        )}
        {role === 'interviewer' && interview.status === 'scheduled' && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        {role === 'interviewer' && removable && (
          <button className="btn btn-ghost" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

function Section({ title, items, role }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <InterviewRow key={i._id} interview={i} role={role} />
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { items, listStatus } = useSelector((s) => s.interviews);

  useEffect(() => {
    dispatch(fetchInterviews());
  }, [dispatch]);

  const byTime = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);
  const live = items.filter((i) => i.status === 'in-progress');
  const upcoming = items.filter((i) => i.status === 'scheduled').sort(byTime);
  const past = items.filter((i) => ['completed', 'cancelled'].includes(i.status));

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="mt-1 text-sm text-muted">
            {user.role === 'interviewer' ? 'Everything you have scheduled.' : 'Interviews assigned to you.'}
          </p>
        </div>
        {user.role === 'interviewer' && (
          <Link to="/interviews/new" className="btn btn-primary">
            Schedule interview
          </Link>
        )}
      </div>

      {listStatus === 'loading' && items.length === 0 ? (
        <Spinner full />
      ) : listStatus === 'failed' ? (
        <p role="alert" className="rounded-md bg-rose-soft px-4 py-3 text-sm text-rose">
          Couldn't load your interviews.{' '}
          <button className="underline" onClick={() => dispatch(fetchInterviews())}>
            Try again
          </button>
        </p>
      ) : items.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <h2 className="text-lg font-semibold">
            {user.role === 'interviewer' ? 'No interviews yet' : 'Nothing scheduled for you'}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {user.role === 'interviewer'
              ? 'Add a few questions to your bank, then schedule an interview with a candidate.'
              : 'When an interviewer schedules a session with you, it will show up here.'}
          </p>
          {user.role === 'interviewer' && (
            <Link to="/interviews/new" className="btn btn-primary mt-5">
              Schedule your first interview
            </Link>
          )}
        </div>
      ) : (
        <>
          <Section title="Live now" items={live} role={user.role} />
          <Section title="Upcoming" items={upcoming} role={user.role} />
          <Section title="Past" items={past} role={user.role} />
        </>
      )}
    </>
  );
}
