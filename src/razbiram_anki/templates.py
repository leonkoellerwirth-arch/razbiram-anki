"""Anki note type, card templates, and the CSS that makes cards look finished.

A single note type — *razbiram Vocabulary* — carries every field a card might
need. From it we generate up to two cards per note:

- **Recognize** (BG word → meaning): the surface word and its example sentence
  on the front; lemma, morphology, gloss and CEFR band on the back.
- **Produce** (meaning → BG word): the gloss and a cloze'd example on the front,
  the word on the back. Optional — off for beginners via :class:`DeckConfig`.

Because the two configurations are *different* note types to Anki, each has its
own fixed ``model_id``. The ids are hard-coded (not random): genanki wants a
stable id so re-imports update the note type in place instead of forking it —
the same reasoning behind the deterministic note GUIDs in ``builder.py``.

The CSS lives in the template, not in a theme file, so a shared ``.apkg`` looks
identical on every device. Dark mode is handled with Anki's night-mode classes
(``.nightMode`` / ``.night_mode``) — a requirement, not a nicety.
"""

from __future__ import annotations

import genanki

from .models import CEFR_ORDER

# Fixed model ids. Two note types: with and without the produce card. Chosen
# once and frozen — changing them would orphan every previously imported note.
MODEL_ID_RECOGNIZE_ONLY = 1_607_392_001
MODEL_ID_RECOGNIZE_PRODUCE = 1_607_392_002
MODEL_NAME = "razbiram Vocabulary"

# The note fields, in order. The first field is Anki's sort field, so the deck
# browser sorts by the surface word. Every card template draws from this set.
FIELDS: tuple[str, ...] = (
    "Word",  # surface form as it appears in the text
    "Lemma",  # dictionary form
    "POS",  # readable word-class label, e.g. "noun"
    "Morph",  # compact morphology, e.g. "Masc · Sing · Def"
    "Gloss",  # contextual translation (de/en)
    "Example",  # source sentence, target word highlighted (HTML)
    "ExampleCloze",  # same sentence, target blanked for the produce card (HTML)
    "Band",  # CEFR band, e.g. "A2"
    "Source",  # text title / tag
)

# CEFR badge palette: A1 green → C2 red, the razbiram-studio difficulty scale.
BAND_COLORS: dict[str, str] = {
    "A1": "#2e9e5b",
    "A2": "#7cb342",
    "B1": "#f4b400",
    "B2": "#ef6c00",
    "C1": "#e2492f",
    "C2": "#c62828",
}
BAND_FALLBACK = "#78849a"  # unbanded words get a neutral slate badge

_RECOGNIZE_FRONT = """\
<div class="rz-card">
  <div class="rz-word">{{Word}}</div>
  {{#Example}}<div class="rz-example rz-muted">{{Example}}</div>{{/Example}}
</div>
"""

_RECOGNIZE_BACK = """\
<div class="rz-card">
  <div class="rz-word">{{Word}}</div>
  <div class="rz-meta">
    {{#Band}}<span class="rz-badge rz-badge-{{Band}}">{{Band}}</span>{{/Band}}
    {{#POS}}<span class="rz-pos">{{POS}}</span>{{/POS}}
  </div>
  <hr class="rz-rule">
  <div class="rz-gloss">{{Gloss}}</div>
  <div class="rz-lemma">{{#Lemma}}<span class="rz-label">Lemma</span> {{Lemma}}{{/Lemma}}\
{{#Morph}} · <span class="rz-morph">{{Morph}}</span>{{/Morph}}</div>
  {{#Example}}<div class="rz-example">{{Example}}</div>{{/Example}}
  {{#Source}}<div class="rz-source rz-muted">{{Source}}</div>{{/Source}}
</div>
"""

# Produce card is generated only when the cloze example exists (the {{#...}}
# guard means Anki skips the card for a note without one), so notes whose word
# never appears in a sentence simply don't get a produce card.
_PRODUCE_FRONT = """\
<div class="rz-card">
  <div class="rz-prompt rz-muted">Wie heißt das Wort?</div>
  <div class="rz-gloss">{{Gloss}}</div>
  {{#ExampleCloze}}<div class="rz-example rz-muted">{{ExampleCloze}}</div>{{/ExampleCloze}}
  <div class="rz-meta">
    {{#Band}}<span class="rz-badge rz-badge-{{Band}}">{{Band}}</span>{{/Band}}
    {{#POS}}<span class="rz-pos">{{POS}}</span>{{/POS}}
  </div>
</div>
"""

_PRODUCE_BACK = """\
<div class="rz-card">
  <div class="rz-word">{{Word}}</div>
  <div class="rz-meta">
    {{#Band}}<span class="rz-badge rz-badge-{{Band}}">{{Band}}</span>{{/Band}}
    {{#POS}}<span class="rz-pos">{{POS}}</span>{{/POS}}
  </div>
  <hr class="rz-rule">
  <div class="rz-gloss">{{Gloss}}</div>
  <div class="rz-lemma">{{#Lemma}}<span class="rz-label">Lemma</span> {{Lemma}}{{/Lemma}}\
{{#Morph}} · <span class="rz-morph">{{Morph}}</span>{{/Morph}}</div>
  {{#Example}}<div class="rz-example">{{Example}}</div>{{/Example}}
  {{#Source}}<div class="rz-source rz-muted">{{Source}}</div>{{/Source}}
</div>
"""


def _band_badge_css() -> str:
    """One CSS rule per CEFR band, coloured from the shared palette."""
    lines = []
    for band in CEFR_ORDER:
        color = BAND_COLORS.get(band, BAND_FALLBACK)
        lines.append(f".rz-badge-{band} {{ background: {color}; }}")
    return "\n".join(lines)


# System font stacks that render Cyrillic well on every platform, no web fonts.
CARD_CSS = f"""\
.card {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", "Noto Sans", "PT Sans", Arial, sans-serif;
  font-size: 20px;
  line-height: 1.5;
  color: #1c2430;
  background: #f7f8fa;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}}
.rz-card {{
  max-width: 34rem;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 1.5rem;
  text-align: center;
}}
.rz-word {{
  font-size: 2.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #10233f;
}}
.rz-prompt {{ font-size: 0.9rem; letter-spacing: 0.03em; text-transform: uppercase; }}
.rz-gloss {{ font-size: 1.35rem; font-weight: 500; margin: 0.35rem 0; }}
.rz-lemma {{ font-size: 0.95rem; margin-top: 0.4rem; }}
.rz-label {{ font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.6; }}
.rz-morph {{ font-style: italic; opacity: 0.85; }}
.rz-meta {{ margin-top: 0.6rem; display: flex; gap: 0.5rem; justify-content: center;
  align-items: center; flex-wrap: wrap; }}
.rz-pos {{
  font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase;
  color: #55627a; background: #e7ebf2; border-radius: 0.35rem; padding: 0.12rem 0.5rem;
}}
.rz-badge {{
  display: inline-block; min-width: 2.1rem; color: #fff; font-weight: 700;
  font-size: 0.8rem; letter-spacing: 0.03em; border-radius: 0.4rem; padding: 0.14rem 0.5rem;
}}
.rz-rule {{ border: none; border-top: 1px solid #dfe4ec; margin: 0.9rem auto; width: 60%; }}
.rz-example {{ font-size: 1.05rem; margin-top: 0.7rem; }}
.rz-example .target {{
  font-weight: 700; color: #10233f; background: rgba(244, 180, 0, 0.28);
  border-radius: 0.25rem; padding: 0 0.15rem;
}}
.rz-example .cloze {{ font-weight: 700; color: #9aa4b6; letter-spacing: 0.1em; }}
.rz-source {{ font-size: 0.78rem; margin-top: 0.9rem; }}
.rz-muted {{ color: #64708a; }}

{_band_badge_css()}

/* --- Dark mode: Anki night mode + OS preference --- */
.card.nightMode, .nightMode .card, .card.night_mode, .night_mode .card {{
  color: #dfe5ee; background: #1b2230;
}}
.nightMode .rz-word, .night_mode .rz-word,
.nightMode .rz-example .target, .night_mode .rz-example .target {{ color: #f3f6fb; }}
.nightMode .rz-pos, .night_mode .rz-pos {{ color: #c3ccdb; background: #2b3547; }}
.nightMode .rz-rule, .night_mode .rz-rule {{ border-top-color: #333d4f; }}
.nightMode .rz-muted, .night_mode .rz-muted {{ color: #97a2b6; }}
.nightMode .rz-example .target, .night_mode .rz-example .target {{
  background: rgba(244, 180, 0, 0.22);
}}
"""

_RECOGNIZE_TEMPLATE = {
    "name": "Recognize (BG → meaning)",
    "qfmt": _RECOGNIZE_FRONT,
    "afmt": _RECOGNIZE_BACK,
}
_PRODUCE_TEMPLATE = {
    "name": "Produce (meaning → BG)",
    "qfmt": _PRODUCE_FRONT,
    "afmt": _PRODUCE_BACK,
}


def model_name(*, produce: bool) -> str:
    """The note-type name for a configuration — shared by the .apkg and live paths."""
    return f"{MODEL_NAME} (recognize + produce)" if produce else f"{MODEL_NAME} (recognize)"


def card_templates(*, produce: bool) -> list[dict[str, str]]:
    """Card templates in AnkiConnect's ``{Name, Front, Back}`` shape.

    Same templates the genanki model uses (:func:`build_model`), just relabelled
    for the AnkiConnect ``createModel`` / ``updateModelTemplates`` actions.
    """
    chosen = [_RECOGNIZE_TEMPLATE, _PRODUCE_TEMPLATE] if produce else [_RECOGNIZE_TEMPLATE]
    return [{"Name": t["name"], "Front": t["qfmt"], "Back": t["afmt"]} for t in chosen]


def build_model(*, produce: bool) -> genanki.Model:
    """Return the note type, with or without the produce card.

    ``produce=True`` yields a two-card note type; ``produce=False`` a one-card
    one. Each uses its own frozen ``model_id`` so re-imports of the same
    configuration update the existing note type rather than creating a new one.
    """
    if produce:
        return genanki.Model(
            MODEL_ID_RECOGNIZE_PRODUCE,
            model_name(produce=True),
            fields=[{"name": name} for name in FIELDS],
            templates=[_RECOGNIZE_TEMPLATE, _PRODUCE_TEMPLATE],
            css=CARD_CSS,
        )
    return genanki.Model(
        MODEL_ID_RECOGNIZE_ONLY,
        model_name(produce=False),
        fields=[{"name": name} for name in FIELDS],
        templates=[_RECOGNIZE_TEMPLATE],
        css=CARD_CSS,
    )
