import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFile, type ConvertResult } from "./crowdanki/convert";
import { downloadApkg, downloadDeck } from "./crowdanki/download";
import { applyRazbiramStyle } from "./style/applyStyle";
import { buildExampleDeck, EXAMPLE_DECK_NAME } from "./example/exampleDeck";
import type { CrowdAnkiDeck } from "./crowdanki/types";
import { loadDeckJson } from "./crowdanki/loadDeckJson";
import { summarize } from "./crowdanki/summary";
import { cardTypeLabel } from "./crowdanki/cardType";

// CodeMirror is heavy and only needed once the student opens the preview — split it out.
const DeckJsonViewer = lazy(() => import("./DeckJsonViewer"));

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

type Status =
  | { phase: "idle" }
  | { phase: "converting" }
  | { phase: "done"; result: ConvertResult }
  | { phase: "error"; message: string };

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [isOver, setIsOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File | undefined) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith(".apkg") && !name.endsWith(".json")) {
      setFile(f);
      setStatus({ phase: "error", message: "Bitte eine Anki-Datei (.apkg) oder eine deck.json auswählen." });
      return;
    }
    setFile(f);
    setStatus({ phase: "converting" });
    convertFile(f)
      .then((result) => setStatus({ phase: "done", result }))
      .catch((err: unknown) =>
        setStatus({ phase: "error", message: err instanceof Error ? err.message : "Konvertierung fehlgeschlagen." }),
      );
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
          Hast du ein Anki-Deck — eigenes oder von Freunden? Zieh es hier rein (<code>.apkg</code> oder eine
          fertige <code>deck.json</code>), sieh dir die Karten an und lade es für razbiram.com herunter.
          Kein Terminal, keine Installation.
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
            accept=".apkg,.json,application/json"
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
                Anki-Deck (.apkg) oder deck.json hierher ziehen
              </div>
              <div className="rz-faint" style={{ marginTop: 4 }}>oder klicken zum Auswählen</div>
            </>
          )}
        </div>

        <ExampleDeckLink />

        {status.phase === "converting" && (
          <div className="rz-card rz-muted" style={{ marginTop: 20 }}>
            Karten werden gelesen …
          </div>
        )}

        {status.phase === "error" && (
          <div className="rz-card" style={{ marginTop: 20, borderColor: "var(--primary)" }}>
            <strong>Das hat nicht geklappt.</strong>
            <div className="rz-muted" style={{ marginTop: 6 }}>{status.message}</div>
          </div>
        )}

        {status.phase === "done" && <Result result={status.result} dark={theme === "dark"} />}
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

/** A student with no deck of their own still gets to see the razbiram style: one
 *  quiet secondary action under the dropzone, never competing with it. */
function ExampleDeckLink() {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  const onDownload = useCallback(() => {
    setState("busy");
    downloadApkg(buildExampleDeck(), [], "razbiram-beispieldeck")
      .then(() => setState("idle"))
      .catch(() => setState("failed"));
  }, []);

  return (
    <div className="rz-faint" style={{ marginTop: 12, fontSize: 14, textAlign: "center" }}>
      {state === "failed" ? (
        <span>Das Beispieldeck konnte nicht erstellt werden — bitte neu laden.</span>
      ) : (
        <>
          Noch kein Deck?{" "}
          <button className="rz-link" onClick={onDownload} disabled={state === "busy"}>
            {state === "busy" ? "wird erstellt …" : `„${EXAMPLE_DECK_NAME}“ herunterladen`}
          </button>{" "}
          — sechs bulgarische Wörter im razbiram-Stil, direkt für Anki.
        </>
      )}
    </div>
  );
}

type Validation =
  | { kind: "pristine" }
  | { kind: "valid"; deck: ReturnType<typeof loadDeckJson> }
  | { kind: "invalid"; message: string };

function Result({ result, dark }: { result: ConvertResult; dark: boolean }) {
  const [saving, setSaving] = useState(false);
  const [savingApkg, setSavingApkg] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [styled, setStyled] = useState(false);

  // The style toggle swaps the note models' css/templates. The student's original
  // models are never discarded — switching the toggle off restores them exactly.
  const models = (result.deck as CrowdAnkiDeck).note_models;
  const activeDeck = useMemo(() => {
    if (!styled || !models || models.length === 0) return result.deck;
    return { ...result.deck, note_models: applyRazbiramStyle(models).styled };
  }, [styled, models, result.deck]);

  // The generated deck.json is the starting point; the student may edit `draft`
  // before download. Reset the draft whenever a new file is converted.
  const generated = useMemo(() => JSON.stringify(activeDeck, null, 1), [activeDeck]);
  const [draft, setDraft] = useState(generated);
  useEffect(() => {
    setDraft(generated);
    setShowJson(false);
  }, [generated]);

  const edited = draft !== generated;
  const validation: Validation = useMemo(() => {
    if (!edited) return { kind: "pristine" };
    try {
      return { kind: "valid", deck: loadDeckJson(draft) };
    } catch (err) {
      return { kind: "invalid", message: err instanceof Error ? err.message : "Ungültige deck.json." };
    }
  }, [draft, edited]);

  // Preview reflects valid edits live; falls back to the generated summary.
  const summary = useMemo(
    () => (validation.kind === "valid" ? summarize(validation.deck) : result.summary),
    [validation, result.summary],
  );
  const canDownload = validation.kind !== "invalid";

  const onDownload = useCallback(() => {
    setSaving(true);
    // Always hand over the JSON currently on screen — styled, edited, or neither.
    downloadDeck(result, draft).finally(() => setSaving(false));
  }, [result, draft]);

  const onDownloadApkg = useCallback(() => {
    setSavingApkg(true);
    const deck = (validation.kind === "valid" ? validation.deck : activeDeck) as CrowdAnkiDeck;
    downloadApkg(deck, result.media, result.baseName).finally(() => setSavingApkg(false));
  }, [validation, activeDeck, result]);

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }, [draft]);

  return (
    <div className="rz-card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {summary.cardTypes.map((t) => (
          <span key={t} className="rz-chip">{cardTypeLabel(t)}</span>
        ))}
        {summary.hasMedia && <span className="rz-chip">mit Medien</span>}
        {edited && validation.kind === "valid" && <span className="rz-chip">bearbeitet</span>}
      </div>

      <div style={{ margin: "14px 0 4px", fontWeight: 700, fontSize: 18 }}>{summary.rootName}</div>
      <div className="rz-muted">
        <span className="rz-numeral">{summary.totalNotes}</span> Karten
        {summary.deckNames.length > 1 && <> · {summary.deckNames.length} Unterdecks</>}
        {" · "}
        {result.sourceKind === "apkg" ? "aus .apkg" : "aus deck.json"}
      </div>

      {summary.sampleCards.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 8 }}>
          {summary.sampleCards.map((card, i) => (
            <li
              key={i}
              style={{
                border: "1px solid var(--hairline)",
                borderRadius: "var(--r-md)",
                padding: "10px 12px",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ fontWeight: 600 }}>{card.front || <span className="rz-faint">(leer)</span>}</div>
              {card.back && <div className="rz-muted" style={{ marginTop: 2 }}>{card.back}</div>}
            </li>
          ))}
        </ul>
      )}

      {models && models.length > 0 && (
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, cursor: "pointer" }}
        >
          <input type="checkbox" checked={styled} onChange={(e) => setStyled(e.target.checked)} />
          <span style={{ fontWeight: 600 }}>razbiram-Stil anwenden</span>
          <span className="rz-faint" style={{ fontSize: 13 }}>
            dein Original bleibt erhalten — Häkchen weg, und alles ist wie vorher
          </span>
        </label>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, alignItems: "center" }}>
        <button className="rz-btn rz-btn-primary" onClick={onDownload} disabled={saving || !canDownload}>
          {saving ? "wird erstellt …" : result.media.length > 0 ? "deck.json + Medien herunterladen" : "deck.json herunterladen"}
        </button>
        <button className="rz-btn" onClick={onDownloadApkg} disabled={savingApkg || !canDownload}>
          {savingApkg ? "wird erstellt …" : ".apkg für Anki"}
        </button>
        <button className="rz-btn" onClick={() => setShowJson((v) => !v)} aria-expanded={showJson}>
          {showJson ? "Editor schließen" : "deck.json bearbeiten"}
        </button>
        {showJson && (
          <button className="rz-btn" onClick={onCopy}>{copied ? "kopiert ✓" : "kopieren"}</button>
        )}
        {edited && (
          <button className="rz-btn" onClick={() => setDraft(generated)}>zurücksetzen</button>
        )}
      </div>

      {showJson ? (
        <div style={{ marginTop: 8, fontSize: 13 }} className={validation.kind === "invalid" ? "" : "rz-faint"}>
          {validation.kind === "invalid" ? (
            <span style={{ color: "var(--primary)" }}>⚠ {validation.message} — Download nutzt bis dahin die Originaldatei.</span>
          ) : validation.kind === "valid" ? (
            <span>✓ Gültige deck.json — der Download enthält deine Änderungen.</span>
          ) : (
            <span>Bearbeite die deck.json direkt hier; der Download übernimmt gültige Änderungen.</span>
          )}
        </div>
      ) : (
        <div className="rz-faint" style={{ marginTop: 8, fontSize: 13 }}>
          Lade die Datei anschließend in razbiram.com hoch.
        </div>
      )}

      {showJson && (
        <div style={{ marginTop: 14 }}>
          <Suspense fallback={<div className="rz-faint">Editor wird geladen …</div>}>
            <DeckJsonViewer value={draft} dark={dark} onChange={setDraft} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
