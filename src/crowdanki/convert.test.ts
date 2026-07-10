import { describe, expect, it } from "vitest";
import { emptyExportMessage } from "./convert";

describe("emptyExportMessage", () => {
  it("names the empty decks it found so the file doesn't look 'broken'", () => {
    const msg = emptyExportMessage(["Latein - die schlauen Mediziner"]);
    expect(msg).toContain("0 Karten");
    expect(msg).toContain("„Latein - die schlauen Mediziner“");
    expect(msg).toContain("Include subdecks");
  });

  it("lists multiple decks", () => {
    const msg = emptyExportMessage(["A", "B"]);
    expect(msg).toContain("„A“, „B“");
  });

  it("still gives guidance when no deck name is available", () => {
    const msg = emptyExportMessage([]);
    expect(msg).toContain("0 Karten");
    expect(msg).not.toContain("Gefundene Decks");
    expect(msg).toContain("Include subdecks");
  });
});
