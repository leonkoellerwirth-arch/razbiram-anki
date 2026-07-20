# Screenshots

All own work — no third-party images. Regenerate them when the UI or the card
theme changes, so the README never shows a version that no longer exists.

- **`app.png`** — the landing page including the in-app guide. Taken from the
  running dev server (`./start.sh`) with headless Chrome at 900 px wide:
  `--headless --screenshot --window-size=900,1560 --virtual-time-budget=5000`.
- **`cards-light.png`** / **`cards-dark.png`** — real razbiram cards. Rendered by
  **Anki's own rendering path**, not mocked up: the example deck is imported with
  the `anki` Python library, `card.question()` / `card.answer()` give the exact
  HTML Anki shows, and that is screenshotted. Dark mode is the same HTML inside
  an element carrying Anki's `nightMode` class.

Rendering them through Anki rather than through our own preview is the point: a
screenshot that only proves our code agrees with itself is worth nothing.
