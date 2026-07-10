"""Push a deck straight into a running Anki via the AnkiConnect add-on.

This is the *no-import* path, built for students and schools: instead of writing
a ``.apkg`` the learner then has to import, the cards appear in their open Anki
immediately, ready to study. Re-syncing the same text **updates** the existing
cards (matched on lemma + source) instead of duplicating them — the same promise
as the file path in :mod:`.builder`, but live.

It talks to AnkiConnect over plain HTTP (stdlib only, no extra dependency). If
Anki isn't running or the add-on is missing, :class:`AnkiConnectError` carries a
plain-language message telling the user exactly how to fix it.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from .builder import NoteData, iter_note_data
from .models import DeckConfig, EnrichedDocument
from .templates import CARD_CSS, FIELDS, card_templates, model_name

# The AnkiConnect add-on code, shown in the setup hint so a non-technical user
# can copy it straight into Anki's "Install Add-on" dialog.
ADDON_CODE = "2055492159"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765

_SOURCE_INDEX = FIELDS.index("Source")


class AnkiConnectError(RuntimeError):
    """Anki is unreachable, or an AnkiConnect action returned an error."""


@dataclass(frozen=True)
class SyncResult:
    """What :func:`sync_deck` changed in Anki, for the CLI summary and tests."""

    deck_name: str
    added: int
    updated: int
    skipped_no_gloss: int

    @property
    def note_count(self) -> int:
        return self.added + self.updated


class AnkiConnectClient:
    """A minimal AnkiConnect JSON client — one method, ``invoke``."""

    def __init__(
        self, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, timeout: float = 15.0
    ) -> None:
        self.url = f"http://{host}:{port}"
        self.timeout = timeout

    def invoke(self, action: str, **params: object) -> object:
        """Call one AnkiConnect action and return its ``result`` (or raise)."""
        payload = json.dumps({"action": action, "version": 6, "params": params}).encode("utf-8")
        request = urllib.request.Request(
            self.url, data=payload, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            raise AnkiConnectError(_not_reachable_message(self.url)) from exc

        if not isinstance(data, dict) or "error" not in data or "result" not in data:
            raise AnkiConnectError("Unerwartete Antwort von AnkiConnect.")
        if data["error"] is not None:
            raise AnkiConnectError(f"AnkiConnect: {data['error']}")
        return data["result"]


def sync_deck(
    doc: EnrichedDocument,
    config: DeckConfig,
    *,
    client: AnkiConnectClient | None = None,
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
) -> SyncResult:
    """Sync ``doc`` into the running Anki: create the deck and note type if
    needed, then add or update one note per selected word.

    ``client`` is injectable for tests; normally it's built from ``host``/``port``.
    """
    client = client or AnkiConnectClient(host, port)
    client.invoke("version")  # fail fast with a friendly message if Anki is down

    deck_name = config.resolved_deck_name()
    client.invoke("createDeck", deck=deck_name)  # idempotent
    model = _ensure_model(client, produce=config.produce_cards)

    notes, skipped = iter_note_data(doc, config)
    added = updated = 0
    for note in notes:
        note_id = _find_existing(client, model, deck_name, note)
        if note_id is None:
            _add_note(client, model, deck_name, note)
            added += 1
        else:
            _update_note(client, note_id, note)
            updated += 1

    return SyncResult(
        deck_name=deck_name, added=added, updated=updated, skipped_no_gloss=skipped
    )


# --- helpers -----------------------------------------------------------------


def _ensure_model(client: AnkiConnectClient, *, produce: bool) -> str:
    """Create the note type if it's new, else refresh its look, and return its name."""
    name = model_name(produce=produce)
    templates = card_templates(produce=produce)
    existing = client.invoke("modelNames")
    if not isinstance(existing, list) or name not in existing:
        client.invoke(
            "createModel",
            modelName=name,
            inOrderFields=list(FIELDS),
            css=CARD_CSS,
            cardTemplates=templates,
        )
    else:
        # Model already exists: push the current styling and templates so design
        # updates reach learners who synced an earlier version.
        client.invoke("updateModelStyling", model={"name": name, "css": CARD_CSS})
        client.invoke(
            "updateModelTemplates",
            model={
                "name": name,
                "templates": {
                    t["Name"]: {"Front": t["Front"], "Back": t["Back"]} for t in templates
                },
            },
        )
    return name


def _find_existing(
    client: AnkiConnectClient, model: str, deck_name: str, note: NoteData
) -> int | None:
    """The id of a matching note (same lemma + source in this deck), or None.

    This is the live equivalent of the deterministic GUID: it's what makes a
    re-sync update the card in place instead of adding a duplicate.
    """
    query = (
        f'"note:{model}" "deck:{deck_name}" '
        f'"Lemma:{_escape(note.lemma)}" "Source:{_escape(note.fields[_SOURCE_INDEX])}"'
    )
    found = client.invoke("findNotes", query=query)
    if isinstance(found, list) and found:
        return int(found[0])
    return None


def _field_map(note: NoteData) -> dict[str, str]:
    """Map field names to values in the order Anki expects."""
    return dict(zip(FIELDS, note.fields, strict=True))


def _add_note(client: AnkiConnectClient, model: str, deck_name: str, note: NoteData) -> None:
    client.invoke(
        "addNote",
        note={
            "deckName": deck_name,
            "modelName": model,
            "fields": _field_map(note),
            "tags": note.tags,
            "options": {"allowDuplicate": True},  # our own query handles dedupe
        },
    )


def _update_note(client: AnkiConnectClient, note_id: int, note: NoteData) -> None:
    client.invoke("updateNoteFields", note={"id": note_id, "fields": _field_map(note)})
    if note.tags:
        client.invoke("addTags", notes=[note_id], tags=" ".join(note.tags))


def _escape(value: str) -> str:
    """Neutralise quotes and backslashes for an Anki search term."""
    return value.replace("\\", "").replace('"', "")


def _not_reachable_message(url: str) -> str:
    return (
        f"Anki ist nicht erreichbar ({url}). So richtest du den Live-Sync ein:\n"
        "  1. Anki öffnen und geöffnet lassen.\n"
        "  2. Add-on „AnkiConnect“ installieren: Extras → Add-ons → "
        f"Add-ons herunterladen → Code {ADDON_CODE}.\n"
        "  3. Anki neu starten und den Befehl erneut ausführen.\n"
        "Alternativ ohne Anki: 'razbiram-anki build …' erzeugt eine .apkg zum Importieren."
    )
