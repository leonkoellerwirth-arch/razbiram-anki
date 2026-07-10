/** Card-type detection, mirroring razbiram.com's `generate_manifests.py`
 *  (`detect_model_type` / patterns.json) field-for-field, so the type razbiram-anki
 *  previews is the type the platform will assign. Keep the two in lock-step. */

export type CardType = "image-occlusion" | "cloze" | "mcq" | "flashcard";

const NAME_CONTAINS: [needle: string, type: CardType][] = [
  ["Image Occlusion", "image-occlusion"],
  ["Bildverdeckung", "image-occlusion"],
  ["Cloze", "cloze"],
];

const FIELD_SETS: { required: string[]; type: CardType }[] = [
  { required: ["Question Mask", "Answer Mask", "Original Mask"], type: "image-occlusion" },
  { required: ["Verdeckung", "Bild"], type: "image-occlusion" },
  { required: ["OptionA", "OptionB", "Correct"], type: "mcq" },
  { required: ["Question", "OptionA", "Correct"], type: "mcq" },
];

export function detectCardType(modelName: string, fieldNames: string[]): CardType {
  for (const [needle, type] of NAME_CONTAINS) {
    if (modelName.includes(needle)) return type;
  }
  for (const rule of FIELD_SETS) {
    if (rule.required.every((f) => fieldNames.includes(f))) return rule.type;
  }
  if (fieldNames.length === 2) return "flashcard";
  return "flashcard";
}

const LABELS: Record<CardType, string> = {
  "image-occlusion": "Bildverdeckung",
  cloze: "Lückentext",
  mcq: "Multiple Choice",
  flashcard: "Karteikarte",
};

export function cardTypeLabel(type: CardType): string {
  return LABELS[type];
}
