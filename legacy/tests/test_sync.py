"""Live-sync logic against a fake AnkiConnect — no network, no running Anki."""

from __future__ import annotations

import urllib.error

import pytest

import razbiram_anki.anki_connect as ac
from razbiram_anki import AnkiConnectError, sync_deck
from razbiram_anki.models import DeckConfig, VocabEntry
from razbiram_anki.templates import FIELDS, model_name


class FakeClient:
    """Records every AnkiConnect call and answers from canned state."""

    def __init__(self, model_names=None, existing=None):
        self.calls: list[tuple[str, dict]] = []
        self._model_names = model_names or []
        # lemma -> note id, for findNotes to report as already present
        self._existing = existing or {}

    def actions(self) -> list[str]:
        return [action for action, _ in self.calls]

    def invoke(self, action: str, **params: object):
        self.calls.append((action, params))
        if action == "modelNames":
            return self._model_names
        if action == "findNotes":
            query = params["query"]
            for lemma, note_id in self._existing.items():
                if f'"Lemma:{lemma}"' in query:
                    return [note_id]
            return []
        if action == "addNote":
            return 999
        return None  # version, createDeck, create/update*, addTags


def test_sync_adds_all_when_anki_is_empty(doc):
    fake = FakeClient(model_names=[], existing={})
    result = sync_deck(doc, DeckConfig(title="T"), client=fake)

    assert result.added == 3
    assert result.updated == 0
    assert result.note_count == 3
    actions = fake.actions()
    assert "createDeck" in actions
    assert "createModel" in actions  # model did not exist yet
    assert actions.count("addNote") == 3


def test_resync_updates_instead_of_duplicating(doc):
    model = model_name(produce=True)
    fake = FakeClient(model_names=[model], existing={"майка": 1, "купувам": 2, "хляб": 3})
    result = sync_deck(doc, DeckConfig(title="T"), client=fake)

    assert result.updated == 3
    assert result.added == 0
    actions = fake.actions()
    assert "createModel" not in actions  # model already there → refreshed, not recreated
    assert "updateModelStyling" in actions
    assert actions.count("updateNoteFields") == 3
    assert actions.count("addNote") == 0


def test_sync_mixes_add_and_update(doc):
    fake = FakeClient(model_names=[model_name(produce=True)], existing={"майка": 42})
    result = sync_deck(doc, DeckConfig(title="T"), client=fake)

    assert result.updated == 1
    assert result.added == 2


def test_sync_skips_words_without_gloss(doc):
    doc.vocab.append(VocabEntry(lemma="без", upos="ADP", band="A1", gloss=None))
    fake = FakeClient()
    result = sync_deck(doc, DeckConfig(), client=fake)

    assert result.skipped_no_gloss == 1
    assert result.added == 3


def test_add_note_sends_all_fields_and_deck(doc):
    fake = FakeClient()
    sync_deck(doc, DeckConfig(title="Meine Familie"), client=fake)

    add_calls = [params for action, params in fake.calls if action == "addNote"]
    first = add_calls[0]["note"]
    assert set(first["fields"]) == set(FIELDS)
    assert first["deckName"] == "razbiram::Texte::Meine Familie"
    assert any(tag.startswith("razbiram::") for tag in first["tags"])


def test_unreachable_anki_raises_with_setup_hint(monkeypatch):
    def boom(*args, **kwargs):
        raise urllib.error.URLError("connection refused")

    monkeypatch.setattr(ac.urllib.request, "urlopen", boom)
    with pytest.raises(AnkiConnectError) as excinfo:
        ac.AnkiConnectClient().invoke("version")

    message = str(excinfo.value)
    assert "AnkiConnect" in message
    assert ac.ADDON_CODE in message  # tells the user exactly which add-on to install


def test_anki_connect_error_surfaces_action_failure(monkeypatch):
    class Resp:
        def read(self):
            return b'{"result": null, "error": "deck not found"}'

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(ac.urllib.request, "urlopen", lambda *a, **k: Resp())
    with pytest.raises(AnkiConnectError, match="deck not found"):
        ac.AnkiConnectClient().invoke("createDeck", deck="x")
