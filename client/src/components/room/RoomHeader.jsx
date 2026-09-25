import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge.jsx';
import Timer from './Timer.jsx';

export default function RoomHeader({ interview, room, role, actions, call, callActions }) {
  const status = room.status || interview?.status;
  const other = role === 'interviewer' ? interview?.candidate : interview?.interviewer;
  const canCall = room.joined && call?.status === 'idle' && (status === 'scheduled' || status === 'in-progress');

  const end = () => {
    if (window.confirm('End this interview for both participants? The editor becomes read-only.')) {
      actions.endInterview();
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-white px-4 py-2.5">
      <Link to="/" className="btn btn-ghost px-2 py-1" aria-label="Back to interviews">
        ←
      </Link>

      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold leading-tight">{interview?.title || 'Interview'}</h1>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span>with {other?.name || '…'}</span>
          {role === 'interviewer' && (
            <span className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${room.candidateOnline ? 'bg-signal' : 'bg-line'}`} />
              {room.candidateOnline ? 'Candidate is here' : 'Candidate not connected'}
            </span>
          )}
        </p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-4">
        <Timer
          status={status}
          startedAt={room.startedAt}
          endedAt={room.endedAt}
          durationMinutes={room.durationMinutes || interview?.durationMinutes || 60}
        />
        {status && <StatusBadge status={status} />}
        {!room.connected && <span className="text-xs font-medium text-rose">Reconnecting…</span>}

        {canCall && (
          <div className="flex items-center gap-1.5">
            <button
              className="btn btn-secondary px-2.5 py-1.5"
              onClick={() => callActions.startCall(true)}
              title="Start a video call"
            >
              🎥 Video
            </button>
            <button
              className="btn btn-secondary px-2.5 py-1.5"
              onClick={() => callActions.startCall(false)}
              title="Start an audio call"
            >
              📞 Audio
            </button>
          </div>
        )}

        {role === 'interviewer' && status === 'scheduled' && (
          <button className="btn btn-primary" onClick={actions.startInterview} disabled={!room.joined}>
            Start interview
          </button>
        )}
        {role === 'interviewer' && status === 'in-progress' && (
          <button className="btn btn-danger" onClick={end}>
            End interview
          </button>
        )}
      </div>
    </header>
  );
}
