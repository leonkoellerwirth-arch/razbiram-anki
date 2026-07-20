import { describe, expect, it } from "vitest";
import { applyRazbiramStyle, canRestyleTemplates } from "./applyStyle";
import { RAZBIRAM_CARD_CSS, RAZBIRAM_TAGLINE, RAZBIRAM_URL } from "./cardTheme";
import type { CrowdAnkiNoteModel } from "../crowdanki/types";

function model(name: string, fields: string[], tmplCount = 1): CrowdAnkiNoteModel {
  return {
    __type__: "NoteModel",
    crowdanki_uuid: `uuid-${name}`,
    name,
    css: ".card { color: rebeccapurple; }",
    flds: fields.map((f, ord) => ({ name: f, ord })),
    tmpls: Array.from({ length: tmplCount }, (_, ord) => ({
      name: `Card ${ord + 1}`,
      ord,
      qfmt: `original-q-${ord}`,
      afmt: `original-a-${ord}`,
    })),
  };
}

describe("applyRazbiramStyle", () => {
  it("restyles the CSS of every model, whatever its type", () => {
    const input = [model("Basic", ["Front", "Back"]), model("Cloze", ["Text", "Extra"])];
    const { styled } = applyRazbiramStyle(input);
    for (const m of styled) expect(m.css).toBe(RAZBIRAM_CARD_CSS);
  });

  it("never mutates the input", () => {
    const input = [model("Basic", ["Front", "Back"])];
    applyRazbiramStyle(input);
    expect(input[0].css).toBe(".card { color: rebeccapurple; }");
    expect(input[0].tmpls[0].qfmt).toBe("original-q-0");
  });

  it("returns the originals verbatim so the toggle can switch back", () => {
    const input = [model("Basic", ["Front", "Back"]), model("Cloze", ["Text", "Extra"])];
    const { originals } = applyRazbiramStyle(input);
    expect(originals).toHaveLength(2);
    expect(originals.map((m) => m.css)).toEqual(input.map((m) => m.css));
    expect(originals[0].tmpls[0].qfmt).toBe("original-q-0");
  });

  it("replaces the templates of a two-field flashcard, using its real field names", () => {
    const { styled } = applyRazbiramStyle([model("Basic", ["Vorderseite", "Rückseite"])]);
    expect(styled[0].tmpls[0].qfmt).toContain("{{Vorderseite}}");
    expect(styled[0].tmpls[0].afmt).toContain("{{Rückseite}}");
    expect(styled[0].tmpls[0].afmt).toContain('<hr id="answer">');
  });

  it("asks the other way round on the second card of a reversed model", () => {
    const { styled } = applyRazbiramStyle([model("Basic (and reversed card)", ["Front", "Back"], 2)]);
    expect(styled[0].tmpls[0].qfmt).toContain("{{Front}}");
    expect(styled[0].tmpls[1].qfmt).toContain("{{Back}}");
  });

  it("keeps the templates of a model with more than two fields — nothing may fall off the card", () => {
    const vocab = model("razbiram Vokabeln", ["Word", "Gloss", "Band", "POS", "Example"]);
    const { styled } = applyRazbiramStyle([vocab]);
    expect(styled[0].tmpls[0].qfmt).toBe("original-q-0");
    expect(styled[0].css).toBe(RAZBIRAM_CARD_CSS);
  });

  it("keeps the templates of cloze and image-occlusion models", () => {
    const { styled } = applyRazbiramStyle([
      model("Cloze", ["Text", "Extra"]),
      model("Image Occlusion", ["Question Mask", "Answer Mask", "Original Mask"]),
    ]);
    expect(styled[0].tmpls[0].qfmt).toBe("original-q-0");
    expect(styled[1].tmpls[0].qfmt).toBe("original-q-0");
  });

  it("only offers to restyle templates where that is safe", () => {
    expect(canRestyleTemplates(model("Basic", ["Front", "Back"]))).toBe(true);
    expect(canRestyleTemplates(model("Cloze", ["Text", "Extra"]))).toBe(false);
    expect(canRestyleTemplates(model("Vokabeln", ["A", "B", "C"]))).toBe(false);
  });

  it("signs the back of the card — and only the back", () => {
    const { styled } = applyRazbiramStyle([model("Basic", ["Front", "Back"])]);
    const [tmpl] = styled[0].tmpls;
    expect(tmpl.afmt).toContain(RAZBIRAM_URL);
    expect(tmpl.afmt).toContain(RAZBIRAM_TAGLINE);
    expect(tmpl.qfmt).not.toContain(RAZBIRAM_URL);
  });

  it("carries the razbiram identity notice into every downloaded deck", () => {
    expect(RAZBIRAM_CARD_CSS).toContain("© razbiram.com");
  });

  it("keeps the CEFR scale identical to the Studio", () => {
    // A1 emerald … C2 amber — BIBLE §2.5. A drift here breaks the family face.
    expect(RAZBIRAM_CARD_CSS).toContain("--rz-A1-bg: #d1fae5; --rz-A1-fg: #047857;");
    expect(RAZBIRAM_CARD_CSS).toContain("--rz-C2-bg: #fef3c7; --rz-C2-fg: #b45309;");
  });
});
