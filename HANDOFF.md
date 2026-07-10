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

**Decided (see BIBLE §4):** reverse direction = focus; standalone web app;
per-student private repo + token; output `vocab.v1` + CrowdAnki fallback; CEFR
scale = Studio (emerald→amber); forward CLI frozen in `legacy/`; theme © razbiram.com.

**Open / blocked:**
- Hub Mini-ADR still to write (reverse role + CEFR table correction).
- razbiram.com's real ingest route (repo layout, token scopes) unconfirmed.
- Web app phases 2–6 not built yet (governance + Phase-1 scaffold done this session).
- `collection.anki21b` (zstd) parsing not yet handled.
- Reorg + governance + scaffold are **uncommitted** — public repo still shows the
  old Python-only layout until the next commit/push.

**Next:** Phase 2 — the `.apkg` parser (`src/apkg/`: JSZip unzip → sql.js read
`collection.anki2` → notes/models/media) with the deck round-trip golden-set,
then Phase 3 convert (`vocab.v1` + CrowdAnki).

**Continuity warnings:** the `web/` theme is razbiram product IP — attribute, don't
relicense. The student's GitHub token is browser-only. Import razbiram-nlp from the
hub; don't copy it. Bulgarian examples must stay correct.
