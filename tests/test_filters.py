"""Selection rules: CEFR bands, frequency floor, cap ordering, unbanded policy."""

from __future__ import annotations

from razbiram_anki.filters import select_vocab
from razbiram_anki.models import DeckConfig, Gloss, VocabEntry


def _entry(lemma: str, band: str | None, freq: int | None) -> VocabEntry:
    return VocabEntry(lemma=lemma, upos="NOUN", band=band, freq_rank=freq,
                      gloss=Gloss(lang="de", text=lemma))


def test_level_filter_keeps_only_requested_bands():
    vocab = [_entry("a", "A1", 10), _entry("b", "B1", 20), _entry("c", "C1", 30)]
    kept = select_vocab(vocab, DeckConfig(levels=["A1", "B1"]))
    assert {e.lemma for e in kept} == {"a", "b"}


def test_min_freq_rank_drops_rarer_and_unranked_words():
    vocab = [_entry("common", None, 100), _entry("rare", None, 5000),
             _entry("unranked", None, None)]
    kept = select_vocab(vocab, DeckConfig(min_freq_rank=1000))
    assert {e.lemma for e in kept} == {"common"}


def test_include_unbanded_false_drops_bandless_words():
    vocab = [_entry("banded", "A2", 10), _entry("bandless", None, 20)]
    assert {e.lemma for e in select_vocab(vocab, DeckConfig(include_unbanded=True))} == {
        "banded", "bandless"}
    assert {e.lemma for e in select_vocab(vocab, DeckConfig(include_unbanded=False))} == {
        "banded"}


def test_max_cards_keeps_hardest_by_band_then_rarity():
    # C1 is hardest, then two A1s ordered by rarity (higher freq_rank = rarer).
    vocab = [_entry("easy_common", "A1", 10), _entry("easy_rare", "A1", 900),
             _entry("hard", "C1", 50)]
    kept = select_vocab(vocab, DeckConfig(max_cards=2))
    assert [e.lemma for e in kept] == ["hard", "easy_rare"]


def test_no_filters_keeps_everything_sorted_hardest_first():
    vocab = [_entry("a", "A1", 10), _entry("c", "C1", 10), _entry("b", "B1", 10)]
    kept = select_vocab(vocab, DeckConfig())
    assert [e.lemma for e in kept] == ["c", "b", "a"]
