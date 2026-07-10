# CLAUDE.md — razbiram-anki

Operating guide for Claude Code sessions in this repo. **Read order (precedence, highest first):**

1. **`../razbiram-nlp/docs/razbiram-ECOSYSTEM.md`** — the family constitution. VERBINDLICH for every razbiram repo. It wins over any single briefing where they diverge. Read it fully before substantive work.
2. **`BIBLE.md`** (this repo) — invariants + decision register for razbiram-anki. On conflict, BIBLE wins or is changed deliberately with a commit.
3. **`HANDOFF.md`** (this repo) — session log, newest first. Read at session start, append at session stop.
4. This file — the quick operating rules that tie the above together.

> If any of the three above don't exist yet, creating them is part of the current work (see "New-repo checklist" below).

## What this repo is

**razbiram-anki — the Anki bridge of the razbiram ecosystem.** Zone: **public tool, MIT** (per the ecosystem zone table). It moves learning content across the Anki boundary in **both directions**:

- **Forward** (ecosystem's documented role): `EnrichedDocument` (from razbiram-nlp) → styled Anki `.apkg` decks.
- **Reverse** (current active focus, per owner direction 2026-07-10): a student's existing Anki `.apkg` → razbiram.com's ingest format, so it can be taken into razbiram.com. Delivered as a **standalone web app** (Vite + React 19 + Tailwind v4 + TS, mirroring `razbiram-nlp/web`), pushing to the student's **own private GitHub repo + token**, which razbiram.com reads.

> The ecosystem doc's one-line role ("EnrichedDocument → Anki-Decks") predates the reverse direction. Reconcile via a Mini-ADR in the hub (`razbiram-nlp/docs/adr/`) before this becomes canonical — do not silently diverge.

## Binding standards (from ECOSYSTEM.md, applied here)

- **No reimplementation.** razbiram-nlp is the hub. Import `enrich_text`, the Pydantic models and the JSON Schema as a dependency — never copy them. Before any new module, check the hub for the function and record the result in the commit/HANDOFF. *(The `legacy/` Python CLI currently copies a model subset — that predates this rule and must be reconciled, not extended.)*
- **EnrichedDocument is the contract.** One source of truth in the hub; declare which `schemaVersion` this repo reads/writes. Extend via defined optional fields, never a parallel format.
- **Schema namespace.** The platform currently ingests `studywithme-bg.*` (e.g. `studywithme-bg.vocab.v1`); the family is migrating these to `razbiram.*`. Emit what the platform reads **today**, but isolate the schemaId behind one constant so the migration is a one-line change. New non-schema code must not spread the old name.
- **Corporate identity = one face.** Adopt razbiram's design tokens: the CEFR colour scale (verify against the Studio `web/src/styles.css` — **Studio is authoritative** where the doc's listed hexes differ), the coral `#e2533c` accent, Manrope/Unbounded/PT-Serif, the `razb·i·ram` node-mark wordmark. **Dark mode is mandatory family-wide** (even though the Studio is light-only today — go beyond it, don't copy the gap).
- **Theme is razbiram product IP.** The visual theme is **© razbiram.com**, not covered by this repo's MIT licence. Carry the same carve-out razbiram-nlp uses: a header in the stylesheet and a note in LICENSE. Attribute it; do not relicense it.
- **README skeleton** (identical across public repos): pitch → screenshot → "Part of the razbiram ecosystem" block (Mermaid family diagram + sibling links) → quickstart (≤3 commands) → feature/config reference → methodology ("evaluated, not assumed" — name the golden-set) → roadmap ("planned", never promised) → disclaimer + licence → author line: *Built by [Leon Köllerwirth Hlihel](https://leon-koellerwirth.com) — AI governance & agentic engineering in regulated environments.* + LinkedIn.
- **Golden-set = the house signature.** razbiram-anki's core heuristic is the **deck round-trip**: `.apkg → convert → back`, and `EnrichedDocument → deck → parse`, asserted field-for-field. Keep it as a net-free regression test; the README names it.
- **CI baseline.** ruff + offline pytest for `legacy/`; `tsc --noEmit` + `vite build` + web unit tests for the app. Green before building on a state. **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Security & law.** Secrets via env / user-supplied token only, never in the repo (`.env.example` as the pattern); the student's GitHub token lives only in their browser (localStorage), never committed or logged. Local-first, no telemetry. Example assets own/CC with `SOURCES.md`. Anki trademark disclaimer. No scraping, no unofficial endpoints.
- **Quality constants.** Type hints/TS types, docstrings, no dead code, "klein und exzellent" (line budgets from the briefing still apply). Bulgarian examples verifiably correct — simpler when in doubt.

## Working memory

- `BIBLE.md` — stable invariants + `- [ ]`/`- [x]` decision register. Public, so no business internals.
- `HANDOFF.md` — one entry per session (Done / Decided / Open / Next / Continuity warnings). Written at stop, read at start.
- Both are read before work and updated deliberately. `scripts/state.sh` (once it exists) is the factual truth over prose.

## New-repo checklist (ECOSYSTEM §9 — track in BIBLE)

- [ ] Briefing references ECOSYSTEM.md in its preamble
- [ ] Name/licence/description/topics set per the zone table
- [ ] Consumes/produces EnrichedDocument via the hub dependency; `schemaVersion` declared
- [ ] README follows the skeleton (ecosystem block, author line, methodology)
- [ ] Design tokens adopted; dark mode; CEFR scale identical to Studio
- [ ] Golden-set (deck round-trip) defined; CI baseline green
- [ ] BIBLE.md / HANDOFF.md created; SOURCES.md if assets
- [ ] No private-zone content; secrets check before any public push
- [ ] Entry in the hub README family diagram

## Commands

```bash
# Web app (reverse direction — current focus)
npm install
npm run dev            # Vite dev server
npm run build          # tsc --noEmit && vite build
npm test               # web unit tests (deck round-trip golden-set)

# Legacy Python CLI (forward direction)
cd legacy && python -m pytest -q && ruff check src tests
```
