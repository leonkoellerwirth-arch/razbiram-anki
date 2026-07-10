import type { CrowdAnkiDeckLike } from "./types";

/** The reverse path's easy case: the student already has a CrowdAnki `deck.json`
 *  (that is exactly what razbiram.com stores per deck). We validate the shape and
 *  pass it through untouched — no `.apkg` parse, no rebuild. */
export function loadDeckJson(text: string): CrowdAnkiDeckLike {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DeckJsonError("Die Datei ist kein gültiges JSON.");
  }
  if (!isCrowdAnkiDeck(data)) {
    throw new DeckJsonError(
      "Das sieht nicht wie eine CrowdAnki deck.json aus — es fehlen notes / note_models.",
    );
  }
  return data;
}

function isCrowdAnkiDeck(data: unknown): data is CrowdAnkiDeckLike {
  if (data === null || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.__type__ === "Deck" ||
    Array.isArray(d.notes) ||
    Array.isArray(d.note_models) ||
    Array.isArray(d.children)
  );
}

export class DeckJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeckJsonError";
  }
}
