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
      throw new Error(
        "Dieser Anki-Export enthält keine Karten. Prüfe in Anki, ob das gewählte Deck wirklich Karten " +
          "zeigt (die Zahl neben dem Deck), und aktiviere beim Export „Include subdecks“, falls deine " +
          "Karten in Unterdecks liegen. Exportiere dann erneut.",
      );
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
