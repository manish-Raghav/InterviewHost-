import { useEffect, useRef, useState } from 'react';

// Binds a MediaStream to a <video> element — React has no JSX prop for srcObject.
function VideoTile({ stream, muted, mirrored, label, small }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-editor ${small ? 'h-16 w-16' : 'aspect-video w-full'}`}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />
      {label && !small && (
        <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
          {label}
        </span>
      )}
    </div>
  );
}

function useElapsed(active) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const IconBtn = ({ on, danger, onClick, children, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors ${
      danger
        ? 'bg-rose text-white hover:bg-rose/90'
        : on
          ? 'bg-line/60 hover:bg-line'
          : 'bg-rose-soft text-rose hover:bg-rose-soft/80'
    }`}
  >
    {children}
  </button>
);

// Everything here is `fixed`-positioned so it floats on top of the room UI instead of taking
// up space in the normal page flow — the Question/Editor/Chat panels stay full-size and fully
// usable underneath, whether or not a call is active.
export default function CallBar({ call, localStream, remoteStream, callActions, otherName }) {
  const [minimized, setMinimized] = useState(false);
  const elapsed = useElapsed(call.status === 'connected');

  // Collapse back to the small widget any time a fresh call starts ringing/dialing.
  useEffect(() => {
    if (call.status === 'calling' || call.status === 'ringing') setMinimized(false);
  }, [call.status]);

  if (call.status === 'idle') return null;

  if (call.status === 'ringing') {
    const callerName = call.incoming?.from?.name || otherName || 'The other participant';
    const kind = call.incoming?.video ? 'video' : 'audio';
    return (
      <div className="fixed left-1/2 top-16 z-40 flex w-[min(90vw,22rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-lg">
        <p className="text-sm font-medium">
          <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-signal-dark align-middle" />
          {callerName} is calling ({kind})
        </p>
        <div className="flex shrink-0 gap-2">
          <button className="btn btn-danger px-3 py-1.5" onClick={callActions.declineCall}>
            Decline
          </button>
          <button className="btn btn-primary px-3 py-1.5" onClick={callActions.acceptCall}>
            Accept
          </button>
        </div>
      </div>
    );
  }

  if (call.status === 'calling') {
    return (
      <div className="fixed left-1/2 top-16 z-40 flex w-[min(90vw,20rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-lg">
        <p className="text-sm text-muted">Calling {otherName || '…'}…</p>
        <button className="btn btn-danger px-3 py-1.5" onClick={callActions.endCall}>
          Cancel
        </button>
      </div>
    );
  }

  // connected — a small floating widget, bottom-left (clear of the chat input on the right).
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium shadow-lg hover:bg-paper"
      >
        <span className="h-2 w-2 rounded-full bg-signal" />
        {call.video ? '🎥' : '📞'} {elapsed} · Expand
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-56 rounded-xl border border-line bg-white p-2 shadow-lg">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[11px] font-medium text-muted">
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-signal align-middle" />
          {elapsed}
        </span>
        <button
          onClick={() => setMinimized(true)}
          className="rounded px-1 text-xs text-muted hover:bg-paper hover:text-ink"
          title="Minimize"
        >
          ⌄
        </button>
      </div>

      {call.video ? (
        <div className="relative">
          <VideoTile stream={remoteStream} label={otherName} />
          <div className="absolute bottom-1.5 right-1.5">
            <VideoTile stream={localStream} muted mirrored small />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 rounded-lg bg-paper py-4 text-center">
          <span className="text-xs font-medium">On call with {otherName || 'the other participant'}</span>
          <audio ref={(el) => el && (el.srcObject = remoteStream || null)} autoPlay />
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-2">
        <IconBtn on={call.micOn} onClick={callActions.toggleMic} title={call.micOn ? 'Mute' : 'Unmute'}>
          {call.micOn ? '🎙️' : '🔇'}
        </IconBtn>
        {call.video && (
          <IconBtn on={call.camOn} onClick={callActions.toggleCam} title={call.camOn ? 'Stop video' : 'Start video'}>
            {call.camOn ? '📹' : '📷'}
          </IconBtn>
        )}
        <IconBtn danger onClick={callActions.endCall} title="Hang up">
          📵
        </IconBtn>
      </div>
    </div>
  );
}
