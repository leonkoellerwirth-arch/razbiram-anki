import initSqlJs, { type SqlJsStatic } from "sql.js";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { parseApkg } from "./parse";

const SEP = String.fromCharCode(0x1f);
let SQL: SqlJsStatic;

beforeAll(async () => {
  const file = (await import("node:fs")).readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  SQL = await initSqlJs({ wasmBinary });
});

/** A minimal legacy (schema-11) Anki collection with the given note fronts. */
function makeCollection(fronts: string[]): Uint8Array {
  const db = new SQL.Database();
  const models = JSON.stringify({
    "1": { name: "Basic", css: "", flds: [{ name: "Front", ord: 0 }, { name: "Back", ord: 1 }], tmpls: [] },
  });
  const decks = JSON.stringify({ "1": { name: "Real Deck" } });
  db.run("CREATE TABLE col (ver INTEGER, models TEXT, decks TEXT);");
  db.run("INSERT INTO col VALUES (11, ?, ?);", [models, decks]);
  db.run("CREATE TABLE notes (id INTEGER, guid TEXT, mid INTEGER, flds TEXT, tags TEXT);");
  db.run("CREATE TABLE cards (nid INTEGER, did INTEGER);");
  fronts.forEach((front, i) => {
    db.run("INSERT INTO notes VALUES (?, ?, 1, ?, '');", [i + 1, `g${i}`, `${front}${SEP}Back`]);
    db.run("INSERT INTO cards VALUES (?, 1);", [i + 1]);
  });
  const bytes = db.export();
  db.close();
  return bytes;
}

async function makeApkg(members: Record<string, Uint8Array>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, bytes] of Object.entries(members)) zip.file(name, bytes);
  return zip.generateAsync({ type: "uint8array" });
}

describe("pickCollection — the meta file decides, stubs are ignored", () => {
  it("reads the meta-preferred collection, not a placeholder stub", async () => {
    // meta v2 → collection.anki21 is authoritative; anki2 is just a stub.
    const apkg = await makeApkg({
      meta: new Uint8Array([0x08, 0x02]),
      "collection.anki21": makeCollection(["EchteKarte"]),
      "collection.anki2": makeCollection(["Please update to the latest Anki version"]),
    });
    const parsed = await parseApkg(apkg, SQL);
    expect(parsed.notes.length).toBe(1);
    expect(parsed.notes[0].fields[0]).toBe("EchteKarte");
    expect(parsed.collectionEntry).toBe("collection.anki21");
  });

  it("falls back to the newest present member when there is no meta", async () => {
    const apkg = await makeApkg({ "collection.anki2": makeCollection(["OnlyLegacy"]) });
    const parsed = await parseApkg(apkg, SQL);
    expect(parsed.notes[0].fields[0]).toBe("OnlyLegacy");
    expect(parsed.collectionEntry).toBe("collection.anki2");
  });

  it("surfaces a genuinely empty collection as zero notes (no crash)", async () => {
    const apkg = await makeApkg({
      meta: new Uint8Array([0x08, 0x02]),
      "collection.anki21": makeCollection([]),
    });
    const parsed = await parseApkg(apkg, SQL);
    expect(parsed.notes.length).toBe(0);
  });
});
