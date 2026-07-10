import type { ApkgNote, ApkgModel, ParsedApkg } from "../apkg/types";
import { deterministicUuid } from "./uuid";
import type { CrowdAnkiDeck, CrowdAnkiNote, CrowdAnkiNoteModel } from "./types";

const NS_DECK = "razbiram-anki/deck";
const NS_MODEL = "razbiram-anki/model";
const SEP = "::";

/** One node of the deck tree while we assemble it from flat, path-tagged notes. */
interface Node {
  /** Display name: full `::` path for the root, leaf segment for a child. */
  displayName: string;
  /** The note's real Anki deck path this node stands for ("" = synthetic root). */
  ankiPath: string;
  children: Map<string, Node>;
  notes: ApkgNote[];
}

/** Turn a parsed `.apkg` into a CrowdAnki `deck.json` — a single root `Deck`
 *  whose `::` hierarchy becomes nested `children`, all `note_models` on the root,
 *  every note under the deck it belongs to. UUIDs are deterministic, so a later
 *  re-export of the same deck updates in place instead of duplicating. */
export function buildDeckJson(parsed: ParsedApkg, fallbackTitle: string): CrowdAnkiDeck {
  const deckNames = parsed.notes.length > 0 ? [...new Set(parsed.notes.map((n) => n.deckName))] : [DEFAULT_ROOT];
  const prefix = commonPrefixSegments(deckNames);

  const root: Node =
    prefix.length > 0
      ? { displayName: prefix.join(SEP), ankiPath: prefix.join(SEP), children: new Map(), notes: [] }
      : { displayName: fallbackTitle || DEFAULT_ROOT, ankiPath: "", children: new Map(), notes: [] };

  const byPath = new Map<string, Node>([[root.ankiPath, root]]);
  for (const name of deckNames) ensureNode(root, byPath, name.split(SEP).slice(prefix.length));

  for (const note of parsed.notes) (byPath.get(note.deckName) ?? root).notes.push(note);

  const models = [...parsed.models.values()].map(toNoteModel);
  const mediaFiles = [...new Set(parsed.media.map((m) => m.name))].sort();
  return serialize(root, models, mediaFiles, true);
}

const DEFAULT_ROOT = "Deck";

/** Longest `::`-segment prefix shared by every deck name (whole segments only). */
function commonPrefixSegments(names: string[]): string[] {
  if (names.length === 0) return [];
  const split = names.map((n) => n.split(SEP));
  const first = split[0];
  const prefix: string[] = [];
  for (let i = 0; i < first.length; i++) {
    if (split.every((s) => s[i] === first[i])) prefix.push(first[i]);
    else break;
  }
  return prefix;
}

/** Walk/create the child chain for the segments below the root, registering each
 *  node under its full Anki path so notes can be dropped in by exact match. */
function ensureNode(root: Node, byPath: Map<string, Node>, segsBelow: string[]): void {
  let node = root;
  for (const seg of segsBelow) {
    let child = node.children.get(seg);
    if (!child) {
      const ankiPath = node.ankiPath ? `${node.ankiPath}${SEP}${seg}` : seg;
      child = { displayName: seg, ankiPath, children: new Map(), notes: [] };
      node.children.set(seg, child);
      byPath.set(ankiPath, child);
    }
    node = child;
  }
}

function serialize(
  node: Node,
  models: CrowdAnkiNoteModel[],
  mediaFiles: string[],
  isRoot: boolean,
): CrowdAnkiDeck {
  const deck: CrowdAnkiDeck = {
    __type__: "Deck",
    crowdanki_uuid: deterministicUuid(NS_DECK, node.ankiPath || node.displayName),
    name: node.displayName,
    desc: "",
    media_files: isRoot ? mediaFiles : [],
    notes: node.notes.map(toNote),
    children: [...node.children.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((child) => serialize(child, models, mediaFiles, false)),
  };
  if (isRoot) deck.note_models = models;
  return deck;
}

function toNote(note: ApkgNote): CrowdAnkiNote {
  return {
    __type__: "Note",
    guid: note.guid,
    note_model_uuid: deterministicUuid(NS_MODEL, note.modelId),
    fields: note.fields,
    tags: note.tags,
  };
}

function toNoteModel(model: ApkgModel): CrowdAnkiNoteModel {
  return {
    __type__: "NoteModel",
    crowdanki_uuid: deterministicUuid(NS_MODEL, model.id),
    name: model.name,
    css: model.css,
    flds: model.fields.map((f) => ({ name: f.name, ord: f.ord })),
    tmpls: model.templates.map((t, ord) => ({ name: t.name, ord, qfmt: t.qfmt, afmt: t.afmt })),
  };
}
