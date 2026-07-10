# Example: from enriched JSON to an Anki deck in three steps

This folder has everything you need to see a finished deck before running razbiram-nlp on your own text.

- **`sample-enriched.json`** — a short own Bulgarian paragraph (*„Майка ми купува хляб и мляко. Ние сме голямо семейство. Днес пия кафе и ям една ябълка."*) in razbiram-nlp's enriched-document format. The words are authentic A2 vocabulary; the German glosses and CEFR bands are filled in as razbiram-nlp would.
- **`sample-deck.apkg`** — the deck generated from it, checked in so you can import it immediately.

## Three steps

**1. Build the deck** (or just use the checked-in `sample-deck.apkg`):

```bash
razbiram-anki build \
  --in examples/sample-enriched.json \
  --out examples/sample-deck.apkg \
  --title "Meine Familie" \
  --gloss de
```

**2. Import into Anki:** open Anki → *File → Import…* → pick `sample-deck.apkg`.

**3. Study.** You get 11 words × 2 cards — *Recognize* (Bulgarian → German) and *Produce* (German + cloze → Bulgarian). Re-run step 1 after editing the text and re-import: the cards **update**, they don't duplicate.

### Or skip the import entirely

With Anki open and the AnkiConnect add-on installed (code `2055492159`), push the cards straight in:

```bash
razbiram-anki sync --in examples/sample-enriched.json --title "Meine Familie" --gloss de
```

No file, no import dialog — the deck appears in Anki ready to study, and a re-sync updates it in place.

## Try the knobs

```bash
# Only A1 words, recognize cards only, at most 6 cards (the hardest kept):
razbiram-anki build --in examples/sample-enriched.json --out a1.apkg \
  --title "Meine Familie" --levels A1 --no-produce --max-cards 6
```
