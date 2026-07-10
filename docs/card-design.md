# Card design

The goal is cards that look *finished* — the kind a learner keeps in their daily deck — without images, web fonts, or anything that breaks when a `.apkg` moves between devices. Every decision below serves that.

## One note type, up to two cards

There is a single note type, **razbiram Vocabulary**, with nine fields (`Word`, `Lemma`, `POS`, `Morph`, `Gloss`, `Example`, `ExampleCloze`, `Band`, `Source`). From it we generate:

- **Recognize (BG → meaning).** Front: the surface word and its example sentence. Back: CEFR badge, part of speech, gloss, lemma, morphology, the highlighted sentence, and the source tag.
- **Produce (meaning → BG).** Front: the gloss and the example sentence with the target word blanked (`·····`). Back: the word. Generated only when a cloze sentence exists, and switched off entirely for beginners via `produce_cards: false`.

`Word` is the first field, so it is Anki's sort field — the deck browser sorts by the surface word.

## Why the surface word, not the lemma

The front of a recognize card shows the word **as it appeared in the text** (`купува`), while the back reveals the dictionary form (`купувам`). Learners meet words in context; showing the inflected form they actually read, then teaching the lemma on the back, matches how reading-driven vocabulary acquisition works.

## Example sentences from character offsets

The example sentence is sliced out of the source text and the target word wrapped in `<span class="target">…</span>` using the exact character offsets razbiram-nlp records — translated from document- to sentence-relative. No re-tokenising, no fuzzy string search, so the highlight is always the precise token. If the offsets don't line up (they shouldn't with real output), the builder falls back to the plain, un-highlighted sentence rather than mangling it.

## CEFR badges

A coloured badge encodes difficulty at a glance, on the razbiram-studio scale:

| A1 | A2 | B1 | B2 | C1 | C2 |
| --- | --- | --- | --- | --- | --- |
| green | yellow-green | amber | orange | red-orange | red |

Words with no band get a neutral slate badge (and can be dropped entirely with `include_unbanded: false`).

## Dark mode is a requirement

The CSS lives in the note type, not a theme file, so a shared deck looks identical everywhere. Dark mode is handled with Anki's night-mode classes (`.nightMode` / `.night_mode`) — not an afterthought, a first-class second colour scheme.

## Cyrillic-friendly fonts, no web fonts

The font stack is system fonts that render Cyrillic well on every platform (`-apple-system`, `Segoe UI`, `Roboto`, `Noto Sans`, `PT Sans`, …). No bundled or web fonts: nothing to download, nothing that renders differently offline.

## Stable ids

Both the note GUIDs (`hash(lemma + source)`) and the two note-type `model_id`s are fixed, never random. That is what makes re-imports *update* existing notes and card templates in place instead of forking new copies — see [`../src/razbiram_anki/builder.py`](../src/razbiram_anki/builder.py) and [`../src/razbiram_anki/templates.py`](../src/razbiram_anki/templates.py).
