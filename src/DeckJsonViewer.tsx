// CodeMirror 6 viewer for the generated deck.json — same stack as the Studio's
// JsonSourceEditor (@uiw/react-codemirror + @codemirror/lang-json), so the family
// shows JSON the same way. Read-only (this is a preview of a generated artifact),
// with line numbers, folding, search, and a dark theme (dark mode is mandatory).
import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { search } from "@codemirror/search";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

const EXTENSIONS = [json(), search({ top: true }), EditorView.lineWrapping];

export default function DeckJsonViewer({ value, dark }: { value: string; dark: boolean }) {
  const extensions = useMemo(() => EXTENSIONS, []);
  return (
    <div className="rz-json-viewer">
      <CodeMirror
        value={value}
        height="360px"
        editable={false}
        theme={dark ? oneDark : "light"}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          searchKeymap: true,
        }}
        className="rz-cm"
      />
    </div>
  );
}
