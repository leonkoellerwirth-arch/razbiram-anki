"""Turn an :class:`EnrichedDocument` into an Anki ``.apkg`` deck.

The pipeline is small and linear:

    document → select vocab (filters) → one Note per word → Deck → .apkg

Two design details carry the professional feel of the output:

**Deterministic GUIDs.** A note's identity is a hash of ``lemma + source``, not
a random id. Re-exporting the same text therefore *updates* the existing notes
in Anki instead of duplicating them — the difference between a tool a learner
uses every week and a throwaway. See :func:`_note_guid`.

**Example sentences from the source.** For each word we pull the first sentence
it occurs in, highlight the target for the recognize card, and blank it for the
produce card — both computed from the character offsets razbiram-nlp records, so
the highlight is exact and never re-tokenises.
"""

from __future__ import annotations

import html
from dataclasses import dataclass
from pathlib import Path

import genanki

from .filters import select_vocab
from .models import DeckConfig, EnrichedDocument, Sentence, Token, VocabEntry
from .templates import build_model

# A frozen deck id, same rationale as the model ids in templates.py: stable so
# re-imports land in the same deck. The per-note GUIDs do the real de-duping.
DECK_ID = 1_607_392_050

# Universal POS tags → short readable labels for the card's POS chip.
_POS_LABELS: dict[str, str] = {
    "NOUN": "noun",
    "PROPN": "proper noun",
    "VERB": "verb",
    "AUX": "auxiliary",
    "ADJ": "adjective",
    "ADV": "adverb",
    "PRON": "pronoun",
    "DET": "determiner",
    "ADP": "preposition",
    "NUM": "numeral",
    "CCONJ": "conjunction",
    "SCONJ": "conjunction",
    "PART": "particle",
    "INTJ": "interjection",
}

# UD feature values → compact human forms, and the order they read best in.
_FEATURE_ORDER: tuple[str, ...] = (
    "Aspect",
    "Tense",
    "Mood",
    "Person",
    "Number",
    "Gender",
    "Case",
    "Definite",
    "Degree",
    "VerbForm",
)
_FEATURE_VALUES: dict[str, str] = {
    "Imp": "imperfective",
    "Perf": "perfective",
    "Pres": "present",
    "Past": "past",
    "Fut": "future",
    "Ind": "indicative",
    "Sing": "singular",
    "Plur": "plural",
    "Masc": "masculine",
    "Fem": "feminine",
    "Neut": "neuter",
    "Nom": "nominative",
    "Acc": "accusative",
    "Dat": "dative",
    "Voc": "vocative",
    "Def": "definite",
    "Pos": "positive",
    "Cmp": "comparative",
    "Sup": "superlative",
}


@dataclass(frozen=True)
class BuildResult:
    """What :func:`build_deck` produced, for the CLI summary and tests."""

    path: Path
    deck_name: str
    note_count: int
    card_count: int
    skipped_no_gloss: int


@dataclass(frozen=True)
class NoteData:
    """One card's content, backend-agnostic: the .apkg builder and the live
    AnkiConnect sync both consume this so a card looks identical either way."""

    lemma: str
    fields: list[str]  # aligned with templates.FIELDS
    tags: list[str]
    guid: str


def iter_note_data(doc: EnrichedDocument, config: DeckConfig) -> tuple[list[NoteData], int]:
    """Select vocab and turn each usable word into :class:`NoteData`.

    Returns ``(notes, skipped_no_gloss)`` — a word with no usable gloss is
    dropped (a card with no meaning is useless) and counted, not turned into a note.
    """
    lemma_index = _index_first_occurrences(doc.sentences)
    selected = select_vocab(doc.vocab, config)

    notes: list[NoteData] = []
    skipped = 0
    for entry in selected:
        gloss = _pick_gloss(entry, config)
        if gloss is None:
            skipped += 1
            continue
        notes.append(_note_data(entry, gloss, lemma_index.get(entry.lemma), config))
    return notes, skipped


def build_deck(doc: EnrichedDocument, config: DeckConfig, out_path: str | Path) -> BuildResult:
    """Build a ``.apkg`` from ``doc`` under ``config`` and write it to ``out_path``.

    Returns a :class:`BuildResult` with counts. A word with no usable gloss is
    skipped (a card with no meaning is useless) and counted in
    ``skipped_no_gloss``.
    """
    out_path = Path(out_path)
    model = build_model(produce=config.produce_cards)
    deck_name = config.resolved_deck_name()
    deck = genanki.Deck(DECK_ID, deck_name)

    notes, skipped = iter_note_data(doc, config)
    for nd in notes:
        deck.add_note(genanki.Note(model=model, fields=nd.fields, guid=nd.guid, tags=nd.tags))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    genanki.Package(deck).write_to_file(str(out_path))

    cards_per_note = 2 if config.produce_cards else 1
    return BuildResult(
        path=out_path,
        deck_name=deck_name,
        note_count=len(notes),
        card_count=len(notes) * cards_per_note,
        skipped_no_gloss=skipped,
    )


# --- Gloss selection ---------------------------------------------------------


def _pick_gloss(entry: VocabEntry, config: DeckConfig) -> str | None:
    """The gloss text to show, respecting ``config.gloss_lang``; None if unusable."""
    gloss = entry.gloss
    if gloss is None or not gloss.text.strip():
        return None
    if config.gloss_lang and gloss.lang != config.gloss_lang:
        return None
    return gloss.text.strip()


# --- Example sentence handling ----------------------------------------------


def _index_first_occurrences(sentences: list[Sentence]) -> dict[str, tuple[Sentence, Token]]:
    """Map each lemma to the first (sentence, token) it appears in."""
    index: dict[str, tuple[Sentence, Token]] = {}
    for sentence in sentences:
        for token in sentence.tokens:
            if token.lemma and token.lemma not in index:
                index[token.lemma] = (sentence, token)
    return index


def _example_html(sentence: Sentence, token: Token) -> tuple[str, str]:
    """Return ``(highlighted, cloze)`` HTML for a sentence around ``token``.

    Both are built by slicing the sentence with the token's character offsets
    (translated from document- to sentence-relative), so the marked span is
    exactly the surface token — no re-tokenising, no fuzzy matching.
    """
    rel_start = token.start - sentence.start
    rel_end = token.end - sentence.start
    text = sentence.text
    if not (0 <= rel_start < rel_end <= len(text)) or text[rel_start:rel_end] != token.text:
        # Offsets don't line up (shouldn't happen with real output); fall back to
        # the plain sentence so we still show useful context.
        escaped = html.escape(text)
        return escaped, escaped

    before = html.escape(text[:rel_start])
    target = html.escape(text[rel_start:rel_end])
    after = html.escape(text[rel_end:])
    highlighted = f'{before}<span class="target">{target}</span>{after}'
    cloze = f'{before}<span class="cloze">·····</span>{after}'
    return highlighted, cloze


# --- Note construction -------------------------------------------------------


def _note_data(
    entry: VocabEntry,
    gloss_text: str,
    occurrence: tuple[Sentence, Token] | None,
    config: DeckConfig,
) -> NoteData:
    """Compute the backend-agnostic fields, tags and GUID for one vocab entry."""
    if occurrence is not None:
        sentence, token = occurrence
        word = token.text
        morph = _format_morph(token.upos, token.feats)
        example, cloze = _example_html(sentence, token)
    else:
        # No sentence occurrence (rare): use the lemma as the surface form and
        # leave the example blank — the produce card's guard drops it cleanly.
        word = entry.lemma
        morph = _format_morph(entry.upos, {})
        example = cloze = ""

    fields = [
        word,
        entry.lemma,
        _POS_LABELS.get(entry.upos or "", ""),
        morph,
        html.escape(gloss_text),
        example,
        cloze,
        entry.band or "",
        html.escape(config.title),
    ]
    return NoteData(
        lemma=entry.lemma,
        fields=fields,
        tags=_tags_for(entry, config),
        guid=_note_guid(entry.lemma, config.title),
    )


def _note_guid(lemma: str, source: str) -> str:
    """Deterministic note id from ``lemma`` and ``source`` — the update anchor."""
    return genanki.guid_for(source, lemma)


def _format_morph(upos: str | None, feats: dict[str, str]) -> str:
    """Compact, readable morphology, e.g. 'imperfective · present · 1 · singular'."""
    if not feats:
        return ""
    parts: list[str] = []
    for key in _FEATURE_ORDER:
        value = feats.get(key)
        if value is None:
            continue
        if key == "Mood" and value == "Imp":
            parts.append("imperative")
        elif key == "Person":
            parts.append(f"{value}.")  # e.g. "1." for first person
        else:
            parts.append(_FEATURE_VALUES.get(value, value.lower()))
    return " · ".join(parts)


def _tags_for(entry: VocabEntry, config: DeckConfig) -> list[str]:
    """Auto tags (source, band, POS) plus any configured extras."""
    prefix = config.tag_prefix
    tags = [f"{prefix}::{_slug(config.title)}"]
    if entry.band:
        tags.append(f"{prefix}::{entry.band}")
    if entry.upos:
        tags.append(f"{prefix}::pos::{entry.upos.lower()}")
    tags.extend(config.tags)
    return tags


def _slug(text: str) -> str:
    """Anki tags can't contain spaces; make a safe, readable slug."""
    return "_".join(text.split())
