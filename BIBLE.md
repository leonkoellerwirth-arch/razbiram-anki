# BIBLE — the single source of truth for razbiram-anki

Invariants and open decisions. Read before any substantive work. When a conflict
arises, this file wins — or it is changed deliberately, with a commit. The family
constitution (`../razbiram-nlp/docs/razbiram-ECOSYSTEM.md`) still outranks it.

## §1 — What this is

**The public, MIT-licensed Anki bridge of the razbiram ecosystem.** Two directions:

- **Reverse (current focus).** A student's existing Anki `.apkg` → razbiram.com's
  **LearnDeck JSON**, which the student uploads through razbiram.com's *existing*
  `/learn/decks` surface (`POST /me/decks`) — no GitHub, no platform change. A
  **standalone web app** (Vite + React 19 + Tailwind v4 + TS, mirroring
  `razbiram-nlp/web`) that runs fully client-side: parse → adapt → download the
  LearnDeck JSON. (Ground truth: the app only ingests raw `.apkg` nowhere; this
  is the whole gap. It reads GitHub `studywithme_db` read-only via a *server*
  token — there is no per-student-repo mechanism, so we don't invent one.)
- **Forward (frozen in `legacy/`).** `EnrichedDocument` → styled Anki `.apkg`
  via genanki + an AnkiConnect live-sync. Kept as reference, not dual-maintained.

## §2 — Invariants (do not break without a decision)

1. **Hub, not copy.** razbiram-nlp is the source of truth. Import `enrich_text`,
   the models and the JSON Schema as a dependency. The `legacy/` CLI copies a
   model subset — it predates this rule and is frozen, not a pattern to extend.
2. **Contract stability.** Anything read from / written to the ecosystem declares
   its `schemaVersion`; extend via defined optional fields, never a parallel format.
3. **One schemaId constant.** The platform ingests `studywithme-bg.*` today; the
   family is migrating to `razbiram.*`. Emit what the platform reads now, behind a
   single constant, so the migration is a one-line change.
4. **Theme is razbiram product IP.** The visual theme is **© razbiram.com**, not
   covered by MIT. The token stylesheet carries a © header; LICENSE notes it.
   Attribute it; never relicense it.
5. **CEFR scale = Studio.** Emerald→teal→blue→indigo→violet→amber (A1 `#d1fae5`/
   `#047857` … C2 `#fef3c7`/`#b45309`), verified against `razbiram-nlp/web/src/
   styles.css`. Identical everywhere. (The ECOSYSTEM table's green→red values are
   stale — fix via hub ADR.)
6. **Dark mode is mandatory** (family-wide rule; the Studio is light-only today —
   go beyond it, don't copy the gap).
7. **Fully local, no accounts.** The primary path touches no GitHub and no token:
   the student converts in-browser and downloads a JSON file, then uploads it via
   the app's own `/learn/decks`. If an optional GitHub push is ever added, any
   token is browser-only (localStorage), never committed or logged.
8. **Linguistic correctness.** Every Bulgarian example is correct — no invented
   words, no wrong lemmata. Simpler when in doubt.
9. **The gate is law.** Green before building on a state: web `tsc --noEmit` +
   `vite build` + unit tests (incl. the round-trip golden-set); `legacy/` ruff +
   offline pytest.
10. **Local-first, no telemetry.** No network except the user's own GitHub push.

## §3 — Architecture map

Web app (client-only): **parse** (`.apkg` → JSZip unzip → sql.js reads
`collection.anki2`/`.anki21`/`.anki21b`) → **adapt** (build CrowdAnki
note/model shapes from the parse, then mirror the app's adapter chain —
`ankiNoteParser` field/detect helpers + `ankiDeckAdapter` (mcq / flashcard /
image-occlusion) + `ankiMixedBasicMcqAdapter`, ported since a public MIT tool
can't import the private app) → **LearnDeck JSON** (`studywithme-bg.learncard.v1`,
must pass the app's `isLearnCardShape`) → **preview** (razbiram theme) →
**download** → student uploads at `/learn/decks`. `legacy/` holds the frozen
Python forward bridge.

## §4 — Decision register

- [x] **Reverse direction is the current focus** — standalone web app; per-student
      private GitHub repo + token. (owner, 2026-07-10)
- [x] **Output format** — the app's **LearnDeck JSON** (`studywithme-bg.learncard.v1`),
      uploadable via the existing `/learn/decks`. (owner, 2026-07-10 — corrects the
      earlier vocab.v1/CrowdAnki choice once the real app pipeline was mapped.)
- [x] **GitHub reality** — the app reads `HamudiLeon/studywithme_db` **read-only via
      a server token**; no per-student repo, no in-app push. The primary path is
      local file → `/learn/decks` upload, not a GitHub push. (corrects the earlier
      per-student-repo+token choice.)
- [x] **Reuse by mirroring** — port the app's `.apkg`-absent adapter chain
      (`ankiNoteParser`/`ankiDeckAdapter`/`ankiMixedBasicMcqAdapter`/`sanitizeAnkiHtml`)
      into razbiram-anki; the private app can't be imported by a public MIT tool.
      When razbiram-anki is the 2nd/3rd consumer, extract to the hub (Rule of Three).
- [x] **CEFR scale = Studio** emerald→amber (authoritative over the ECOSYSTEM
      table). (owner, 2026-07-10)
- [x] **Forward Python CLI → `legacy/`**, frozen; not dual-maintained. (owner, 2026-07-10)
- [x] **Theme © razbiram.com** carve-out, mirroring razbiram-nlp.
- [ ] **Hub Mini-ADR** in `razbiram-nlp/docs/adr/`: record razbiram-anki's reverse
      role + correct the ECOSYSTEM CEFR table to the Studio values.
- [ ] **Confirm razbiram.com's real ingest route** for student decks: expected repo
      layout, path convention, and GitHub token scopes.
- [ ] **schemaId migration** `studywithme-bg.*` → `razbiram.*`, coordinated with the platform.
- [ ] **`collection.anki21b` (zstd) support** in the parser — modern Anki exports.
- [ ] Golden-set (deck round-trip) implemented and named in the README.
