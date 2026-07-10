"""razbiram-anki — enriched Bulgarian documents → beautiful Anki decks.

A small bridge between `razbiram-nlp <https://github.com/leonkoellerwirth-arch/razbiram-nlp>`_
and Anki. It reads the ``EnrichedDocument`` JSON razbiram-nlp produces and builds
a standard ``.apkg`` deck: one note per vocabulary word, with lemma, morphology,
a contextual gloss, a highlighted example sentence, and a CEFR badge.

Two things make the output feel finished rather than generated: card templates
with real CSS and dark-mode support, and *deterministic* note ids so re-exporting
a text updates your cards in Anki instead of duplicating them.

There are two ways out: :func:`build_deck` writes a portable ``.apkg`` file, and
:func:`sync_deck` pushes the same cards straight into a running Anki via the
AnkiConnect add-on — no manual import, built for students and schools.

Public API
----------
    from razbiram_anki import build_deck, DeckConfig, EnrichedDocument

    doc = EnrichedDocument.from_json_file("enriched.json")
    result = build_deck(doc, DeckConfig(title="Meine Lektion"), "deck.apkg")
    print(result.path, result.note_count)

    # or, straight into an open Anki (needs the AnkiConnect add-on):
    from razbiram_anki import sync_deck
    sync_deck(doc, DeckConfig(title="Meine Lektion"))
"""

from __future__ import annotations

from .anki_connect import AnkiConnectError, SyncResult, sync_deck
from .builder import BuildResult, build_deck
from .models import (
    CEFR_ORDER,
    DeckConfig,
    EnrichedDocument,
    Gloss,
    Sentence,
    Token,
    VocabEntry,
)

__version__ = "0.1.0"

__all__ = [
    "CEFR_ORDER",
    "AnkiConnectError",
    "BuildResult",
    "DeckConfig",
    "EnrichedDocument",
    "Gloss",
    "Sentence",
    "SyncResult",
    "Token",
    "VocabEntry",
    "__version__",
    "build_deck",
    "sync_deck",
]
