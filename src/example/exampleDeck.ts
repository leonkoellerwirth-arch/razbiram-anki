/** The razbiram example deck — what a student downloads before they have converted
 *  anything, to see what the style looks like in their own Anki.
 *
 *  Six words, three CEFR bands, German glosses. BIBLE §8 governs the content: every
 *  Bulgarian entry is a high-frequency word whose form and example sentence are
 *  verifiable, and each example is a complete, ordinary sentence rather than a
 *  constructed fragment. Where there was any doubt, the entry was left out — a
 *  shorter deck is better than a wrong one. */

import { deterministicUuid } from "../crowdanki/uuid";
import type { CrowdAnkiDeck, CrowdAnkiNote, CrowdAnkiNoteModel } from "../crowdanki/types";
import { RAZBIRAM_CARD_CSS, RAZBIRAM_CARD_SCRIPT, RAZBIRAM_SIGNATURE } from "../style/cardTheme";

export const EXAMPLE_DECK_NAME = "razbiram · Beispiele";

const NS = "razbiram-anki/example";
const FIELDS = ["Word", "Gloss", "Band", "POS", "Lemma", "Morph", "Example"] as const;

interface Entry {
  word: string;
  gloss: string;
  band: "A1" | "A2" | "B1";
  pos: string;
  lemma: string;
  morph: string;
  /** The target word is wrapped in `.target` so the theme can highlight it. */
  example: string;
}

const ENTRIES: Entry[] = [
  {
    word: "книга",
    gloss: "das Buch",
    band: "A1",
    pos: "Substantiv",
    lemma: "книга",
    morph: "Femininum · Singular",
    example: 'Тя чете <span class="target">книга</span>.',
  },
  {
    word: "вода",
    gloss: "das Wasser",
    band: "A1",
    pos: "Substantiv",
    lemma: "вода",
    morph: "Femininum · Singular",
    example: 'Искам <span class="target">вода</span>, моля.',
  },
  {
    word: "чета",
    gloss: "lesen",
    band: "A1",
    pos: "Verb",
    lemma: "чета",
    // Bulgarian has no infinitive; dictionaries cite the 1st person singular.
    morph: "1. Person Singular · Präsens",
    example: 'Аз <span class="target">чета</span> всеки ден.',
  },
  {
    word: "университет",
    gloss: "die Universität",
    band: "A2",
    pos: "Substantiv",
    lemma: "университет",
    morph: "Maskulinum · Singular",
    // After a preposition the masculine noun takes the short definite article -а.
    example: 'Той учи в <span class="target">университета</span>.',
  },
  {
    word: "красив",
    gloss: "schön",
    band: "A2",
    pos: "Adjektiv",
    lemma: "красив",
    morph: "Maskulinum · unbestimmt",
    example: 'Това е <span class="target">красив</span> град.',
  },
  {
    word: "възможност",
    gloss: "die Möglichkeit",
    band: "B1",
    pos: "Substantiv",
    lemma: "възможност",
    morph: "Femininum · Singular",
    example: 'Това е добра <span class="target">възможност</span>.',
  },
];

/** The example deck as a CrowdAnki deck — the same shape a conversion produces,
 *  so it flows through the existing preview, `deck.json` and `.apkg` paths. */
export function buildExampleDeck(): CrowdAnkiDeck {
  const model = buildModel();
  return {
    __type__: "Deck",
    crowdanki_uuid: deterministicUuid(NS, "deck"),
    name: EXAMPLE_DECK_NAME,
    desc: "Sechs bulgarische Wörter im razbiram-Stil — zum Ausprobieren.",
    media_files: [],
    note_models: [model],
    notes: ENTRIES.map((entry) => toNote(entry, model.crowdanki_uuid)),
    children: [],
  };
}

function toNote(entry: Entry, modelUuid: string): CrowdAnkiNote {
  return {
    __type__: "Note",
    guid: deterministicUuid(NS, `note/${entry.word}`),
    note_model_uuid: modelUuid,
    fields: [entry.word, entry.gloss, entry.band, entry.pos, entry.lemma, entry.morph, entry.example],
    tags: ["razbiram", `razbiram::${entry.band}`],
  };
}

function buildModel(): CrowdAnkiNoteModel {
  return {
    __type__: "NoteModel",
    crowdanki_uuid: deterministicUuid(NS, "model"),
    name: "razbiram Vokabeln",
    css: RAZBIRAM_CARD_CSS,
    flds: FIELDS.map((name, ord) => ({ name, ord })),
    tmpls: [
      { name: "Erkennen (BG → DE)", ord: 0, ...recognizeTemplates() },
      { name: "Produzieren (DE → BG)", ord: 1, ...produceTemplates() },
    ],
  };
}

/** Header with the CEFR badge set statically — the deck knows its own band, so
 *  no script is needed to derive it. */
const HEADER = `  <div class="rz-header">
    <span class="rz-type-chip">Vokabel</span>
    <span class="rz-badge rz-badge-{{Band}}">{{Band}}</span>
  </div>`;

/** Lemma, morphology, part of speech and the example sentence — the detail that
 *  belongs on the answer, never on the question. */
const DETAIL = `  <div class="rz-meta"><span class="rz-pos">{{POS}}</span></div>
  {{#Morph}}<div class="rz-lemma"><span class="rz-morph">{{Morph}}</span></div>{{/Morph}}
  {{#Example}}<div class="rz-example">{{Example}}</div>{{/Example}}
  <div class="rz-tags"></div>
${RAZBIRAM_SIGNATURE}`;

function recognizeTemplates(): { qfmt: string; afmt: string } {
  return {
    qfmt: `<div class="rz-card">
${HEADER}
  <div class="rz-question">
    <div class="rz-word">{{Word}}</div>
  </div>
</div>`,
    afmt: `<div class="rz-card">
${HEADER}
  <div class="rz-question rz-question--compact">
    <div class="rz-question-text">{{Word}}</div>
  </div>
  <hr id="answer">
  <div class="rz-gloss">{{Gloss}}</div>
${DETAIL}
</div>
${RAZBIRAM_CARD_SCRIPT}`,
  };
}

function produceTemplates(): { qfmt: string; afmt: string } {
  return {
    qfmt: `<div class="rz-card">
${HEADER}
  <div class="rz-question">
    <div class="rz-prompt">Wie heißt das auf Bulgarisch?</div>
    <div class="rz-question-text">{{Gloss}}</div>
  </div>
</div>`,
    afmt: `<div class="rz-card">
${HEADER}
  <div class="rz-question rz-question--compact">
    <div class="rz-question-text">{{Gloss}}</div>
  </div>
  <hr id="answer">
  <div class="rz-word">{{Word}}</div>
${DETAIL}
</div>
${RAZBIRAM_CARD_SCRIPT}`,
  };
}
