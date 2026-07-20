import { readFileSync } from "node:fs";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseApkg } from "./parse";
import { writeApkg } from "./write";
import { buildDeckJson } from "../crowdanki/deckJson";
import type { ParsedApkg } from "./types";

const FIXTURE = "legacy/examples/sample-deck.apkg";
let SQL: SqlJsStatic;

beforeAll(async () => {
  const file = readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  SQL = await initSqlJs({ wasmBinary });
});

/** The full golden-set loop: read a real deck, build the CrowdAnki tree, write a
 *  new `.apkg` from it, and read that back with the very same parser. Anything the
 *  writer gets wrong shows up as a difference on the far side. */
async function roundTrip(): Promise<{ before: ParsedApkg; after: ParsedApkg; blob: Blob }> {
  const before = await parseApkg(readFileSync(FIXTURE), SQL);
  const deck = buildDeckJson(before, "sample-deck");
  const blob = await writeApkg(deck, before.media, SQL);
  const after = await parseApkg(await blob.arrayBuffer(), SQL);
  return { before, after, blob };
}

const sortByGuid = <T extends { guid: string }>(notes: T[]): T[] =>
  [...notes].sort((a, b) => a.guid.localeCompare(b.guid));

describe("writeApkg — .apkg round-trip golden-set", () => {
  it("produces an archive Anki recognises: collection.anki2 + media manifest", async () => {
    const { blob } = await roundTrip();
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("collection.anki2")).not.toBeNull();
    expect(zip.file("media")).not.toBeNull();
    expect(JSON.parse(await zip.file("media")!.async("string"))).toEqual({});
  });

  it("declares schema 11 — the widest-compatible collection format", async () => {
    const { after } = await roundTrip();
    expect(after.schemaVersion).toBe(11);
    expect(after.collectionEntry).toBe("collection.anki2");
  });

  it("keeps every note", async () => {
    const { before, after } = await roundTrip();
    expect(after.notes.length).toBe(before.notes.length);
    expect(after.notes.length).toBe(11);
  });

  it("preserves note GUIDs — this is what makes a re-import update, not duplicate", async () => {
    const { before, after } = await roundTrip();
    expect(sortByGuid(after.notes).map((n) => n.guid)).toEqual(sortByGuid(before.notes).map((n) => n.guid));
  });

  it("preserves field values field-for-field", async () => {
    const { before, after } = await roundTrip();
    const a = sortByGuid(before.notes);
    const b = sortByGuid(after.notes);
    for (let i = 0; i < a.length; i++) expect(b[i].fields).toEqual(a[i].fields);
  });

  it("preserves tags", async () => {
    const { before, after } = await roundTrip();
    const a = sortByGuid(before.notes);
    const b = sortByGuid(after.notes);
    for (let i = 0; i < a.length; i++) expect(b[i].tags).toEqual(a[i].tags);
  });

  it("preserves the deck hierarchy each note lives in", async () => {
    const { before, after } = await roundTrip();
    const a = sortByGuid(before.notes);
    const b = sortByGuid(after.notes);
    for (let i = 0; i < a.length; i++) expect(b[i].deckName).toBe(a[i].deckName);
  });

  it("preserves note models — name, fields and both templates", async () => {
    const { before, after } = await roundTrip();
    const a = [...before.models.values()].sort((x, y) => x.name.localeCompare(y.name));
    const b = [...after.models.values()].sort((x, y) => x.name.localeCompare(y.name));
    expect(b.map((m) => m.name)).toEqual(a.map((m) => m.name));
    expect(b[0].fields.map((f) => f.name)).toEqual(a[0].fields.map((f) => f.name));
    expect(b[0].templates.map((t) => t.name)).toEqual(a[0].templates.map((t) => t.name));
    expect(b[0].templates.map((t) => t.qfmt)).toEqual(a[0].templates.map((t) => t.qfmt));
    expect(b[0].css).toBe(a[0].css);
  });

  it("is deterministic — the same deck written twice is byte-stable in its ids", async () => {
    const first = await roundTrip();
    const second = await roundTrip();
    expect(sortByGuid(second.after.notes).map((n) => n.id)).toEqual(
      sortByGuid(first.after.notes).map((n) => n.id),
    );
  });

  it("carries a restyled CSS through into the written collection", async () => {
    const before = await parseApkg(readFileSync(FIXTURE), SQL);
    const deck = buildDeckJson(before, "sample-deck");
    const marker = ".card { --razbiram-test: 1; }";
    deck.note_models = deck.note_models!.map((m) => ({ ...m, css: marker }));
    const blob = await writeApkg(deck, before.media, SQL);
    const after = await parseApkg(await blob.arrayBuffer(), SQL);
    for (const model of after.models.values()) expect(model.css).toBe(marker);
  });

  it("round-trips media files by name and bytes", async () => {
    const before = await parseApkg(readFileSync(FIXTURE), SQL);
    const deck = buildDeckJson(before, "sample-deck");
    const media = [{ name: "razbiram-test.txt", bytes: new TextEncoder().encode("здравей") }];
    const blob = await writeApkg(deck, media, SQL);
    const after = await parseApkg(await blob.arrayBuffer(), SQL);
    expect(after.media.map((m) => m.name)).toEqual(["razbiram-test.txt"]);
    expect(new TextDecoder().decode(after.media[0].bytes)).toBe("здравей");
  });

  it("refuses an empty deck instead of writing an unimportable file", async () => {
    const before = await parseApkg(readFileSync(FIXTURE), SQL);
    const deck = buildDeckJson(before, "sample-deck");
    const empty = { ...deck, notes: [], children: [] };
    await expect(writeApkg(empty, [], SQL)).rejects.toThrow(/Keine Notizen/);
  });
});
