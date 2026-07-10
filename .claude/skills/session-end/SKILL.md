---
description: Close a work session on razbiram-anki — save the repo memory, pass the hard gate, and commit & push everything so nothing is forgotten and nothing is left half-done. Counterpart to session-start. Trigger: "session-end", "session-stop", "wrap up", "end session", "done for today", "close the session", end of a work session.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Close the session so the next one (via session-start) continues **without drift, without loss, and without a half-finished hand-off**. Do not skip a step; actually run each one.

**Step 1 — Inventory.**
- `git status --short` — what is open? Nothing should be left unintentionally.
- If code changed and something is now unverified, drive it (or say explicitly what is still unverified).

**Step 2 — Update canon & continuity.**
- `BIBLE.md` — record decisions made this session; tick or add Decision-register (§4) items. Decisions live in the file, not just the chat.
- **★ Rescue chat threads (mandatory, or they are lost):** any idea, owner input, or half-formed plan that exists only in this conversation and is in **no file** yet goes into the HANDOFF entry (Open/Next). Preserve, don't invent.

**Step 3 — Hard gate.**
- `./scripts/gate.sh` (add `--legacy` if `legacy/` changed) — **must print GATE: PASS.** Fix any failure first.

**Step 4 — Write the repo memory.**
- `./scripts/session-snapshot.sh` and prepend its block to the **top** of `HANDOFF.md` (newest first).
- Fill the `_(fill in)_` lines with what really happened: **Done · Decided · Open/blocked · Next · Continuity warnings**. Concrete and honest — `state.sh` is the truth.

**Step 5 — Secure (git).**
- Commit granularly (Conventional Commits: feat/fix/docs/chore/test…). Document what and why.
- `git push origin main`.
- `./scripts/secure.sh` — **must report "all saved".**

**Step 6 — Hand off.**
Give a short closing note: state (numbers), what was saved, what is next, which decisions block the next session.

**Rule:** the session is done only when `gate.sh` is PASS, `secure.sh` says "all saved", and the newest `HANDOFF.md` entry reflects reality. Invent nothing, hide nothing, leave nothing uncommitted.
