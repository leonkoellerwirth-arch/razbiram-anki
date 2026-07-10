"""Command-line interface for building decks.

    razbiram-anki build --in enriched.json --out deck.apkg
    razbiram-anki build --in enriched.json --out deck.apkg --levels A2,B1 --gloss de
    razbiram-anki build --in enriched.json --out deck.apkg --config deck.yaml

Reads one ``EnrichedDocument`` JSON (from razbiram-nlp) and writes a single
``.apkg``. Selection and card options come from CLI flags, an optional YAML
config file, or their defaults — flags win over the file, the file wins over the
defaults. A short summary (deck name, notes, cards, skipped) is printed on exit.

Exit codes: ``0`` success, ``1`` a runtime failure (IO/build), ``2`` a usage
error (bad arguments / invalid input) — clean enough to drive from a Makefile.
"""

from __future__ import annotations

import sys
from pathlib import Path

import click
import yaml
from pydantic import ValidationError
from rich.console import Console
from rich.table import Table

from . import __version__
from .anki_connect import DEFAULT_HOST, DEFAULT_PORT, AnkiConnectError, sync_deck
from .builder import build_deck
from .models import DeckConfig, EnrichedDocument

EXIT_OK = 0
EXIT_RUNTIME = 1
EXIT_USAGE = 2


def _parse_levels(raw: str | None) -> list[str] | None:
    """Turn ``--levels A2,B1`` into ``['A2', 'B1']``; None/empty means all."""
    if not raw or raw.strip().lower() in {"all", ""}:
        return None
    return [level.strip().upper() for level in raw.split(",") if level.strip()]


def _load_config_file(path: Path) -> dict:
    """Read a YAML DeckConfig file into a plain dict (empty file → no overrides)."""
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise click.BadParameter(f"config {path} must be a YAML mapping, got {type(data).__name__}")
    return data


def _build_config(
    base: dict,
    *,
    title: str | None,
    deck_name: str | None,
    levels: str | None,
    gloss: str | None,
    no_produce: bool,
    max_cards: int | None,
    min_freq_rank: int | None,
) -> DeckConfig:
    """Merge YAML values (``base``) with CLI flags; flags take precedence."""
    # Only override keys the user actually set on the command line.
    overrides: dict = {}
    if title is not None:
        overrides["title"] = title
    if deck_name is not None:
        overrides["deck_name"] = deck_name
    if levels is not None:
        overrides["levels"] = _parse_levels(levels)
    if gloss is not None:
        overrides["gloss_lang"] = None if gloss.strip().lower() in {"any", ""} else gloss.strip()
    if no_produce:
        overrides["produce_cards"] = False
    if max_cards is not None:
        overrides["max_cards"] = max_cards
    if min_freq_rank is not None:
        overrides["min_freq_rank"] = min_freq_rank

    try:
        return DeckConfig(**{**base, **overrides})
    except ValidationError as exc:
        raise click.BadParameter(f"invalid deck config: {exc}") from exc


def _common_options(func):
    """Attach the shared ``--in`` + selection/config options to a command.

    ``build`` and ``sync`` take the same input and the same knobs; only the
    output differs (a file vs. a live Anki), so the options live in one place.
    """
    options = [
        click.option(
            "--in",
            "in_path",
            required=True,
            type=click.Path(exists=True, dir_okay=False, path_type=Path),
            help="An enriched .json file produced by razbiram-nlp.",
        ),
        click.option(
            "--config",
            "config_file",
            type=click.Path(exists=True, dir_okay=False, path_type=Path),
            default=None,
            help="Optional YAML DeckConfig; CLI flags override its values.",
        ),
        click.option(
            "--title", default=None, help="Text title (fills '{title}' and tags every note)."
        ),
        click.option(
            "--deck-name", default=None, help="Deck name template, e.g. 'razbiram::{title}'."
        ),
        click.option(
            "--levels", default=None, help="CEFR bands to include, e.g. 'A2,B1'. Omit=all."
        ),
        click.option(
            "--gloss", default=None, help="Restrict glosses to a language, e.g. 'de'. 'any'=all."
        ),
        click.option(
            "--no-produce", is_flag=True, default=False, help="Skip 'produce' cards (beginners)."
        ),
        click.option(
            "--max-cards", type=int, default=None, help="Cap notes per deck (hardest kept)."
        ),
        click.option(
            "--min-freq-rank",
            type=int,
            default=None,
            help="Drop words rarer than this global frequency rank.",
        ),
    ]
    for option in reversed(options):
        func = option(func)
    return func


def _resolve_config(
    in_path: Path,
    config_file: Path | None,
    *,
    title: str | None,
    deck_name: str | None,
    levels: str | None,
    gloss: str | None,
    no_produce: bool,
    max_cards: int | None,
    min_freq_rank: int | None,
) -> DeckConfig:
    """Build the effective :class:`DeckConfig` from YAML + CLI flags + defaults."""
    base = _load_config_file(config_file) if config_file else {}
    # A title defaulting to the input file stem is friendlier than "Text".
    if title is None and "title" not in base:
        title = in_path.stem
    return _build_config(
        base,
        title=title,
        deck_name=deck_name,
        levels=levels,
        gloss=gloss,
        no_produce=no_produce,
        max_cards=max_cards,
        min_freq_rank=min_freq_rank,
    )


def _load_doc(console: Console, in_path: Path) -> EnrichedDocument:
    """Load and validate the enriched JSON, or exit with a usage error."""
    try:
        return EnrichedDocument.from_json_file(str(in_path))
    except (ValidationError, ValueError) as exc:
        console.print(f"[red]Not a valid EnrichedDocument:[/red] {in_path.name} — {exc}")
        sys.exit(EXIT_USAGE)


@click.group()
@click.version_option(version=__version__, package_name="razbiram-anki")
def main() -> None:
    """razbiram-anki — turn enriched Bulgarian documents into Anki decks."""


@main.command()
@click.option(
    "--out",
    "out_path",
    required=True,
    type=click.Path(dir_okay=False, path_type=Path),
    help="Path to write the .apkg deck to.",
)
@_common_options
def build(
    in_path: Path,
    out_path: Path,
    config_file: Path | None,
    title: str | None,
    deck_name: str | None,
    levels: str | None,
    gloss: str | None,
    no_produce: bool,
    max_cards: int | None,
    min_freq_rank: int | None,
) -> None:
    """Build a .apkg deck from an enriched JSON document."""
    console = Console()
    config = _resolve_config(
        in_path,
        config_file,
        title=title,
        deck_name=deck_name,
        levels=levels,
        gloss=gloss,
        no_produce=no_produce,
        max_cards=max_cards,
        min_freq_rank=min_freq_rank,
    )
    doc = _load_doc(console, in_path)

    try:
        result = build_deck(doc, config, out_path)
    except OSError as exc:
        console.print(f"[red]Could not write deck:[/red] {exc}")
        sys.exit(EXIT_RUNTIME)

    _report(console, result, config)
    sys.exit(EXIT_OK)


@main.command()
@click.option("--host", default=DEFAULT_HOST, show_default=True, help="AnkiConnect host.")
@click.option(
    "--port", type=int, default=DEFAULT_PORT, show_default=True, help="AnkiConnect port."
)
@_common_options
def sync(
    in_path: Path,
    config_file: Path | None,
    title: str | None,
    deck_name: str | None,
    levels: str | None,
    gloss: str | None,
    no_produce: bool,
    max_cards: int | None,
    min_freq_rank: int | None,
    host: str,
    port: int,
) -> None:
    """Sync cards straight into a running Anki — no .apkg import needed.

    Needs Anki open with the AnkiConnect add-on. A re-sync of the same text
    updates the existing cards instead of duplicating them.
    """
    console = Console()
    config = _resolve_config(
        in_path,
        config_file,
        title=title,
        deck_name=deck_name,
        levels=levels,
        gloss=gloss,
        no_produce=no_produce,
        max_cards=max_cards,
        min_freq_rank=min_freq_rank,
    )
    doc = _load_doc(console, in_path)

    try:
        result = sync_deck(doc, config, host=host, port=port)
    except AnkiConnectError as exc:
        console.print(f"[yellow]{exc}[/yellow]")
        sys.exit(EXIT_RUNTIME)

    _report_sync(console, result, host, port)
    sys.exit(EXIT_OK)


def _report(console: Console, result, config: DeckConfig) -> None:
    """Print a compact summary of what was built."""
    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 1))
    table.add_column("Deck")
    table.add_column("Notes", justify="right")
    table.add_column("Cards", justify="right")
    table.add_column("Skipped (no gloss)", justify="right")
    table.add_column("Output", style="dim")
    table.add_row(
        result.deck_name,
        str(result.note_count),
        str(result.card_count),
        str(result.skipped_no_gloss),
        str(result.path),
    )
    console.print(table)
    kinds = "recognize + produce" if config.produce_cards else "recognize"
    console.print(f"[green]✓ Wrote {result.card_count} cards[/green] ({kinds}) to {result.path}")


def _report_sync(console: Console, result, host: str, port: int) -> None:
    """Plain-language summary of a live sync, for students and teachers."""
    console.print(f"[green]✓[/green] Verbunden mit Anki ({host}:{port})")
    table = Table(show_header=True, header_style="bold", box=None, padding=(0, 1))
    table.add_column("Deck")
    table.add_column("Neu", justify="right")
    table.add_column("Aktualisiert", justify="right")
    table.add_column("Übersprungen (keine Glosse)", justify="right")
    table.add_row(
        result.deck_name,
        str(result.added),
        str(result.updated),
        str(result.skipped_no_gloss),
    )
    console.print(table)
    console.print(
        f"[green]✓ {result.note_count} Vokabeln in Deck „{result.deck_name}“[/green] "
        f"({result.added} neu, {result.updated} aktualisiert)"
    )
    console.print("[green]→ Direkt lernbereit — kein Import nötig.[/green]")


if __name__ == "__main__":
    main()
