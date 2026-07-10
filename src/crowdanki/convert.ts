import { parseApkg } from "../apkg/parse";
import { loadSqlJs } from "../apkg/sqlite";
import type { ApkgMedia } from "../apkg/types";
import { buildDeckJson } from "./deckJson";
import { loadDeckJson } from "./loadDeckJson";
import { summarize, type DeckSummary } from "./summary";
import type { CrowdAnkiDeckLike } from "./types";

export type SourceKind = "apkg" | "json";

export interface ConvertResult {
  deck: CrowdAnkiDeckLike;
  media: ApkgMedia[];
  summary: DeckSummary;
  sourceKind: SourceKind;
  /** Base name for the download (deck folder), derived from the dropped file. */
  baseName: string;
}

/** The single entry point the UI calls. `.apkg` → parse → build `deck.json`;
 *  `.json` → validate an existing CrowdAnki `deck.json` and pass it through.
 *  Everything runs in the browser — nothing leaves the student's machine. */
export async function convertFile(file: File): Promise<ConvertResult> {
  const lower = file.name.toLowerCase();
  const baseName = stripExtension(file.name);

  if (lower.endsWith(".apkg")) {
    const SQL = await loadSqlJs();
    const parsed = await parseApkg(await file.arrayBuffer(), SQL);
    if (parsed.notes.length === 0) {
      throw new Error(emptyExportMessage(parsed.allDeckNames));
    }
    const deck = buildDeckJson(parsed, baseName);
    return { deck, media: parsed.media, summary: summarize(deck), sourceKind: "apkg", baseName };
  }

  if (lower.endsWith(".json")) {
    const deck = loadDeckJson(await file.text());
    return { deck, media: [], summary: summarize(deck), sourceKind: "json", baseName };
  }

  throw new Error("Bitte eine Anki-Datei (.apkg) oder eine CrowdAnki deck.json auswählen.");
}

function stripExtension(name: string): string {
  return name.replace(/\.(apkg|json)$/i, "");
}

/** Message for an .apkg that parsed cleanly but holds zero cards — the single
 *  most common support case (a deck exported without its cards or without its
 *  subdecks). When the empty file still *names* decks, we say so, so the student
 *  sees "the deck is there, it's just empty" rather than "the tool is broken". */
export function emptyExportMessage(deckNames: string[]): string {
  const found =
    deckNames.length > 0
      ? `Gefundene Decks in dieser Datei: ${deckNames.map((n) => `„${n}“`).join(", ")} — aber 0 Karten darin. `
      : "";
  return (
    `In dieser Datei wurden 0 Karten gefunden. ${found}` +
    "Das ist fast immer ein leerer Export: Exportiere in Anki das Deck, das die Karten " +
    "wirklich zeigt (die Zahl neben dem Deck-Namen > 0), und aktiviere „Include subdecks“, " +
    "falls die Karten in Unterdecks liegen. Exportiere dann erneut."
  );
}
