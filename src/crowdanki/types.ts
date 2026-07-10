/** The CrowdAnki `deck.json` shapes razbiram-anki emits — exactly what razbiram.com
 *  reads (its `ankiNoteParser` + `generate_manifests.py`). Only the keys the platform
 *  actually consumes are produced; a leaner-than-Anki file, but format-compatible. */

export interface CrowdAnkiField {
  name: string;
  ord: number;
}

export interface CrowdAnkiTemplate {
  name: string;
  ord: number;
  qfmt: string;
  afmt: string;
}

export interface CrowdAnkiNoteModel {
  __type__: "NoteModel";
  crowdanki_uuid: string;
  name: string;
  css: string;
  flds: CrowdAnkiField[];
  tmpls: CrowdAnkiTemplate[];
}

export interface CrowdAnkiNote {
  __type__: "Note";
  guid: string;
  note_model_uuid: string;
  fields: string[];
  tags: string[];
}

export interface CrowdAnkiDeck {
  __type__: "Deck";
  crowdanki_uuid: string;
  name: string;
  desc: string;
  media_files: string[];
  /** Only the root deck carries the models; children reference them by uuid. */
  note_models?: CrowdAnkiNoteModel[];
  notes: CrowdAnkiNote[];
  children: CrowdAnkiDeck[];
}

/** A permissive read view — a deck we *built* and one *loaded* from an existing
 *  file both satisfy it, so the summary walks either without a rebuild. */
export interface CrowdAnkiDeckLike {
  __type__?: string;
  name?: string;
  media_files?: string[];
  note_models?: { crowdanki_uuid?: string; name?: string; flds?: { name?: string }[] }[];
  notes?: { note_model_uuid?: string; fields?: string[] }[];
  children?: CrowdAnkiDeckLike[];
}
