# BIBLE — the single source of truth for razbiram-anki

Invariants and open decisions. Read before any substantive work. When a conflict
arises, this file wins — or it is changed deliberately, with a commit. The family
constitution (`../razbiram-nlp/docs/razbiram-ECOSYSTEM.md`) still outranks it.

## §1 — What this is

**The public, MIT-licensed Anki bridge of the razbiram ecosystem.** Two directions:

- **Reverse (current focus).** A student's existing Anki `.apkg` → **CrowdAnki
  `deck.json`** — exactly the format razbiram.com reads from
  `studywithme_db/app/studywithme-bg/anki/<Deck>/deck.json`. That is the whole
  job. A **standalone web app** (Vite + React 19 + Tailwind v4 + TS, mirroring
  `razbiram-nlp/web`) that runs fully client-side: parse → build `deck.json`
  (+ media) → **optionally restyle** → download as `deck.json` **or `.apkg`**.
  (Ground truth: raw `.apkg` parsing exists nowhere in the ecosystem — this is
  the whole gap. Everything downstream of `deck.json` already exists in the app.)
  Since 2026-07-20 the app also hands the student their deck *back* in the
  razbiram style, as a real `.apkg` for their own Anki — razbiram.com still reads
  only `deck.json`, so that side of the contract is unchanged.
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
   Attribute it; never relicense it. This now also travels *outside* the app:
   `src/style/cardTheme.ts` ships inside every styled deck a student downloads,
   so it carries the same © notice inside the CSS string itself.
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

Web app (client-only). Two inputs, one output:
- **`.apkg`** → JSZip unzip → **pick collection via `meta`** → sql.js reads
  `collection.anki2`/`.anki21`/`.anki21b` (zstd via fzstd) → notes, models, decks,
  media (`mediaManifest.ts`: legacy JSON map *or* modern zstd+protobuf) →
  **build `deck.json`** (`deckJson.ts`: CrowdAnki `Deck` with `__type__`, `children`
  = the `::` tree, `note_models` at root, `notes`, `media_files`; deterministic
  `crowdanki_uuid`s so re-exports update).
- **`deck.json`** (an existing CrowdAnki export) → validate + pass through
  (`loadDeckJson.ts`) — the easy case.

Then **summary + preview** (`summary.ts`, card-type chips, sample cards, CodeMirror
`deck.json` viewer) → optional **razbiram style** → **download**. 0-note `.apkg` →
clear "no cards" error, never a silent empty file.

- **Style** (`src/style/`): `cardTheme.ts` holds the card CSS, the signature and
  the ES5 card script; `applyStyle.ts` maps them onto note models. CSS is always
  replaced; **templates only for models with exactly two fields**, because
  `detectCardType` calls everything it cannot place a "flashcard" and rewriting a
  9-field vocabulary model to front/back would drop content off the card.
- **Write** (`src/apkg/write.ts`): CrowdAnki deck → schema-11 `collection.anki2`
  via sql.js (no new dependency) → `.apkg`. Note GUIDs are preserved so a
  re-import updates; ids come from `stableId` so re-exports are stable.
- **Example deck** (`src/example/exampleDeck.ts`): six verified Bulgarian words
  across three CEFR bands, downloadable before the student has any deck of
  their own.
- **Download** (`download.ts`): bare `deck.json`, `.zip` with `media/`, or `.apkg`.

`legacy/` holds the frozen Python forward bridge.

## §4 — Decision register

- [x] **Reverse direction is the current focus** — standalone web app; per-student
      private GitHub repo + token. (owner, 2026-07-10)
- [x] **Output format** — the parser produces **CrowdAnki `deck.json`**, exactly the
      format razbiram.com reads from `studywithme_db/.../anki/<Deck>/deck.json`.
      That is the whole job; nothing more. (owner, 2026-07-10)
- [x] **GitHub reality** — the app reads `HamudiLeon/studywithme_db` **read-only via
      a server token**; no per-student repo, no in-app push. The primary path is
      local file → `/learn/decks` upload, not a GitHub push. (corrects the earlier
      per-student-repo+token choice.)
- [x] **Reuse by format-compatibility** — produce the exact CrowdAnki `deck.json`
      shape the app's `ankiNoteParser.prepareCrowdAnkiNotes` already reads (and that
      `generate_manifests.py` classifies). No adapter port: the app owns everything
      downstream of `deck.json`. razbiram-anki owns only `.apkg → deck.json`.
- [x] **CEFR scale = Studio** emerald→amber (authoritative over the ECOSYSTEM
      table). (owner, 2026-07-10)
- [x] **Forward Python CLI → `legacy/`**, frozen; not dual-maintained. (owner, 2026-07-10)
- [x] **Theme © razbiram.com** carve-out, mirroring razbiram-nlp.
- [x] **`.apkg → deck.json` built** (`src/crowdanki/`): deterministic-uuid tree
      builder (root = full `::` path, children = leaf, models at root), JSON
      pass-through for existing CrowdAnki `deck.json`, summary + card-type detection
      mirroring `generate_manifests.py`, download (bare `deck.json` / `.zip` with
      `media/`). App wired: drop → parse → preview → download. (2026-07-10)
- [x] **Collection selection = `meta`-driven** (like Anki): the `meta` version picks
      `.anki21b`/`.anki21`/`.anki2`; other members are compat stubs and are ignored
      (a lone "Please update Anki" placeholder must never surface as a card). Empty
      export → clear "0 Karten" message, not a silent empty `deck.json`. (2026-07-10)
- [x] **`collection.anki21b` (zstd) support** — done and verified on 5 real modern
      exports; the `media` manifest is zstd+protobuf (`MediaEntries`), decoded in
      `src/apkg/mediaManifest.ts` (legacy JSON map still supported).
- [x] **Golden-set (deck round-trip) implemented**: `deckJson.test.ts` runs
      `.apkg → deck.json` through a mirror of the app's `collectModels/collectNotes`;
      `mediaManifest`/`pickCollection`/`loadDeckJson` tested too (23 tests). Still to
      name it in the README.
- [x] **`deck.json` viewer in the app** — CodeMirror 6 (`@uiw/react-codemirror` +
      `@codemirror/lang-json`), mirroring the Studio's `JsonSourceEditor`; read-only,
      light+dark, lazy-loaded (code-split). (owner request, 2026-07-10)
- [x] **Students get the razbiram style in their own Anki** — the app restyles a
      converted deck and exports a real `.apkg`. Toggle, default **off**: the
      student's original note models are kept and restored when it is switched
      back. (owner, 2026-07-20)
- [x] **Both delivery formats** — the style lives in the `note_models` of the
      `deck.json` *and* in a `.apkg`, so no CrowdAnki add-on is needed to import
      it. Extends the former "deck.json only" output rule deliberately;
      razbiram.com's own ingest contract is untouched. (owner, 2026-07-20)
- [x] **`.apkg` writer targets schema 11** (`collection.anki2`), sql.js, no new
      dependency. The DDL and the `col` JSON blob shapes were dumped from a real
      deck, and the output was imported with **Anki's own Python importer**
      (notes, cards, deck tree, notetype, fields, tags all intact) — verified,
      not assumed. (2026-07-20)
- [x] **Templates are only rewritten for two-field models**; everything else gets
      CSS only. Narrower than the design proposed, because `detectCardType`
      answers "flashcard" for anything unclassified, and a template rewrite would
      silently drop fields off richer cards. (2026-07-20)
- [x] **Card signature** — back face only: the `razb·i·ram` wordmark, a real link
      to razbiram.com and the tagline **"Kostenlos für Lernende"**, isolated in
      `RAZBIRAM_TAGLINE` so the wording changes in one place. Never on the front:
      the question surface stays free. (owner, 2026-07-20)
- [x] **Example deck** — six Bulgarian words (A1/A2/B1) with German glosses,
      downloadable from the landing page. BIBLE §8 applies: each entry and each
      example sentence was checked; anything uncertain was left out. (2026-07-20)
- [ ] **Hub Mini-ADR** in `razbiram-nlp/docs/adr/`: record razbiram-anki's reverse
      role + correct the ECOSYSTEM CEFR table to the Studio values.
- [ ] **Confirm razbiram.com's real ingest route** for student decks: expected repo
      layout, path convention, and GitHub token scopes. (Blocks a real 1-click
      "In razbiram.com übernehmen" — today the concrete action is a download.)
- [ ] **schemaId migration** `studywithme-bg.*` → `razbiram.*`, coordinated with the platform.
- [ ] **README** — write the student-facing README (skeleton) and name the deck
      round-trip golden-set in the methodology section.
