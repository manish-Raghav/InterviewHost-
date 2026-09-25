import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../../lib/format.js';

export default function ChatPanel({ messages, currentUserId, otherName, otherTyping, disabled, actions }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, otherTyping]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const setTyping = (isTyping) => {
    if (typingRef.current === isTyping) return;
    typingRef.current = isTyping;
    actions.emitTyping(isTyping);
  };

  const onChange = (e) => {
    setText(e.target.value);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1500);
  };

  const send = (e) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || disabled) return;
    actions.sendMessage(message);
    setText('');
    clearTimeout(typingTimer.current);
    setTyping(false);
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Chat">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">Chat</h2>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-muted">No messages yet. Say hello to {otherName || 'the other participant'}.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender._id === currentUserId;
          return (
            <div key={m._id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                  mine ? 'bg-signal text-white' : 'bg-paper text-ink'
                }`}
              >
                {m.message}
              </div>
              <span className="mt-0.5 text-[11px] text-muted">
                {mine ? 'You' : m.sender.name} · {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
        {otherTyping && <p className="text-xs italic text-muted">{otherName || 'They'} is typing…</p>}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          className="input"
          value={text}
          onChange={onChange}
          placeholder={disabled ? 'Chat is closed' : 'Write a message'}
          disabled={disabled}
          maxLength={2000}
          aria-label="Message"
        />
        <button className="btn btn-primary" disabled={disabled || !text.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
