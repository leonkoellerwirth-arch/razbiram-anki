// CodeMirror 6 view/edit surface for the deck.json — same stack as the Studio's
// JsonSourceEditor (@uiw/react-codemirror + @codemirror/lang-json), so the family
// shows JSON the same way. Read-only by default (a preview of a generated
// artifact); pass `onChange` to let the student edit before download. Line
// numbers, folding, search, and a dark theme (dark mode is mandatory).
import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { search } from "@codemirror/search";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

const EXTENSIONS = [json(), search({ top: true }), EditorView.lineWrapping];

export default function DeckJsonViewer({
  value,
  dark,
  onChange,
}: {
  value: string;
  dark: boolean;
  /** When provided, the surface becomes editable and reports every edit. */
  onChange?: (next: string) => void;
}) {
  const extensions = useMemo(() => EXTENSIONS, []);
  const editable = onChange !== undefined;
  return (
    <div className="rz-json-viewer">
      <CodeMirror
        value={value}
        height="360px"
        editable={editable}
        onChange={onChange}
        theme={dark ? oneDark : "light"}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: editable,
          searchKeymap: true,
        }}
        className="rz-cm"
      />
    </div>
  );
}
