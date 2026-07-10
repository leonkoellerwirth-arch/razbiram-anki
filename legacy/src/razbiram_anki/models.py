"""The data contract on both ends of the bridge.

Two kinds of model live here:

**Input** — a deliberately small, *tolerant* subset of razbiram-nlp's
``EnrichedDocument``. razbiram-anki only reads the JSON; it never produces it.
So unlike the upstream models (which ``forbid`` unknown fields to make contract
drift loud), these set ``extra="ignore"``: a newer razbiram-nlp that adds a
field must not break deck generation. We keep only what a flashcard needs —
surface form, lemma, POS, features, gloss, CEFR band, and the character offsets
that let us slice the example sentence out of the original text.

**Config** — :class:`DeckConfig`, the knobs that decide *which* words become
cards and *how* the deck is named and tagged. Every field has a sensible
default; see ``docs/card-design.md`` and the README config table.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# The CEFR bands razbiram-nlp emits, easiest → hardest. Mirrors the upstream
# ``CEFR_ORDER`` so the two projects agree on the scale; kept here so filtering
# and badge colouring have a single source of truth.
CEFR_ORDER: tuple[str, ...] = ("A1", "A2", "B1", "B2", "C1", "C2")
CEFRBand = Literal["A1", "A2", "B1", "B2", "C1", "C2"]


class _Lenient(BaseModel):
    """Base for input models: ignore unknown fields so upstream can grow."""

    model_config = ConfigDict(extra="ignore")


class Gloss(_Lenient):
    """A short, context-sensitive translation of a token or sentence."""

    lang: str = Field(description="Target language code, e.g. 'de' or 'en'.")
    text: str = Field(description="The gloss itself.")


class Token(_Lenient):
    """One token from a sentence — only the fields a card needs."""

    text: str = Field(description="Surface form exactly as it appears in the source.")
    kind: str = Field(description="Coarse class from segmentation ('word', 'punct', ...).")
    start: int = Field(ge=0, description="Character offset of the token start in the source text.")
    end: int = Field(ge=0, description="Character offset one past the token end.")
    lemma: str | None = Field(default=None, description="Dictionary form of the word.")
    upos: str | None = Field(default=None, description="Universal POS tag, e.g. 'NOUN'.")
    feats: dict[str, str] = Field(
        default_factory=dict, description="Universal morphological features."
    )
    band: str | None = Field(default=None, description="Heuristic CEFR band for this word.")


class Sentence(_Lenient):
    """One sentence: its text, its tokens, and an optional sentence gloss."""

    text: str
    start: int = Field(ge=0)
    end: int = Field(ge=0)
    tokens: list[Token] = Field(default_factory=list)
    gloss: Gloss | None = Field(default=None)


class VocabEntry(_Lenient):
    """One deduplicated vocabulary item — the primary source of cards."""

    lemma: str
    upos: str | None = Field(default=None)
    count: int = Field(default=1, ge=1, description="Occurrences of this lemma in the document.")
    freq_rank: int | None = Field(
        default=None, ge=1, description="Global frequency rank (1 = most common)."
    )
    band: str | None = Field(default=None, description="Heuristic CEFR band for this lemma.")
    gloss: Gloss | None = Field(default=None)


class EnrichedDocument(_Lenient):
    """The subset of razbiram-nlp's output that razbiram-anki consumes."""

    text: str = Field(description="The original input text, verbatim.")
    lang: str = Field(default="bg", description="Source language (Bulgarian).")
    sentences: list[Sentence] = Field(default_factory=list)
    vocab: list[VocabEntry] = Field(default_factory=list)

    @classmethod
    def from_json_file(cls, path: str) -> EnrichedDocument:
        """Load and validate an enriched ``.json`` file produced by razbiram-nlp."""
        from pathlib import Path

        return cls.model_validate_json(Path(path).read_text(encoding="utf-8"))


class DeckConfig(BaseModel):
    """How a document turns into a deck: selection, naming, and card options.

    Defaults are tuned for a self-study learner importing a single text: both
    card directions on, the whole CEFR range, deck nested under ``razbiram`` so
    imports stay tidy. Every value can be overridden in YAML or on the CLI.
    """

    model_config = ConfigDict(extra="forbid")

    # --- Deck identity ---
    deck_name: str = Field(
        default="razbiram::Texte::{title}",
        description="Anki deck name. '{title}' is replaced with --title (or the input file stem).",
    )
    title: str = Field(
        default="Text",
        description="Human title of this text; fills '{title}' and tags every note.",
    )

    # --- Selection ---
    levels: list[str] | None = Field(
        default=None,
        description="CEFR bands to include, e.g. ['A2', 'B1']. None = all bands.",
    )
    min_freq_rank: int | None = Field(
        default=None,
        ge=1,
        description="Skip words rarer than this global frequency rank. None = no floor.",
    )
    max_cards: int | None = Field(
        default=None, ge=1, description="Cap on notes per deck (hardest kept). None = unlimited."
    )
    include_unbanded: bool = Field(
        default=True,
        description="Keep vocab whose CEFR band is unknown (None). Off = drop them.",
    )

    # --- Cards ---
    gloss_lang: str | None = Field(
        default=None,
        description="Only use glosses in this language, e.g. 'de'. None = accept any.",
    )
    produce_cards: bool = Field(
        default=True,
        description="Also generate 'produce' cards (gloss + cloze → word). Off for beginners.",
    )

    # --- Tagging ---
    tags: list[str] = Field(
        default_factory=list, description="Extra tags added to every note, alongside auto tags."
    )
    tag_prefix: str = Field(
        default="razbiram", description="Namespace for auto tags, e.g. 'razbiram::A2'."
    )

    def resolved_deck_name(self) -> str:
        """The deck name with ``{title}`` substituted."""
        return self.deck_name.replace("{title}", self.title)
