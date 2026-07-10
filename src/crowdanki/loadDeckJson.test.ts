import { describe, expect, it } from "vitest";
import { loadDeckJson, DeckJsonError } from "./loadDeckJson";
import { summarize } from "./summary";

// The easy path: a student already has a CrowdAnki deck.json (what razbiram.com
// stores per deck). It must pass through untouched and summarize correctly.
const REAL_DECK = JSON.stringify({
  __type__: "Deck",
  name: "Varna::Biologie",
  crowdanki_uuid: "2f943220-4a57-11f1-b554-312ccf050386",
  media_files: ["cat.jpg"],
  note_models: [
    { __type__: "NoteModel", crowdanki_uuid: "m-1", name: "Basic", flds: [{ name: "Front", ord: 0 }, { name: "Back", ord: 1 }] },
  ],
  notes: [
    { __type__: "Note", guid: "g1", note_model_uuid: "m-1", fields: ["Frage", "Antwort"], tags: [] },
  ],
  children: [],
});

describe("loadDeckJson — existing CrowdAnki deck.json", () => {
  it("passes a valid deck.json through unchanged", () => {
    const deck = loadDeckJson(REAL_DECK);
    expect(deck.__type__).toBe("Deck");
    expect(deck.notes?.length).toBe(1);
  });

  it("summarizes a loaded deck the same way as a built one", () => {
    const s = summarize(loadDeckJson(REAL_DECK));
    expect(s.totalNotes).toBe(1);
    expect(s.hasMedia).toBe(true);
    expect(s.cardTypes).toContain("flashcard");
    expect(s.sampleCards[0].front).toBe("Frage");
  });

  it("rejects non-JSON with a clear message", () => {
    expect(() => loadDeckJson("<not json>")).toThrow(DeckJsonError);
    expect(() => loadDeckJson("<not json>")).toThrow(/kein.*JSON/i);
  });

  it("rejects JSON that is not a CrowdAnki deck", () => {
    expect(() => loadDeckJson(JSON.stringify({ hello: "world" }))).toThrow(/CrowdAnki/i);
  });
});
