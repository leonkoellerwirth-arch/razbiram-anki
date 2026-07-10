"""Shared fixtures: small hand-built documents with correct offsets."""

from __future__ import annotations

import pytest

from razbiram_anki.models import (
    EnrichedDocument,
    Gloss,
    Sentence,
    Token,
    VocabEntry,
)


def _token(text: str, start: int, **kw: object) -> Token:
    return Token(text=text, kind="word", start=start, end=start + len(text), **kw)


@pytest.fixture
def doc() -> EnrichedDocument:
    """A two-word Bulgarian sentence with offsets sliced from the text."""
    text = "Майка купува хляб."
    tokens = [
        _token("Майка", text.index("Майка"), lemma="майка", upos="NOUN",
               feats={"Gender": "Fem", "Number": "Sing"}, band="A1"),
        _token("купува", text.index("купува"), lemma="купувам", upos="VERB",
               feats={"Aspect": "Imp", "Tense": "Pres", "Person": "3", "Number": "Sing"},
               band="A2"),
        _token("хляб", text.index("хляб"), lemma="хляб", upos="NOUN",
               feats={"Gender": "Masc", "Number": "Sing"}, band="A1"),
    ]
    sentence = Sentence(text=text, start=0, end=len(text), tokens=tokens,
                        gloss=Gloss(lang="de", text="Mutter kauft Brot."))
    vocab = [
        VocabEntry(lemma="майка", upos="NOUN", band="A1", freq_rank=180,
                   gloss=Gloss(lang="de", text="Mutter")),
        VocabEntry(lemma="купувам", upos="VERB", band="A2", freq_rank=640,
                   gloss=Gloss(lang="de", text="kaufen")),
        VocabEntry(lemma="хляб", upos="NOUN", band="A1", freq_rank=720,
                   gloss=Gloss(lang="de", text="Brot")),
    ]
    return EnrichedDocument(text=text, sentences=[sentence], vocab=vocab)
