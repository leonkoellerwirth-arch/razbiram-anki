/** Applying the razbiram look to a deck we did not design.
 *
 *  A student's `.apkg` carries note models with field names we have never seen, so
 *  the safe unit of restyling is the **CSS**: it re-skins any card without touching
 *  what is on it. Templates are only rewritten where we can be certain nothing is
 *  lost — a model with exactly two fields, which is unambiguously front/back.
 *
 *  Deliberately narrower than "every model `detectCardType` calls a flashcard":
 *  that classifier answers "flashcard" for anything it cannot place, including
 *  9-field vocabulary models. Rewriting those to a two-sided card would silently
 *  drop example sentences and CEFR fields off the card. CSS-only is the honest
 *  default; the student's own layout survives. */

import { cardTypeLabel, detectCardType } from "../crowdanki/cardType";
import type { CrowdAnkiNoteModel } from "../crowdanki/types";
import { RAZBIRAM_CARD_CSS, RAZBIRAM_CARD_SCRIPT, RAZBIRAM_SIGNATURE } from "./cardTheme";

export interface StyledModels {
  styled: CrowdAnkiNoteModel[];
  /** The untouched input, same order — the toggle switches back to these. */
  originals: CrowdAnkiNoteModel[];
}

/** Restyle every note model. Never mutates the input. */
export function applyRazbiramStyle(models: CrowdAnkiNoteModel[]): StyledModels {
  return {
    styled: models.map(styleModel),
    originals: models.map((m) => ({ ...m, tmpls: [...m.tmpls], flds: [...m.flds] })),
  };
}

/** True when we may replace the templates: exactly two fields, so field 0 is the
 *  question and field 1 the answer, with nothing else on the note to lose. */
export function canRestyleTemplates(model: CrowdAnkiNoteModel): boolean {
  return model.flds.length === 2 && detectCardType(model.name, model.flds.map((f) => f.name)) === "flashcard";
}

function styleModel(model: CrowdAnkiNoteModel): CrowdAnkiNoteModel {
  const styled: CrowdAnkiNoteModel = { ...model, css: RAZBIRAM_CARD_CSS };
  if (!canRestyleTemplates(model)) return { ...styled, tmpls: [...model.tmpls] };

  const label = cardTypeLabel(detectCardType(model.name, model.flds.map((f) => f.name)));
  const [front, back] = model.flds.map((f) => f.name);
  return {
    ...styled,
    tmpls: model.tmpls.map((tmpl, ord) => ({
      ...tmpl,
      ord,
      // Card 2 of a reversed model asks the other way round; keep that meaning.
      ...(ord === 0
        ? razbiramTemplates(label, front, back)
        : razbiramTemplates(label, back, front)),
    })),
  };
}

/** The two-sided razbiram card: a calm front, and a back where the question
 *  recedes so the answer leads. The signature sits on the back only. */
export function razbiramTemplates(
  typeLabel: string,
  frontField: string,
  backField: string,
): { qfmt: string; afmt: string } {
  const header = `  <div class="rz-header">
    <span class="rz-type-chip">${typeLabel}</span>
    <span class="rz-badge" data-cefr-slot="1"></span>
  </div>`;
  return {
    qfmt: `<div class="rz-card">
${header}
  <div class="rz-question">
    <div class="rz-question-text">{{${frontField}}}</div>
  </div>
</div>
${RAZBIRAM_CARD_SCRIPT}`,
    afmt: `<div class="rz-card">
${header}
  <div class="rz-question rz-question--compact">
    <div class="rz-question-text">{{${frontField}}}</div>
  </div>
  <hr id="answer">
  <div class="rz-answer">{{${backField}}}</div>
  <div class="rz-tags"></div>
${RAZBIRAM_SIGNATURE}
</div>
${RAZBIRAM_CARD_SCRIPT}`,
  };
}
