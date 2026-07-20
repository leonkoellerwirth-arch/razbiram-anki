import JSZip from "jszip";
import type { ConvertResult } from "./convert";
import type { CrowdAnkiDeck } from "./types";
import type { ApkgMedia } from "../apkg/types";
import { loadSqlJs } from "../apkg/sqlite";
import { writeApkg } from "../apkg/write";

/** Package the result the way razbiram.com stores a deck: a `deck.json` plus a
 *  sibling `media/` folder. With media we hand back a `.zip` (drop-in for
 *  `anki/<Deck>/`); without, a bare `deck.json` is friendlier.
 *
 *  `jsonOverride` lets the student download their edited deck.json verbatim
 *  (the in-app editor); when omitted we serialise the generated deck. */
export async function downloadDeck(result: ConvertResult, jsonOverride?: string): Promise<void> {
  const json = jsonOverride ?? JSON.stringify(result.deck, null, 1);
  const folder = safeFolder(result.baseName);

  if (result.media.length === 0) {
    triggerDownload(new Blob([json], { type: "application/json" }), "deck.json");
    return;
  }

  const zip = new JSZip();
  zip.file("deck.json", json);
  for (const m of result.media) zip.file(`media/${m.name}`, m.bytes);
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, `${folder}.zip`);
}

/** The other way out: a real `.apkg`. razbiram.com reads `deck.json`, but Anki
 *  itself reads `.apkg` — this is the file a student imports by double-clicking,
 *  with no CrowdAnki add-on involved. */
export async function downloadApkg(
  deck: CrowdAnkiDeck,
  media: ApkgMedia[],
  baseName: string,
): Promise<void> {
  const SQL = await loadSqlJs();
  const blob = await writeApkg(deck, media, SQL);
  triggerDownload(blob, `${safeFolder(baseName)}.apkg`);
}

function safeFolder(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "deck";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
