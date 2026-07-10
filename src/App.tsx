import { useCallback, useRef, useState } from "react";

/** The razbiram node-mark — © razbiram.com, drawn in code (no image asset). */
function NodeMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" className="rz-node" aria-hidden="true">
      <line x1="17" y1="17" x2="6" y2="7" stroke="currentColor" strokeWidth="1.7" />
      <line x1="17" y1="17" x2="29" y2="9" stroke="currentColor" strokeWidth="1.7" />
      <line x1="17" y1="17" x2="9" y2="28" stroke="currentColor" strokeWidth="1.7" />
      <line x1="17" y1="17" x2="27" y2="27" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="7" r="3" fill="currentColor" />
      <circle cx="29" cy="9" r="2.5" fill="currentColor" />
      <circle cx="9" cy="28" r="2.5" fill="currentColor" />
      <circle cx="27" cy="27" r="2.5" fill="currentColor" />
      <circle cx="17" cy="17" r="5" fill="currentColor" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="rz-wordmark" style={{ fontSize: 24 }}>
      razb<span className="accent">i</span>ram<span className="sub">-anki</span>
    </span>
  );
}

type Theme = "light" | "dark";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () =>
      (document.documentElement.getAttribute("data-theme") as Theme) ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }, []);
  return [theme, toggle];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [isOver, setIsOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".apkg")) {
      window.alert("Bitte eine Anki-Datei (.apkg) auswählen.");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      accept(e.dataTransfer.files[0]);
    },
    [accept],
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "18px 20px",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NodeMark />
          <Wordmark />
        </div>
        <button className="rz-btn" onClick={toggleTheme} aria-label="Farbschema wechseln">
          {theme === "dark" ? "☀ Hell" : "☾ Dunkel"}
        </button>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "8px 20px 64px" }}>
        <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "18px 0 8px", letterSpacing: "-0.01em" }}>
          Dein Anki-Deck, bereit für razbiram.com
        </h1>
        <p className="rz-muted" style={{ fontSize: 18, margin: "0 0 24px", maxWidth: 560 }}>
          Hast du ein Anki-Deck — eigenes oder von Freunden? Zieh es hier rein, sieh dir die
          Karten an und übernimm es mit einem Klick in razbiram.com. Kein Terminal, keine
          Installation.
        </p>

        <div
          className={`rz-dropzone${isOver ? " is-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".apkg"
            hidden
            onChange={(e) => accept(e.target.files?.[0])}
          />
          <div style={{ fontSize: 40, marginBottom: 8 }}>🃏</div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{file.name}</div>
              <div className="rz-faint" style={{ marginTop: 4 }}>{humanSize(file.size)}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                Anki-Deck (.apkg) hierher ziehen
              </div>
              <div className="rz-faint" style={{ marginTop: 4 }}>oder klicken zum Auswählen</div>
            </>
          )}
        </div>

        {file && (
          <div className="rz-card" style={{ marginTop: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="rz-badge band-A2">A2</span>
              <span className="rz-badge band-B1">B1</span>
              <span className="rz-faint">Kartentyp-Erkennung & Vorschau folgen im nächsten Schritt.</span>
            </div>
            <button className="rz-btn rz-btn-primary" disabled style={{ marginTop: 16 }}>
              In razbiram.com übernehmen
            </button>
          </div>
        )}
      </main>

      <footer
        className="rz-faint"
        style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 40px", fontSize: 13 }}
      >
        Part of the razbiram ecosystem · razbiram-anki · visual identity © razbiram.com
      </footer>
    </div>
  );
}
