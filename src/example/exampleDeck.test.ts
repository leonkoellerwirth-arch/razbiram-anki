import { readFileSync } from "node:fs";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { beforeAll, describe, expect, it } from "vitest";
import { buildExampleDeck, EXAMPLE_DECK_NAME } from "./exampleDeck";
import { writeApkg } from "../apkg/write";
import { parseApkg } from "../apkg/parse";
import { summarize } from "../crowdanki/summary";

let SQL: SqlJsStatic;

beforeAll(async () => {
  const file = readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  SQL = await initSqlJs({ wasmBinary });
});

describe("the razbiram example deck", () => {
  it("is a valid CrowdAnki deck with one model and six notes", () => {
    const deck = buildExampleDeck();
    expect(deck.__type__).toBe("Deck");
    expect(deck.name).toBe(EXAMPLE_DECK_NAME);
    expect(deck.note_models).toHaveLength(1);
    expect(deck.notes).toHaveLength(6);
  });

  it("resolves every note against its model, as the platform reads it", () => {
    const deck = buildExampleDeck();
    const modelUuid = deck.note_models![0].crowdanki_uuid;
    const fieldCount = deck.note_models![0].flds.length;
    for (const note of deck.notes) {
      expect(note.note_model_uuid).toBe(modelUuid);
      expect(note.fields).toHaveLength(fieldCount);
    }
  });

  it("shows three CEFR bands, so the badge is visible in the example", () => {
    const bands = buildExampleDeck().notes.map((n) => n.fields[2]);
    expect(new Set(bands)).toEqual(new Set(["A1", "A2", "B1"]));
  });

  it("is written in Bulgarian with German glosses", () => {
    for (const note of buildExampleDeck().notes) {
      expect(note.fields[0]).toMatch(/^[Ѐ-ӿ]+$/); // Cyrillic word
      expect(note.fields[1]).toMatch(/[a-zäöüß]/i); // Latin gloss
    }
  });

  it("highlights the target word in every example sentence", () => {
    for (const note of buildExampleDeck().notes) {
      const [word, , , , , , example] = note.fields;
      expect(example).toContain('<span class="target">');
      // The highlighted span must contain the word itself (or its inflected form).
      expect(example).toContain(word.slice(0, 5));
    }
  });

  it("exercises the long-word type sizing", () => {
    const words = buildExampleDeck().notes.map((n) => n.fields[0]);
    expect(words.some((w) => w.length >= 10)).toBe(true);
  });

  it("is deterministic — the same deck every time, so re-downloads update in Anki", () => {
    expect(JSON.stringify(buildExampleDeck())).toBe(JSON.stringify(buildExampleDeck()));
  });

  it("previews as a real deck through the existing summary path", () => {
    const summary = summarize(buildExampleDeck());
    expect(summary.totalNotes).toBe(6);
    expect(summary.rootName).toBe(EXAMPLE_DECK_NAME);
    expect(summary.sampleCards.length).toBeGreaterThan(0);
  });

  it("exports to an .apkg that reads back with every note intact", async () => {
    const deck = buildExampleDeck();
    const blob = await writeApkg(deck, [], SQL);
    const parsed = await parseApkg(await blob.arrayBuffer(), SQL);
    expect(parsed.notes).toHaveLength(6);
    expect(parsed.deckNames).toEqual([EXAMPLE_DECK_NAME]);
    const [model] = [...parsed.models.values()];
    expect(model.templates).toHaveLength(2);
    expect(model.css).toContain("© razbiram.com");
    expect(model.templates[0].afmt).toContain("https://razbiram.com");
  });
});
