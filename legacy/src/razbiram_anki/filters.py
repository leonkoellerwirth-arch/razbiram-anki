"""Which vocabulary items become cards.

The builder hands every :class:`VocabEntry` in a document to :func:`select_vocab`,
which applies the :class:`DeckConfig` selection knobs in a fixed, documented
order: CEFR band → frequency floor → unbanded policy → hardest-first cap. Kept
separate from ``builder.py`` so the selection rules are easy to read and test
without touching genanki.
"""

from __future__ import annotations

from .models import CEFR_ORDER, DeckConfig, VocabEntry

# Rank a band by its position on the scale so we can sort "hardest first".
# Unbanded words sort as easiest (-1) — they lose the tie-break for --max-cards.
_BAND_RANK: dict[str, int] = {band: i for i, band in enumerate(CEFR_ORDER)}


def _band_rank(band: str | None) -> int:
    return _BAND_RANK.get(band, -1) if band else -1


def select_vocab(vocab: list[VocabEntry], config: DeckConfig) -> list[VocabEntry]:
    """Return the vocab entries that should become notes, in deck order.

    Order of operations:

    1. **CEFR filter** — keep only ``config.levels`` (all bands if ``None``).
    2. **Unbanded policy** — drop band-less entries unless ``include_unbanded``.
    3. **Frequency floor** — drop entries rarer than ``min_freq_rank`` (entries
       with no rank are treated as rarer than any floor and dropped when a floor
       is set).
    4. **Cap** — if ``max_cards`` is set, keep the hardest N (band desc, then
       rarer first), so a truncated deck still teaches the demanding words.

    The returned list is ordered hardest-band-first for a stable, useful deck
    browser ordering; ties fall back to rarer-word-first then lemma.
    """
    levels = set(config.levels) if config.levels else None
    kept: list[VocabEntry] = []
    for entry in vocab:
        if levels is not None:
            if entry.band is None:
                if not config.include_unbanded:
                    continue
                # An unbanded entry can't match a specific level filter.
                continue
            if entry.band not in levels:
                continue
        elif entry.band is None and not config.include_unbanded:
            continue

        if config.min_freq_rank is not None and (
            entry.freq_rank is None or entry.freq_rank > config.min_freq_rank
        ):
            continue

        kept.append(entry)

    kept.sort(key=_sort_key)

    if config.max_cards is not None and len(kept) > config.max_cards:
        kept = kept[: config.max_cards]
    return kept


def _sort_key(entry: VocabEntry) -> tuple[int, int, str]:
    """Hardest band first, then rarer word first, then lemma for determinism."""
    # freq_rank ascending = commonest first, so negate to put rarer earlier only
    # after band; use a large sentinel so ranked words sort before unranked ones.
    rank = entry.freq_rank if entry.freq_rank is not None else 10**9
    return (-_band_rank(entry.band), -rank, entry.lemma)
