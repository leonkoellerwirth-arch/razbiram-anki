# HANDOFF — session log (newest first)

Each entry is one work session. Written at session stop, read at session start.
Concrete and honest.

## 2026-07-10 — branch main

**Done:**
- **Rescued an interrupted session**: finished the forward Python CLI
  (`EnrichedDocument` → `.apkg`, genanki), added an **AnkiConnect live-sync**
  (`razbiram-anki sync`), 23 net-free pytest tests, ruff-clean, CI green
  (3.11–3.13), and pushed the repo public
  (github.com/leonkoellerwirth-arch/razbiram-anki).
- **Pivot, per owner direction**: the reverse direction is the real product —
  a student's `.apkg` → razbiram.com. Mapped the ecosystem: razbiram.com ingests
  **CrowdAnki** `deck.json` + `deck.info.json` + media + `anki.manifest.json`
  from GitHub (format confirmed by reading `studywithme_db`), with simpler
  `studywithme-bg.vocab.v1` for flat vocab decks. `generate_manifests.py` is the
  coherence anchor for card-type detection + the deck.info schema.
- **Read the family constitution** (`razbiram-nlp/docs/razbiram-ECOSYSTEM.md`).
  Created governance per family standard: **CLAUDE.md**, **BIBLE.md**, this
  **HANDOFF.md**. Extracted the razbiram design tokens from `razbiram-nlp/web`.
- Moved the Python CLI to **`legacy/`**.
- **Phase 1 (scaffold + theme) built & verified**: Vite 8 + React 19 + Tailwind v4
  + TS app, mirroring `razbiram-nlp/web`. `src/styles.css` carries the razbiram
  tokens (© header) + the Studio CEFR scale + a new dark palette + a working theme
  toggle. App shell: node-mark wordmark, `.apkg` dropzone (reads the file, no
  conversion yet), razbiram-coherent look. `npm run build` green (tsc strict + vite).

- **Mapped the real app pipeline** (`~/dev/ai/studywithme-bg`, via subagent):
  raw `.apkg` parsing exists **nowhere** in the ecosystem — that whole step is the
  gap. The app consumes CrowdAnki JSON and has a full adapter chain
  (`ankiNoteParser` → `ankiDeckAdapter` → mcq/flashcard/occlusion + mixed-basic).
  It reads `studywithme_db` **read-only via a server token** (no per-student repo,
  no in-app push). A student **upload** surface already exists at `/learn/decks`
  (`POST /me/decks`) that accepts the app's **LearnDeck JSON**.
- **Corrected two earlier decisions** from this ground truth (BIBLE §4): output =
  **LearnDeck JSON** (uploadable today), not vocab.v1/CrowdAnki; and there is no
  per-student GitHub repo — the primary path is local file → `/learn/decks`.

**Decided (see BIBLE §4):** reverse direction = focus; standalone web app; output =
LearnDeck JSON via the existing `/learn/decks` upload; reuse by **mirroring** the
app's adapter chain (public MIT can't import the private app); CEFR scale = Studio
(emerald→amber); forward CLI frozen in `legacy/`; theme © razbiram.com.

**Open / blocked:**
- Hub Mini-ADR still to write (reverse role + CEFR table correction).
- razbiram.com's real ingest route (repo layout, token scopes) unconfirmed.
- Web app phases 2–6 not built yet (governance + Phase-1 scaffold done this session).
- `collection.anki21b` (zstd) parsing not yet handled.
- Reorg + governance + scaffold are **uncommitted** — public repo still shows the
  old Python-only layout until the next commit/push.

**Next:** Phase 3 — port the app's adapter chain into `src/adapt/` (from
`~/dev/ai/studywithme-bg/app/src/lib/adapters/*` + `utils/sanitizeAnkiHtml`),
feed it CrowdAnki shapes built from the parser, emit **LearnDeck JSON**. Golden-set:
`.apkg` → LearnDeck passes the app's `isLearnCardShape` and matches `adaptCrowdAnkiDeck`
card types/counts. Then Phase 4 UI (preview + download) + README.

**Continuity warnings:** the `web/` theme is razbiram product IP — attribute, don't
relicense. The student's GitHub token is browser-only. Import razbiram-nlp from the
hub; don't copy it. Bulgarian examples must stay correct.
