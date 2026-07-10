import JSZip from "jszip";
import { decompress } from "fzstd";
import type { Database, SqlJsStatic } from "sql.js";
import type { ApkgField, ApkgModel, ApkgNote, ApkgMedia, ParsedApkg } from "./types";

const FIELD_SEP = String.fromCharCode(0x1f); // Anki joins fields with the 0x1F unit separator
const DEFAULT_DECK = "Default";

/** Parse a `.apkg` archive into the intermediate model. `SQL` is an initialised
 *  sql.js module — the caller supplies it (browser fetches the wasm; tests read
 *  it from disk), which keeps this function pure and easy to test. */
export async function parseApkg(
  archive: ArrayBuffer | Uint8Array,
  SQL: SqlJsStatic,
): Promise<ParsedApkg> {
  const zip = await JSZip.loadAsync(archive);

  const { entry, bytes } = await readCollectionBytes(zip);
  const db = new SQL.Database(bytes);
  try {
    const [ver, modelsJson, decksJson] = readColRow(db);

    const models = modelsJson && modelsJson !== "{}"
      ? modelsFromColJson(modelsJson)
      : modelsFromTables(db);

    const deckNamesById = decksJson && decksJson !== "{}"
      ? decksFromColJson(decksJson)
      : decksFromTable(db);

    const notes = readNotes(db, deckNamesById);
    const media = await readMedia(zip);

    const deckNames = [...new Set(notes.map((n) => n.deckName))].sort();
    return { deckNames, models, notes, media, schemaVersion: ver, collectionEntry: entry };
  } finally {
    db.close();
  }
}

// --- collection location ------------------------------------------------------

/** Pick the collection member (newest format first) and decompress if needed. */
async function readCollectionBytes(zip: JSZip): Promise<{ entry: string; bytes: Uint8Array }> {
  // Order matters: a modern export can carry several; the newest is authoritative.
  for (const entry of ["collection.anki21b", "collection.anki21", "collection.anki2"]) {
    const file = zip.file(entry);
    if (!file) continue;
    const raw = await file.async("uint8array");
    const bytes = entry.endsWith("b") ? decompress(raw) : raw;
    return { entry, bytes };
  }
  throw new ApkgParseError(
    "Das sieht nicht wie ein Anki-Deck aus — keine collection-Datei in der .apkg gefunden.",
  );
}

// --- col row (schema version + legacy JSON blobs) -----------------------------

function readColRow(db: Database): [number, string | null, string | null] {
  const rows = queryRows(db, "SELECT ver, models, decks FROM col LIMIT 1");
  if (rows.length === 0) throw new ApkgParseError("Leere Anki-Sammlung (kein col-Eintrag).");
  const [ver, models, decks] = rows[0];
  return [Number(ver) || 0, models as string | null, decks as string | null];
}

// --- models -------------------------------------------------------------------

function modelsFromColJson(json: string): Map<string, ApkgModel> {
  const parsed = JSON.parse(json) as Record<string, RawColModel>;
  const models = new Map<string, ApkgModel>();
  for (const [id, m] of Object.entries(parsed)) {
    const fields: ApkgField[] = (m.flds ?? [])
      .map((f) => ({ name: f.name, ord: f.ord }))
      .sort((a, b) => a.ord - b.ord);
    models.set(id, {
      id,
      name: m.name ?? "",
      fields,
      templates: (m.tmpls ?? []).map((t) => ({ name: t.name, qfmt: t.qfmt, afmt: t.afmt })),
      css: m.css ?? "",
    });
  }
  return models;
}

/** Schema-18 fallback: field/template *names* are plain columns; the qfmt/afmt
 *  live in a protobuf `config` blob we don't decode, so templates carry names
 *  only. That is enough for vocab.v1; CrowdAnki fidelity is reduced. */
function modelsFromTables(db: Database): Map<string, ApkgModel> {
  const models = new Map<string, ApkgModel>();
  for (const [id, name] of queryRows(db, "SELECT id, name FROM notetypes")) {
    models.set(String(id), { id: String(id), name: String(name), fields: [], templates: [], css: "" });
  }
  for (const [ntid, ord, name] of queryRows(db, "SELECT ntid, ord, name FROM fields")) {
    models.get(String(ntid))?.fields.push({ name: String(name), ord: Number(ord) });
  }
  for (const model of models.values()) model.fields.sort((a, b) => a.ord - b.ord);
  for (const [ntid, name] of queryRows(db, "SELECT ntid, name FROM templates ORDER BY ord")) {
    models.get(String(ntid))?.templates.push({ name: String(name), qfmt: "", afmt: "" });
  }
  return models;
}

// --- decks --------------------------------------------------------------------

function decksFromColJson(json: string): Map<string, string> {
  const parsed = JSON.parse(json) as Record<string, { name?: string }>;
  const map = new Map<string, string>();
  for (const [id, d] of Object.entries(parsed)) map.set(id, d.name ?? DEFAULT_DECK);
  return map;
}

function decksFromTable(db: Database): Map<string, string> {
  const map = new Map<string, string>();
  for (const [id, name] of queryRows(db, "SELECT id, name FROM decks")) {
    map.set(String(id), String(name) || DEFAULT_DECK);
  }
  return map;
}

// --- notes --------------------------------------------------------------------

function readNotes(db: Database, deckNamesById: Map<string, string>): ApkgNote[] {
  // A note's deck = its first card's deck (MIN(did) is deterministic).
  const rows = queryRows(
    db,
    `SELECT n.id, n.guid, n.mid, n.flds, n.tags, MIN(c.did)
       FROM notes n LEFT JOIN cards c ON c.nid = n.id
      GROUP BY n.id`,
  );
  return rows.map(([id, guid, mid, flds, tags, did]) => ({
    id: Number(id),
    guid: String(guid),
    modelId: String(mid),
    fields: String(flds).split(FIELD_SEP),
    tags: String(tags ?? "").trim().split(/\s+/).filter(Boolean),
    deckName: (did != null && deckNamesById.get(String(did))) || DEFAULT_DECK,
  }));
}

// --- media --------------------------------------------------------------------

async function readMedia(zip: JSZip): Promise<ApkgMedia[]> {
  const mediaFile = zip.file("media");
  if (!mediaFile) return [];
  const map = JSON.parse(await mediaFile.async("string")) as Record<string, string>;
  const out: ApkgMedia[] = [];
  for (const [index, name] of Object.entries(map)) {
    const entry = zip.file(index);
    if (!entry) continue;
    out.push({ name, bytes: await entry.async("uint8array") });
  }
  return out;
}

// --- helpers ------------------------------------------------------------------

type RawColModel = {
  name?: string;
  css?: string;
  flds?: { name: string; ord: number }[];
  tmpls?: { name: string; qfmt: string; afmt: string }[];
};

/** Run a query and return its rows as plain value arrays (sql.js gives one
 *  result set with `values`; an empty result set yields `[]`). */
function queryRows(db: Database, sql: string): unknown[][] {
  const result = db.exec(sql);
  return result.length === 0 ? [] : result[0].values;
}

export class ApkgParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApkgParseError";
  }
}
