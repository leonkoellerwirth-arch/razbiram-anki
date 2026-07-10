import JSZip from "jszip";
import type { ConvertResult } from "./convert";

/** Package the result the way razbiram.com stores a deck: a `deck.json` plus a
 *  sibling `media/` folder. With media we hand back a `.zip` (drop-in for
 *  `anki/<Deck>/`); without, a bare `deck.json` is friendlier. */
export async function downloadDeck(result: ConvertResult): Promise<void> {
  const json = JSON.stringify(result.deck, null, 1);
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
