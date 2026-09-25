import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

/**
 * Monaco editor that is deliberately *uncontrolled*. Local typing is reported through
 * `onLocalChange`; updates from the other participant arrive via `remote` and are applied
 * as a minimal text edit (only the differing middle part), so the local cursor and selection
 * are not thrown around when the other person types elsewhere in the file.
 */
export default function CodeEditor({ editorRef, initialCode, language, readOnly, remote, onLocalChange }) {
  const monacoRef = useRef(null);
  const applyingRemote = useRef(false);
  const latestRemote = useRef(remote);
  latestRemote.current = remote;

  const applyRemote = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const { code, version } = latestRemote.current;
    if (!editor || !monaco || version === 0) return;

    const model = editor.getModel();
    const current = model.getValue();
    if (current === code) return;

    let start = 0;
    const min = Math.min(current.length, code.length);
    while (start < min && current[start] === code[start]) start += 1;

    let endCurrent = current.length;
    let endNext = code.length;
    while (endCurrent > start && endNext > start && current[endCurrent - 1] === code[endNext - 1]) {
      endCurrent -= 1;
      endNext -= 1;
    }

    const range = monaco.Range.fromPositions(model.getPositionAt(start), model.getPositionAt(endCurrent));
    applyingRemote.current = true;
    try {
      editor.executeEdits('remote', [{ range, text: code.slice(start, endNext), forceMoveMarkers: false }]);
    } finally {
      applyingRemote.current = false;
    }
  };

  useEffect(applyRemote, [remote.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyRemote(); // an update may have arrived while Monaco was still loading
  };

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      defaultValue={initialCode}
      onMount={handleMount}
      onChange={(value) => {
        if (!applyingRemote.current) onLocalChange(value ?? '');
      }}
      loading={<span className="text-sm text-white/60">Loading editor…</span>}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: 2,
        padding: { top: 12 },
      }}
    />
  );
}
