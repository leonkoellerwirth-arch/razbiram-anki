import { readFileSync } from "node:fs";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { parseApkg } from "../apkg/parse";
import { buildDeckJson } from "./deckJson";
import { summarize } from "./summary";
import type { CrowdAnkiDeck, CrowdAnkiNoteModel, CrowdAnkiNote } from "./types";

const FIXTURE = "legacy/examples/sample-deck.apkg";
let SQL: SqlJsStatic;

beforeAll(async () => {
  const file = readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  SQL = await initSqlJs({ wasmBinary });
});

async function build(): Promise<CrowdAnkiDeck> {
  const parsed = await parseApkg(readFileSync(FIXTURE), SQL);
  return buildDeckJson(parsed, "sample-deck");
}

// The app's ankiNoteParser resolves notes against models recursively over the
// `::` tree. We mirror that exactly, so the round-trip proves razbiram.com can
// read what we emit.
function collectModels(deck: CrowdAnkiDeck, out: CrowdAnkiNoteModel[] = []): CrowdAnkiNoteModel[] {
  for (const m of deck.note_models ?? []) out.push(m);
  for (const c of deck.children) collectModels(c, out);
  return out;
}
function collectNotes(deck: CrowdAnkiDeck, out: CrowdAnkiNote[] = []): CrowdAnkiNote[] {
  for (const n of deck.notes) out.push(n);
  for (const c of deck.children) collectNotes(c, out);
  return out;
}

describe("buildDeckJson — CrowdAnki round-trip golden-set", () => {
  it("produces one root Deck with the CrowdAnki shape", async () => {
    const deck = await build();
    expect(deck.__type__).toBe("Deck");
    expect(deck.crowdanki_uuid).toMatch(/^[0-9a-f-]{36}$/);
    expect(Array.isArray(deck.note_models)).toBe(true);
    expect(Array.isArray(deck.children)).toBe(true);
  });

  it("keeps every note, and every note resolves to its model (as the app reads it)", async () => {
    const deck = await build();
    const models = new Map(collectModels(deck).map((m) => [m.crowdanki_uuid, m]));
    const notes = collectNotes(deck);
    expect(notes.length).toBe(11);
    for (const note of notes) {
      expect(note.__type__).toBe("Note");
      expect(note.guid).toBeTruthy();
      expect(models.has(note.note_model_uuid)).toBe(true);
    }
  });

  it("preserves field content and the model's field names", async () => {
    const deck = await build();
    const model = collectModels(deck)[0];
    expect(model.flds.map((f) => f.name)).toEqual(expect.arrayContaining(["Word", "Gloss"]));
    const everything = collectNotes(deck)
      .flatMap((n) => n.fields)
      .join("\n");
    expect(everything).toContain("купува"); // Bulgarian surface word
    expect(everything).toContain("kaufen"); // its German gloss
  });

  it("rebuilds the `::` hierarchy into nested children", async () => {
    const deck = await build();
    const names: string[] = [];
    const walk = (d: CrowdAnkiDeck) => {
      names.push(d.name);
      d.children.forEach(walk);
    };
    walk(deck);
    // the fixture deck lives under razbiram::Texte::Meine Familie
    expect(names.some((n) => n.includes("Meine Familie") || n === "Meine Familie")).toBe(true);
    // child node names are leaf-only (no `::`), the root may carry the shared path
    for (const child of deck.children) expect(child.name).not.toContain("::");
  });

  it("is deterministic — same deck in, identical uuids out", async () => {
    const a = await build();
    const b = await build();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("summarizes what the student will see", async () => {
    const deck = await build();
    const s = summarize(deck);
    expect(s.totalNotes).toBe(11);
    expect(s.modelCount).toBeGreaterThanOrEqual(1);
    expect(s.cardTypes.length).toBeGreaterThanOrEqual(1);
    expect(s.sampleCards.length).toBeGreaterThan(0);
  });
});
