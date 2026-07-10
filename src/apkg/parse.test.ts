import { readFileSync } from "node:fs";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { parseApkg } from "./parse";

// The round-trip golden-set (BIBLE §4): a real .apkg built by the legacy genanki
// CLI is parsed back, and we assert the content survives the trip field-for-field.
const FIXTURE = "legacy/examples/sample-deck.apkg";

let SQL: SqlJsStatic;

beforeAll(async () => {
  const file = readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  SQL = await initSqlJs({ wasmBinary });
});

describe("parseApkg — legacy genanki .apkg", () => {
  it("reads every note", async () => {
    const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
    expect(parsed.notes.length).toBe(11);
    expect(parsed.schemaVersion).toBeGreaterThan(0);
  });

  it("reads the note model and its field names", async () => {
    const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
    const model = [...parsed.models.values()][0];
    const fieldNames = model.fields.map((f) => f.name);
    expect(fieldNames).toContain("Word");
    expect(fieldNames).toContain("Gloss");
    // fields come back in Anki's ordinal order
    expect(model.fields.map((f) => f.ord)).toEqual([...model.fields].map((_, i) => i));
  });

  it("preserves field content through the round-trip", async () => {
    const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
    const everything = parsed.notes.flatMap((n) => n.fields).join("\n");
    expect(everything).toContain("купува"); // a Bulgarian surface word
    expect(everything).toContain("kaufen"); // its German gloss
  });

  it("resolves the deck name from the note's cards", async () => {
    const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
    expect(parsed.deckNames).toContain("razbiram::Texte::Meine Familie");
    expect(parsed.notes.every((n) => n.deckName.length > 0)).toBe(true);
  });

  it("gives every note a guid, a model, and tags", async () => {
    const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
    for (const note of parsed.notes) {
      expect(note.guid).toBeTruthy();
      expect(parsed.models.has(note.modelId)).toBe(true);
      expect(Array.isArray(note.tags)).toBe(true);
    }
  });

  it("rejects a non-Anki archive with a clear message", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("hello.txt", "not a deck");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(parseApkg(bytes, SQL)).rejects.toThrow(/kein.*collection|Anki-Deck/i);
  });
});
