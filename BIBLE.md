# BIBLE — the single source of truth for razbiram-anki

Invariants and open decisions. Read before any substantive work. When a conflict
arises, this file wins — or it is changed deliberately, with a commit. The family
constitution (`../razbiram-nlp/docs/razbiram-ECOSYSTEM.md`) still outranks it.

## §1 — What this is

**The public, MIT-licensed Anki bridge of the razbiram ecosystem.** Two directions:

- **Reverse (current focus).** A student's existing Anki `.apkg` → razbiram.com's
  ingest format, so it can be taken into razbiram.com. A **standalone web app**
  (Vite + React 19 + Tailwind v4 + TS, mirroring `razbiram-nlp/web`) that runs
  fully client-side, converts, previews, and pushes to the student's **own
  private GitHub repo + token** — which razbiram.com reads.
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
7. **Token stays in the browser.** The student's GitHub token lives only in their
   own browser (localStorage). Never committed, never logged, never sent anywhere
   but GitHub's API.
8. **Linguistic correctness.** Every Bulgarian example is correct — no invented
   words, no wrong lemmata. Simpler when in doubt.
9. **The gate is law.** Green before building on a state: web `tsc --noEmit` +
   `vite build` + unit tests (incl. the round-trip golden-set); `legacy/` ruff +
   offline pytest.
10. **Local-first, no telemetry.** No network except the user's own GitHub push.

## §3 — Architecture map

Web app (client-only): **parse** (`.apkg` → JSZip unzip → sql.js reads
`collection.anki2`/`.anki21`/`.anki21b`) → **convert** (patterns.json card-type
detection → 2-field → `vocab.v1`; else → CrowdAnki `deck.json` + `deck.info.json`,
logic mirrored from `studywithme_db/.../anki/generate_manifests.py`) → **preview**
(razbiram theme) → **push** (GitHub API → student's private repo + manifest).
`legacy/` holds the frozen Python forward bridge.

## §4 — Decision register

- [x] **Reverse direction is the current focus** — standalone web app; per-student
      private GitHub repo + token. (owner, 2026-07-10)
- [x] **Output format** — `vocab.v1` for simple 2-field decks, CrowdAnki fallback
      for everything else (images / cloze / MCQ). (owner, 2026-07-10)
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
