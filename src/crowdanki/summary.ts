import { detectCardType, type CardType } from "./cardType";
import type { CrowdAnkiDeckLike } from "./types";

export interface SampleCard {
  front: string;
  back: string;
  deck: string;
}

/** A preview of a CrowdAnki deck — enough to show the student what they dropped
 *  in and what razbiram.com will make of it. Works on a built *or* loaded deck. */
export interface DeckSummary {
  rootName: string;
  totalNotes: number;
  modelCount: number;
  /** Leaf names of the sub-decks that actually carry notes. */
  deckNames: string[];
  /** Detected card types, most frequent first. */
  cardTypes: CardType[];
  hasMedia: boolean;
  sampleCards: SampleCard[];
}

const SAMPLE_LIMIT = 4;

export function summarize(deck: CrowdAnkiDeckLike): DeckSummary {
  const models = new Map<string, { name: string; fields: string[] }>();
  collectModels(deck, models);

  const typeByModel = new Map<string, CardType>();
  for (const [uuid, m] of models) typeByModel.set(uuid, detectCardType(m.name, m.fields));

  let totalNotes = 0;
  const deckNames = new Set<string>();
  const typeCounts = new Map<CardType, number>();
  const samples: SampleCard[] = [];

  const visit = (node: CrowdAnkiDeckLike): void => {
    const leaf = leafName(node.name ?? "");
    for (const note of node.notes ?? []) {
      totalNotes++;
      if (leaf) deckNames.add(leaf);
      const type = typeByModel.get(note.note_model_uuid ?? "") ?? "flashcard";
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      if (samples.length < SAMPLE_LIMIT) {
        const fields = note.fields ?? [];
        samples.push({ front: text(fields[0]), back: text(fields[1]), deck: leaf });
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(deck);

  const cardTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  return {
    rootName: deck.name ?? "Deck",
    totalNotes,
    modelCount: models.size,
    deckNames: [...deckNames].sort(),
    cardTypes,
    hasMedia: (deck.media_files ?? []).length > 0,
    sampleCards: samples,
  };
}

function collectModels(
  node: CrowdAnkiDeckLike,
  out: Map<string, { name: string; fields: string[] }>,
): void {
  for (const m of node.note_models ?? []) {
    if (m.crowdanki_uuid) {
      out.set(m.crowdanki_uuid, {
        name: m.name ?? "",
        fields: (m.flds ?? []).map((f) => f.name ?? ""),
      });
    }
  }
  for (const child of node.children ?? []) collectModels(child, out);
}

function leafName(name: string): string {
  return name.split("::").pop()?.trim() ?? name;
}

/** Strip HTML to a short, readable one-liner for the card preview. */
function text(value: string | undefined): string {
  if (!value) return "";
  const stripped = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 140 ? `${stripped.slice(0, 139)}…` : stripped;
}
