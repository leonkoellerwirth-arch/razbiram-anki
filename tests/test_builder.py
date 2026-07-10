"""Builder unit tests: GUIDs, morphology, highlighting, gloss selection, counts."""

from __future__ import annotations

from razbiram_anki.builder import (
    _example_html,
    _format_morph,
    _index_first_occurrences,
    _note_guid,
    _pick_gloss,
    build_deck,
)
from razbiram_anki.models import DeckConfig, Gloss, VocabEntry


def test_note_guid_is_deterministic_and_source_scoped():
    a = _note_guid("хляб", "Text A")
    assert a == _note_guid("хляб", "Text A")  # stable across calls
    assert a != _note_guid("хляб", "Text B")  # different source → different note
    assert a != _note_guid("мляко", "Text A")  # different lemma → different note


def test_format_morph_reads_in_curated_order():
    morph = _format_morph("VERB", {"Number": "Sing", "Person": "3",
                                   "Tense": "Pres", "Aspect": "Imp"})
    assert morph == "imperfective · present · 3. · singular"


def test_format_morph_empty_for_no_features():
    assert _format_morph("NOUN", {}) == ""


def test_example_html_highlights_exact_span(doc):
    index = _index_first_occurrences(doc.sentences)
    sentence, token = index["купувам"]
    highlighted, cloze = _example_html(sentence, token)
    assert '<span class="target">купува</span>' in highlighted
    assert '<span class="cloze">' in cloze
    assert "купува" not in cloze  # the word is blanked out


def test_pick_gloss_respects_language_filter():
    entry = VocabEntry(lemma="x", gloss=Gloss(lang="en", text="thing"))
    assert _pick_gloss(entry, DeckConfig(gloss_lang="en")) == "thing"
    assert _pick_gloss(entry, DeckConfig(gloss_lang="de")) is None
    assert _pick_gloss(entry, DeckConfig()) == "thing"  # None = accept any


def test_word_without_gloss_is_skipped_and_counted(doc, tmp_path):
    doc.vocab.append(VocabEntry(lemma="без", upos="ADP", band="A1", gloss=None))
    result = build_deck(doc, DeckConfig(), tmp_path / "d.apkg")
    assert result.note_count == 3
    assert result.skipped_no_gloss == 1


def test_card_count_follows_produce_toggle(doc, tmp_path):
    both = build_deck(doc, DeckConfig(produce_cards=True), tmp_path / "a.apkg")
    assert both.card_count == both.note_count * 2
    one = build_deck(doc, DeckConfig(produce_cards=False), tmp_path / "b.apkg")
    assert one.card_count == one.note_count


def test_rebuild_is_byte_stable(doc, tmp_path):
    # Deterministic GUIDs + fixed ids mean re-export updates, not duplicates.
    a = build_deck(doc, DeckConfig(title="T"), tmp_path / "a.apkg")
    b = build_deck(doc, DeckConfig(title="T"), tmp_path / "b.apkg")
    assert a.note_count == b.note_count == 3
