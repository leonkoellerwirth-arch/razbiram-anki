# Screenshots

All own work — no third-party images. Regenerate them when the UI or the card
theme changes, so the README never shows a version that no longer exists.

- **`app.png`** — the app with a deck loaded and the style toggle on. Taken from
  the running dev server (`./start.sh`) in a headless browser at 900 px wide.
- **`cards-light.png`** / **`cards-dark.png`** — real razbiram cards. Rendered by
  **Anki's own rendering path**, not mocked up: the example deck is imported with
  the `anki` Python library, `card.question()` / `card.answer()` give the exact
  HTML Anki shows, and that is screenshotted. Dark mode is the same HTML inside
  an element carrying Anki's `nightMode` class.

Rendering them through Anki rather than through our own preview is the point: a
screenshot that only proves our code agrees with itself is worth nothing.
