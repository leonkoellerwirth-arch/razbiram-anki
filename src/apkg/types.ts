/** The intermediate model a parsed `.apkg` produces — backend-agnostic, so the
 *  vocab.v1 and CrowdAnki converters both build on it. */

export interface ApkgField {
  name: string;
  ord: number;
}

export interface ApkgTemplate {
  name: string;
  qfmt: string;
  afmt: string;
}

export interface ApkgModel {
  /** Anki model id (mid), kept as a string — ids exceed 2^53 in newer decks. */
  id: string;
  name: string;
  fields: ApkgField[];
  templates: ApkgTemplate[];
  css: string;
}

export interface ApkgNote {
  id: number;
  guid: string;
  modelId: string;
  /** Field values in model-field order (Anki stores them joined by \x1f). */
  fields: string[];
  tags: string[];
  /** Deck the note's first card belongs to (Anki's `::` hierarchy). */
  deckName: string;
}

export interface ApkgMedia {
  /** Real filename (from the archive's `media` map), e.g. "cat.jpg". */
  name: string;
  bytes: Uint8Array;
}

export interface ParsedApkg {
  /** Distinct deck names that actually carry notes, "hardest" order not implied. */
  deckNames: string[];
  models: Map<string, ApkgModel>;
  notes: ApkgNote[];
  media: ApkgMedia[];
  /** SQLite `col.ver` schema version (11 legacy … 18 new). */
  schemaVersion: number;
  /** Which member of the archive held the collection (for diagnostics). */
  collectionEntry: string;
}
