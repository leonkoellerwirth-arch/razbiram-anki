---
description: Open a work session on razbiram-anki — reconstruct the exact project state from the deterministic scripts and the repo memory (BIBLE.md, HANDOFF.md) before changing anything, so work continues without drift. Counterpart to session-end. Trigger: "session-start", "continue", "where were we", "new session", "catch me up", start of a work session.
allowed-tools: Bash, Read, Grep, Glob
---

Reconstruct the exact state **before** writing or changing anything. Goal: **no drift from the existing project and the razbiram family standard.**

**Step 0 — Family constitution (precedence).**
Read `../razbiram-nlp/docs/razbiram-ECOSYSTEM.md` — it outranks any single briefing and this repo's docs where they diverge. Then `CLAUDE.md` (this repo's operating rules).

**Step 1 — Deterministic truth (scripts, no AI):**
- `./scripts/state.sh` — branch, HEAD, uncommitted/unpushed, web LoC, vitest count.
- `./scripts/gate.sh` — the hard quality gate (must be PASS to build on).
- `./scripts/secure.sh` — is everything committed & pushed?

**Step 2 — Repo memory (in this order):**
- `HANDOFF.md` — read the **top (newest) entry** in full: Done / Decided / Open-blocked / Next / Continuity warnings.
- `BIBLE.md` — the invariants (§2) and the **Decision register** (§4): every open `- [ ]` item.
- If the next task is unclear, skim the newest persistent memory note.

**Step 3 — Brief the user (short, concrete):**
1. **Where we are** — numbers from `state.sh` + gate/secure status (green/red).
2. **Last done** — from the newest HANDOFF entry.
3. **Blocking decisions** — which open BIBLE decision-register items block the next task; clear them with the owner first.
4. **Next** — the concrete next step (HANDOFF "Next").
5. **Continuity warnings** — invariants that must not break (theme © razbiram.com; output = CrowdAnki `deck.json` only; import the hub, don't copy; Bulgarian examples correct; the owner decides scope — execute, don't over-ask).

**Rule:** Do not start substantive work while a blocking BIBLE decision is open. If `gate.sh` fails or `secure.sh` reports unsaved/unpushed work, fix that first. End the session with **session-end**.
