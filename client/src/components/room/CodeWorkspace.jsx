import { useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { languageChanged } from '../../features/room/roomSlice.js';
import { debounce } from '../../lib/debounce.js';
import { isStarterCode, LANGUAGES, STARTERS } from '../../lib/starters.js';
import CodeEditor from './CodeEditor.jsx';
import ResultsPanel from './ResultsPanel.jsx';
import RunResultPanel from './RunResultPanel.jsx';

const SYNC_DELAY_MS = 300;

export default function CodeWorkspace({ role, room, status, currentQuestion, actions, titleFor }) {
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const languageRef = useRef(room.language);
  languageRef.current = room.language;

  // Debounced sync: bursts of keystrokes become a single `code-change` event.
  const syncCode = useMemo(
    () => debounce((code) => actions.emitCodeChange(code, languageRef.current), SYNC_DELAY_MS),
    [actions]
  );
  useEffect(() => () => syncCode.flush(), [syncCode]); // never lose the last edits on unmount

  const readOnly = status === 'completed' || status === 'cancelled';
  const language = LANGUAGES.find((l) => l.id === room.language) || LANGUAGES[0];
  const canSubmit = role === 'candidate' && status === 'in-progress' && currentQuestion && !room.submitting;
  const canRun =
    role === 'candidate' && (status === 'scheduled' || status === 'in-progress') && !room.running;

  const changeLanguage = (id) => {
    const editor = editorRef.current;
    languageRef.current = id;
    dispatch(languageChanged(id));

    const current = editor?.getValue() ?? '';
    // Swap starter text for the new language, but never overwrite real work.
    if (editor && isStarterCode(current) && current !== STARTERS[id]) {
      editor.setValue(STARTERS[id]);
    }
    syncCode.cancel();
    actions.emitCodeChange(editor?.getValue() ?? '', id);
  };

  const submit = () => {
    syncCode.flush();
    actions.submitCode({
      questionId: currentQuestion._id,
      code: editorRef.current?.getValue() ?? '',
      language: room.language,
    });
  };

  const run = () => {
    syncCode.flush();
    actions.runCode({
      questionId: currentQuestion?._id,
      code: editorRef.current?.getValue() ?? '',
      language: room.language,
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Code editor">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Language</span>
          <select
            className="input w-auto py-1.5"
            value={room.language}
            onChange={(e) => changeLanguage(e.target.value)}
            disabled={readOnly}
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>

        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          {currentQuestion ? currentQuestion.title : 'No question selected yet'}
        </p>

        {!language.judged && (
          <span className="text-xs text-amber">Only JavaScript is auto-judged; other languages go to manual review</span>
        )}

        {role === 'candidate' && (
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary" onClick={run} disabled={!canRun}>
              {room.running ? 'Running…' : 'Run'}
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
              {room.submitting ? 'Running tests…' : 'Submit solution'}
            </button>
          </div>
        )}
      </div>

      <div className="min-h-[280px] flex-1 bg-editor">
        <CodeEditor
          editorRef={editorRef}
          initialCode={room.initialCode || STARTERS[room.language] || ''}
          language={room.language}
          readOnly={readOnly}
          remote={room.remoteCode}
          onLocalChange={syncCode}
        />
      </div>

      {role === 'candidate' && <RunResultPanel result={room.runResult} running={room.running} />}

      <div className="max-h-56 min-h-[96px] overflow-y-auto border-t border-line bg-white">
        <ResultsPanel submissions={room.submissions} titleFor={titleFor} role={role} />
      </div>
    </section>
  );
}
