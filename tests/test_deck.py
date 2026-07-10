"""End-to-end: the written .apkg is a valid Anki package with the right rows."""

from __future__ import annotations

import sqlite3
import zipfile
from pathlib import Path

from razbiram_anki import build_deck
from razbiram_anki.models import DeckConfig, EnrichedDocument

EXAMPLE = Path(__file__).resolve().parent.parent / "examples" / "sample-enriched.json"


def _open_collection(apkg: Path, workdir: Path) -> sqlite3.Connection:
    with zipfile.ZipFile(apkg) as z:
        assert "collection.anki2" in z.namelist()
        z.extract("collection.anki2", workdir)
    return sqlite3.connect(workdir / "collection.anki2")


def test_apkg_parses_as_sqlite_with_expected_counts(doc, tmp_path):
    result = build_deck(doc, DeckConfig(produce_cards=True), tmp_path / "d.apkg")
    con = _open_collection(tmp_path / "d.apkg", tmp_path)
    notes = con.execute("select count(*) from notes").fetchone()[0]
    cards = con.execute("select count(*) from cards").fetchone()[0]
    con.close()
    assert notes == result.note_count == 3
    assert cards == result.card_count == 6


def test_note_fields_carry_word_and_gloss(doc, tmp_path):
    build_deck(doc, DeckConfig(), tmp_path / "d.apkg")
    con = _open_collection(tmp_path / "d.apkg", tmp_path)
    flds = [row[0] for row in con.execute("select flds from notes")]
    con.close()
    joined = "\n".join(flds)
    assert "купува" in joined  # surface word
    assert "kaufen" in joined  # german gloss
    assert "A2" in joined  # cefr band


def test_example_file_builds(tmp_path):
    doc = EnrichedDocument.from_json_file(str(EXAMPLE))
    result = build_deck(doc, DeckConfig(title="Meine Familie", gloss_lang="de"),
                        tmp_path / "sample.apkg")
    assert result.note_count == 11
    assert result.skipped_no_gloss == 0
    assert (tmp_path / "sample.apkg").exists()
