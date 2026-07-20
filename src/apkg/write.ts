/** The write half of the Anki bridge: a CrowdAnki deck → a real `.apkg` a student
 *  can double-click-import, no CrowdAnki add-on required.
 *
 *  Targets **schema 11** (`collection.anki2`) — the widest-compatible format:
 *  Anki 2.1 desktop, AnkiDroid and AnkiMobile all read it, and newer Anki upgrades
 *  it on import. The DDL and the `col` JSON blob shapes below were not written from
 *  memory: they were dumped from a real `.apkg` (`legacy/examples/sample-deck.apkg`)
 *  with `sqlite3 .schema`, so every column name and blob key is ground truth.
 *
 *  Everything is emitted as *new* cards (`type`/`queue` = 0) — we ship content, not
 *  a study history. Note GUIDs are carried over from the source, which is what lets
 *  Anki treat a re-import as an update instead of a duplicate. */

import JSZip from "jszip";
import type { Database, SqlJsStatic } from "sql.js";
import type { ApkgMedia } from "./types";
import type { CrowdAnkiDeck, CrowdAnkiNote, CrowdAnkiNoteModel } from "../crowdanki/types";
import { stableId } from "../crowdanki/uuid";

const FIELD_SEP = String.fromCharCode(0x1f);
const SEP = "::";
const SCHEMA_VERSION = 11;
const DEFAULT_DECK_ID = 1;
const NS_MODEL_ID = "razbiram-anki/anki-model-id";
const NS_DECK_ID = "razbiram-anki/anki-deck-id";
const NS_NOTE_ID = "razbiram-anki/anki-note-id";

/** Build an Anki-importable `.apkg` from a CrowdAnki deck.
 *
 *  `SQL` is the same initialised sql.js module the parser already uses — passing it
 *  in keeps this function pure and costs no second wasm fetch. */
export async function writeApkg(
  deck: CrowdAnkiDeck,
  media: ApkgMedia[],
  SQL: SqlJsStatic,
): Promise<Blob> {
  const models = deck.note_models ?? [];
  if (models.length === 0) throw new ApkgWriteError("Kein Notiztyp im Deck — nichts zu exportieren.");

  const decks = flattenDecks(deck);
  const notes = decks.flatMap((d) => d.notes.map((note) => ({ note, deckId: d.id })));
  if (notes.length === 0) throw new ApkgWriteError("Keine Notizen im Deck — nichts zu exportieren.");

  const modelIdByUuid = new Map(models.map((m) => [m.crowdanki_uuid, stableId(NS_MODEL_ID, m.crowdanki_uuid)]));
  const rows = await buildNoteRows(notes, models, modelIdByUuid);

  const db = new SQL.Database();
  try {
    createSchema(db);
    insertCol(db, buildModelsBlob(models, modelIdByUuid, decks[0].id), buildDecksBlob(decks));
    insertNotes(db, rows);
    insertCards(db, rows, models, modelIdByUuid);
    return packArchive(db.export(), media);
  } finally {
    db.close();
  }
}

// --- deck tree ----------------------------------------------------------------

interface FlatDeck {
  id: number;
  /** Full `::` path — Anki stores the hierarchy in the name, not in a parent ref. */
  fullName: string;
  notes: CrowdAnkiNote[];
}

/** CrowdAnki nests decks and names children by their leaf segment; Anki wants one
 *  flat list keyed by the full `::` path. Rebuild the path on the way down. */
function flattenDecks(root: CrowdAnkiDeck, parentPath = ""): FlatDeck[] {
  const fullName = parentPath ? `${parentPath}${SEP}${root.name}` : root.name;
  const self: FlatDeck = {
    id: stableId(NS_DECK_ID, fullName),
    fullName,
    notes: root.notes ?? [],
  };
  return [self, ...(root.children ?? []).flatMap((child) => flattenDecks(child, fullName))];
}

// --- notes --------------------------------------------------------------------

interface NoteRow {
  id: number;
  guid: string;
  mid: number;
  tags: string;
  flds: string;
  sfld: string;
  csum: number;
  deckId: number;
}

async function buildNoteRows(
  entries: { note: CrowdAnkiNote; deckId: number }[],
  models: CrowdAnkiNoteModel[],
  modelIdByUuid: Map<string, number>,
): Promise<NoteRow[]> {
  const fallbackMid = modelIdByUuid.get(models[0].crowdanki_uuid)!;
  const usedIds = new Set<number>();
  const rows: NoteRow[] = [];
  for (const { note, deckId } of entries) {
    const sfld = stripHtml(note.fields[0] ?? "");
    rows.push({
      id: uniqueId(usedIds, stableId(NS_NOTE_ID, note.guid)),
      guid: note.guid,
      mid: modelIdByUuid.get(note.note_model_uuid) ?? fallbackMid,
      // Anki stores tags space-separated *and* space-padded, so `tags like '% x %'` works.
      tags: note.tags.length > 0 ? ` ${note.tags.join(" ")} ` : "",
      flds: note.fields.join(FIELD_SEP),
      sfld,
      csum: await fieldChecksum(sfld),
      deckId,
    });
  }
  return rows;
}

function insertNotes(db: Database, rows: NoteRow[]): void {
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare(
    "INSERT INTO notes (id,guid,mid,mod,usn,tags,flds,sfld,csum,flags,data) VALUES (?,?,?,?,-1,?,?,?,?,0,'')",
  );
  try {
    for (const r of rows) stmt.run([r.id, r.guid, r.mid, now, r.tags, r.flds, r.sfld, r.csum]);
  } finally {
    stmt.free();
  }
}

/** One card per template per note — that is how Anki materialises a note. A model
 *  with no templates still gets one card, or the note would be invisible. */
function insertCards(
  db: Database,
  rows: NoteRow[],
  models: CrowdAnkiNoteModel[],
  modelIdByUuid: Map<string, number>,
): void {
  const templateCount = new Map(
    models.map((m) => [modelIdByUuid.get(m.crowdanki_uuid)!, Math.max(1, m.tmpls.length)]),
  );
  const now = Math.floor(Date.now() / 1000);
  const usedIds = new Set<number>();
  const stmt = db.prepare(
    "INSERT INTO cards (id,nid,did,ord,mod,usn,type,queue,due,ivl,factor,reps,lapses,left,odue,odid,flags,data)" +
      " VALUES (?,?,?,?,?,-1,0,0,?,0,0,0,0,0,0,0,0,'')",
  );
  try {
    rows.forEach((r, position) => {
      for (let ord = 0; ord < (templateCount.get(r.mid) ?? 1); ord++) {
        const id = uniqueId(usedIds, r.id + ord);
        // `due` is the position in the new-card queue, so cards keep the deck's order.
        stmt.run([id, r.id, r.deckId, ord, now, position + 1]);
      }
    });
  } finally {
    stmt.free();
  }
}

// --- col row ------------------------------------------------------------------

function insertCol(db: Database, models: string, decks: string): void {
  const nowMs = Date.now();
  db.run(
    "INSERT INTO col (id,crt,mod,scm,ver,dty,usn,ls,conf,models,decks,dconf,tags)" +
      " VALUES (1,?,?,?,?,0,0,0,?,?,?,?,'{}')",
    [collectionCreationTime(), nowMs, nowMs, SCHEMA_VERSION, JSON.stringify(COL_CONF), models, decks, JSON.stringify(DEFAULT_DCONF)],
  );
}

/** Anki counts a study day from `crt`; it must be a whole-hour-ish epoch in the
 *  past. Today at 04:00 local is what Anki itself uses for a fresh collection. */
function collectionCreationTime(): number {
  const start = new Date();
  start.setHours(4, 0, 0, 0);
  return Math.floor(start.getTime() / 1000);
}

function buildModelsBlob(
  models: CrowdAnkiNoteModel[],
  modelIdByUuid: Map<string, number>,
  rootDeckId: number,
): string {
  const blob: Record<string, unknown> = {};
  for (const model of models) {
    const id = modelIdByUuid.get(model.crowdanki_uuid)!;
    const tmpls = model.tmpls.length > 0 ? model.tmpls : [{ name: "Card 1", ord: 0, qfmt: "", afmt: "" }];
    blob[String(id)] = {
      id,
      name: model.name,
      type: 0, // 0 = standard, 1 = cloze. Cloze models still import as standard-with-cloze-syntax.
      mod: Math.floor(Date.now() / 1000),
      usn: -1,
      sortf: 0,
      did: rootDeckId,
      css: model.css,
      latexPre: LATEX_PRE,
      latexPost: "\\end{document}",
      latexsvg: false,
      flds: model.flds.map((f, ord) => ({
        name: f.name,
        ord: f.ord ?? ord,
        font: "Liberation Sans",
        size: 20,
        sticky: false,
        rtl: false,
        media: [],
      })),
      tmpls: tmpls.map((t, ord) => ({
        name: t.name || `Card ${ord + 1}`,
        ord: t.ord ?? ord,
        qfmt: t.qfmt,
        afmt: t.afmt,
        bqfmt: "",
        bafmt: "",
        bfont: "",
        bsize: 0,
        did: null,
      })),
      req: tmpls.map((t, ord) => [ord, "any", requiredFieldOrds(t.qfmt, model)]),
      tags: [],
      vers: [],
    };
  }
  return JSON.stringify(blob);
}

/** Which field ordinals a template's front references — Anki uses `req` to decide
 *  whether a card is generated at all. "any" + every referenced field is the
 *  permissive reading; an empty list would suppress the card entirely, so fall
 *  back to field 0. */
function requiredFieldOrds(qfmt: string, model: CrowdAnkiNoteModel): number[] {
  const referenced = model.flds
    .filter((f) => qfmt.includes(`{{${f.name}}}`) || qfmt.includes(`:${f.name}}}`))
    .map((f, i) => f.ord ?? i);
  return referenced.length > 0 ? referenced : [0];
}

function buildDecksBlob(decks: FlatDeck[]): string {
  const blob: Record<string, unknown> = {
    [DEFAULT_DECK_ID]: deckEntry(DEFAULT_DECK_ID, "Default"),
  };
  for (const d of decks) blob[String(d.id)] = deckEntry(d.id, d.fullName);
  return JSON.stringify(blob);
}

function deckEntry(id: number, name: string): Record<string, unknown> {
  return {
    id,
    name,
    desc: "",
    conf: 1,
    dyn: 0,
    collapsed: false,
    extendNew: 10,
    extendRev: 50,
    mod: Math.floor(Date.now() / 1000),
    usn: -1,
    lrnToday: [0, 0],
    newToday: [0, 0],
    revToday: [0, 0],
    timeToday: [0, 0],
  };
}

// --- archive ------------------------------------------------------------------

/** `.apkg` layout: the SQLite collection, a `media` map from numeric archive entry
 *  to real filename, and the media bytes stored under those numbers. */
async function packArchive(collection: Uint8Array, media: ApkgMedia[]): Promise<Blob> {
  const zip = new JSZip();
  zip.file("collection.anki2", collection);
  const manifest: Record<string, string> = {};
  media.forEach((file, index) => {
    manifest[String(index)] = file.name;
    zip.file(String(index), file.bytes);
  });
  zip.file("media", JSON.stringify(manifest));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

// --- helpers ------------------------------------------------------------------

/** Anki's note checksum: the first 8 hex digits of the SHA-1 of the sort field,
 *  as an integer. Only the duplicate check reads it, so a wrong value degrades
 *  gracefully — but getting it right is what makes "find duplicates" work. */
async function fieldChecksum(sortField: string): Promise<number> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(sortField));
  const bytes = new Uint8Array(digest);
  return ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
}

/** Anki sorts and de-duplicates on the *text* of the first field. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Ids are hashes, so a collision is possible though vanishingly rare; walking to
 *  the next free integer keeps the primary key intact without losing determinism
 *  for every other row. */
function uniqueId(used: Set<number>, candidate: number): number {
  let id = candidate;
  while (used.has(id)) id++;
  used.add(id);
  return id;
}

/** Verbatim from a real collection (`sqlite3 collection.anki2 .schema`) — column
 *  order and names are what Anki's importer expects; a mismatch is silently fatal. */
function createSchema(db: Database): void {
  db.run(`
CREATE TABLE col (
  id integer primary key, crt integer not null, mod integer not null,
  scm integer not null, ver integer not null, dty integer not null,
  usn integer not null, ls integer not null, conf text not null,
  models text not null, decks text not null, dconf text not null, tags text not null
);
CREATE TABLE notes (
  id integer primary key, guid text not null, mid integer not null,
  mod integer not null, usn integer not null, tags text not null,
  flds text not null, sfld integer not null, csum integer not null,
  flags integer not null, data text not null
);
CREATE TABLE cards (
  id integer primary key, nid integer not null, did integer not null,
  ord integer not null, mod integer not null, usn integer not null,
  type integer not null, queue integer not null, due integer not null,
  ivl integer not null, factor integer not null, reps integer not null,
  lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null
);
CREATE TABLE revlog (
  id integer primary key, cid integer not null, usn integer not null,
  ease integer not null, ivl integer not null, lastIvl integer not null,
  factor integer not null, time integer not null, type integer not null
);
CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
`);
}

const LATEX_PRE =
  "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n" +
  "\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n" +
  "\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n";

const COL_CONF = {
  activeDecks: [1],
  addToCur: true,
  collapseTime: 1200,
  curDeck: 1,
  curModel: null,
  dueCounts: true,
  estTimes: true,
  newBury: true,
  newSpread: 0,
  nextPos: 1,
  sortBackwards: false,
  sortType: "noteFld",
  timeLim: 0,
};

const DEFAULT_DCONF = {
  1: {
    id: 1,
    name: "Default",
    mod: 0,
    usn: 0,
    autoplay: true,
    maxTaken: 60,
    replayq: true,
    timer: 0,
    new: { delays: [1, 10], ints: [1, 4, 7], initialFactor: 2500, order: 1, perDay: 20, bury: true, separate: true },
    rev: { perDay: 200, ease4: 1.3, fuzz: 0.05, minSpace: 1, ivlFct: 1, maxIvl: 36500, bury: true },
    lapse: { delays: [10], mult: 0, minInt: 1, leechFails: 8, leechAction: 0 },
  },
};

export class ApkgWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApkgWriteError";
  }
}
