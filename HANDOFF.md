# HANDOFF — session log (newest first)

Each entry is one work session. Written at session stop, read at session start.
Concrete and honest.

## 2026-07-10 (evening) — branch main

**Done (all live-verified on 5 real decks + real `generate_manifests.py`):**
- **Phase 3+4 built — the core was missing.** The old app only *stored* the dropped
  file; the button was `disabled`, nothing parsed. New `src/crowdanki/`:
  `deckJson.ts` (`.apkg → deck.json`, `::` tree, deterministic uuids), `uuid.ts`,
  `cardType.ts` (mirrors `generate_manifests.py`), `loadDeckJson.ts` (pass-through),
  `summary.ts`, `convert.ts` (unified entry), `download.ts` (bare `deck.json` / `.zip`
  + `media/`). App now: drop → parse → preview (deck, count, real card-type chips,
  sample cards) → download.
- **Two inputs.** Accept `.apkg` **and** an existing CrowdAnki `deck.json` (validate
  + pass through — the easy case, per owner).
- **Fixed crash "Unexpected token '(' … not valid JSON".** Modern `.anki21b` exports
  zstd-compress the `media` manifest (magic `28 b5 2f fd`) and its content is
  **protobuf** (`MediaEntries`), not JSON. New `src/apkg/mediaManifest.ts` decodes
  all three layouts (legacy JSON map / zstd+protobuf / empty). This also closed the
  old "anki21b not fixture-tested" item.
- **Fixed "empty json, very fast".** Root cause: the user's `.apkg` is **genuinely
  empty** — verified by two independent tools (Anki's own `.anki21b` = 0 notes; the
  CrowdAnki addon's folder `deck.json` = 0 notes/0 children). The 1 legacy note is
  Anki's "Please update…" placeholder. Fix: **pick the collection via `meta`** (like
  Anki), ignore compat stubs; and on 0 notes show a clear "no cards" message instead
  of a silent empty `deck.json`. Real decks still convert (573 / 365+117media / 270 /
  406).
- **`deck.json` viewer** (owner request): CodeMirror 6 (`@uiw/react-codemirror` +
  `@codemirror/lang-json` + `theme-one-dark`), mirroring the Studio's
  `JsonSourceEditor`. Read-only, line numbers/folding/search, light+dark, "ansehen"
  toggle + copy, **lazy-loaded** (main bundle stays 352 kB, CM in a 421 kB chunk).
- Removed the **fake A2/B1 CEFR badges** (meaningless for arbitrary decks → invariant
  §8) — replaced with real Anki card-type chips.
- Gate PASS (tsc + vite build + **23 tests**), dev server HTTP 200.

**Decided (see BIBLE §4, all ticked):** `.apkg→deck.json` built; two inputs
(`.apkg` + CrowdAnki `deck.json`); collection selection is **`meta`-driven** (stubs
ignored, empty → clear error); `.anki21b` zstd+protobuf media decoded; golden-set
implemented; CodeMirror `deck.json` viewer added.

**Open / blocked:**
- **No README yet** — write the student-facing README (skeleton) and name the deck
  round-trip golden-set. Nothing else names it.
- **Ingest route still unconfirmed** — so the primary button is a **download**, not a
  real 1-click "In razbiram.com übernehmen". Owner to confirm razbiram.com's route
  (repo layout / path / token scopes) before that becomes a real upload.
- Hub Mini-ADR (reverse role + CEFR table) still to write. schemaId migration pending.

**Next:** student-facing **README** (name the golden-set), then wire the real
razbiram.com **upload** once the ingest route is confirmed. Optionally: nicer 0-note
UX (its own info card rather than the error card).

**Continuity warnings:** theme © razbiram.com (attribute, don't relicense); output is
**CrowdAnki `deck.json` only** — the app owns everything downstream; import the hub,
don't copy; Bulgarian examples correct; the owner decides scope — execute, don't
over-ask. Collection selection follows `meta`, not "newest wins" — don't revert it.

---

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
- **Owner set the final output (definitive):** the parser produces **CrowdAnki
  `deck.json`** — exactly the format razbiram.com reads from
  `studywithme_db/app/studywithme-bg/anki/<Deck>/deck.json`. That is the whole job.
  No LearnDeck adapter port (the app owns everything downstream of `deck.json`);
  no per-student GitHub repo. Earlier vocab.v1 / LearnDeck framings are superseded.

**Decided (see BIBLE §4):** reverse direction = focus; standalone web app; output =
**CrowdAnki `deck.json`** (+ media); reuse by producing the exact shape the app's
`ankiNoteParser`/`generate_manifests.py` already read (no port); CEFR scale = Studio
(emerald→amber); forward CLI frozen in `legacy/`; theme © razbiram.com.

**Open / blocked:**
- Hub Mini-ADR still to write (reverse role + CEFR table correction).
- razbiram.com's real ingest route (repo layout, token scopes) unconfirmed.
- Web app phases 3–6 not built yet (governance + scaffold + `.apkg` parser done).
- `collection.anki21b` (zstd) parsing coded but not fixture-tested (need a modern export).

**Next (Phase 3 — the one remaining core piece):** `src/crowdanki/deckJson.ts` —
turn `ParsedApkg` into a CrowdAnki `deck.json`: a `Deck` (`__type__`, `name`,
`crowdanki_uuid`, `children` = the `::` tree, `note_models`, `notes`, `media_files`),
deterministic `crowdanki_uuid`s (stable re-export = update), notes referencing their
model's uuid. Match the real shape in
`studywithme_db/app/studywithme-bg/anki/Varna__Biologie/deck.json`. Golden-set:
`.apkg` → `deck.json` → feed a small `prepareCrowdAnkiNotes` mirror and assert the
notes/models/fields survive; run the file through `generate_manifests.py` logic and
check card-type detection. Then Phase 4 UI (drop → preview → download `deck.json` +
media) + student-facing README.

**Reference deck.json top-level keys** (verbatim from a real file): `__type__`,
`children`, `crowdanki_uuid`, `deck_config_uuid`, `deck_configurations`, `desc`,
`desiredRetention`, `dyn`, `extendNew`, `extendRev`, `media_files`, `name`,
`newLimit`, `newLimitToday`, `note_models`, `notes`, `reviewLimit`, `reviewLimitToday`.
NoteModel needs `__type__`, `crowdanki_uuid`, `name`, `flds:[{name,ord}]` (+ `tmpls`,
`css` for fidelity). Note needs `__type__`, `fields:[]`, `guid`, `note_model_uuid`, `tags:[]`.

**Session tooling (family standard, added 2026-07-10):** `start.sh` (Vite launcher,
live-verified HTTP 200); deterministic `scripts/{state,gate,secure,session-snapshot}.sh`;
and `.claude/skills/{session-start,session-end}`. Open a session with **session-start**,
close with **session-end**. The repo memory is `BIBLE.md` (invariants + decisions) +
`HANDOFF.md` (this log) + `CLAUDE.md` (rules); the skills read/write them.

**Continuity warnings:** the theme is razbiram product IP (© razbiram.com) — attribute,
don't relicense. Output is **CrowdAnki `deck.json` only** — the app owns everything
downstream; don't rebuild adapters. Import razbiram-nlp from the hub; don't copy it.
Bulgarian examples must stay correct. The owner decides scope — execute decisively,
don't over-ask.
