/*
 * razbiram Anki card theme.
 *
 * © razbiram.com — the visual identity (warm palette, coral accent, Manrope type,
 * the CEFR scale and the razb·i·ram wordmark) is razbiram product IP and is NOT
 * covered by this repo's MIT licence. It ships inside every styled deck a student
 * downloads. Attribute it; do not relicense it. See LICENSE and src/styles.css.
 *
 * Supersedes the colour and font layer of the frozen forward bridge in
 * legacy/src/razbiram_anki/templates.py while keeping all of its `rz-*` class
 * names, so a deck built by either path looks like the same product.
 *
 * No @font-face and no network: Anki cards render offline, so the brand stack
 * falls back to the platform UI font (Roboto / Segoe UI / Helvetica), each of
 * which covers Cyrillic in full.
 */

/** The razbiram look, as one note-model `css` string. */
export const RAZBIRAM_CARD_CSS = `/* razbiram card theme — © razbiram.com, not covered by this deck's MIT licence. */

.card {
  --rz-bg:           #faf7f4;
  --rz-surface:      #ffffff;
  --rz-surface-2:    #fbf4f1;
  --rz-text:         #221b16;
  --rz-muted:        rgba(34, 27, 22, 0.58);
  --rz-faint:        rgba(34, 27, 22, 0.38);
  --rz-primary:      #e2533c;
  --rz-primary-soft: rgba(226, 83, 60, 0.12);
  --rz-primary-tint: rgba(226, 83, 60, 0.14);
  --rz-hairline:     rgba(34, 27, 22, 0.10);
  --rz-hairline-2:   rgba(34, 27, 22, 0.08);

  /* CEFR scale — identical to the Studio (razbiram-nlp/web/src/styles.css). */
  --rz-A1-bg: #d1fae5; --rz-A1-fg: #047857;
  --rz-A2-bg: #ccfbf1; --rz-A2-fg: #0f766e;
  --rz-B1-bg: #dbeafe; --rz-B1-fg: #1d4ed8;
  --rz-B2-bg: #e0e7ff; --rz-B2-fg: #4338ca;
  --rz-C1-bg: #ede9fe; --rz-C1-fg: #6d28d9;
  --rz-C2-bg: #fef3c7; --rz-C2-fg: #b45309;
}

/* Anki Desktop marks night mode with .nightMode, AnkiDroid with .night_mode —
   and either may land on the .card element itself or on an ancestor. */
.nightMode .card, .nightMode.card,
.night_mode .card, .night_mode.card {
  --rz-bg:           #17120f;
  --rz-surface:      #1f1815;
  --rz-surface-2:    #271d18;
  --rz-text:         #f3ece7;
  --rz-muted:        rgba(243, 236, 231, 0.60);
  --rz-faint:        rgba(243, 236, 231, 0.38);
  --rz-primary:      #ef6144;
  --rz-primary-soft: rgba(239, 97, 68, 0.16);
  --rz-primary-tint: rgba(239, 97, 68, 0.18);
  --rz-hairline:     rgba(243, 236, 231, 0.14);
  --rz-hairline-2:   rgba(243, 236, 231, 0.09);

  --rz-A1-bg: rgba(16, 185, 129, 0.18); --rz-A1-fg: #6ee7b7;
  --rz-A2-bg: rgba(20, 184, 166, 0.18); --rz-A2-fg: #5eead4;
  --rz-B1-bg: rgba(59, 130, 246, 0.20); --rz-B1-fg: #93c5fd;
  --rz-B2-bg: rgba(99, 102, 241, 0.22); --rz-B2-fg: #a5b4fc;
  --rz-C1-bg: rgba(139, 92, 246, 0.22); --rz-C1-fg: #c4b5fd;
  --rz-C2-bg: rgba(245, 158, 11, 0.20); --rz-C2-fg: #fcd34d;
}

.card {
  font-family: "Manrope", "Nunito", ui-sans-serif, system-ui, -apple-system,
               "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 18px;
  line-height: 1.55;
  color: var(--rz-text);
  background: var(--rz-bg);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Flex column so the signature can be docked to the bottom of the card. */
.rz-card {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 20px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  text-align: center;
}

.rz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  min-height: 26px;
  gap: 8px;
}

.rz-type-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 3px 10px;
  background: var(--rz-surface);
  color: var(--rz-muted);
  border: 1px solid var(--rz-hairline);
  flex-shrink: 0;
}

/* Two ways to set the band: a static rz-badge-A1 class (when the deck has a
   CEFR field) or data-cefr, which the template's script derives from the tags. */
.rz-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  border-radius: 999px;
  padding: 3px 10px;
  background: transparent;
  color: transparent;
  flex-shrink: 0;
}
.rz-badge-A1, .rz-badge[data-cefr="A1"] { background: var(--rz-A1-bg); color: var(--rz-A1-fg); }
.rz-badge-A2, .rz-badge[data-cefr="A2"] { background: var(--rz-A2-bg); color: var(--rz-A2-fg); }
.rz-badge-B1, .rz-badge[data-cefr="B1"] { background: var(--rz-B1-bg); color: var(--rz-B1-fg); }
.rz-badge-B2, .rz-badge[data-cefr="B2"] { background: var(--rz-B2-bg); color: var(--rz-B2-fg); }
.rz-badge-C1, .rz-badge[data-cefr="C1"] { background: var(--rz-C1-bg); color: var(--rz-C1-fg); }
.rz-badge-C2, .rz-badge[data-cefr="C2"] { background: var(--rz-C2-bg); color: var(--rz-C2-fg); }

.rz-word {
  font-size: clamp(26px, 6vw, 38px);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.20;
  color: var(--rz-text);
  word-break: break-word;
}

.rz-prompt {
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rz-muted);
  margin-bottom: 0.5rem;
}

.rz-gloss {
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 600;
  line-height: 1.35;
  margin: 0.35rem 0;
  word-break: break-word;
}

.rz-lemma { font-size: 0.95rem; margin-top: 0.45rem; color: var(--rz-muted); }
.rz-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--rz-faint);
}
.rz-morph { font-style: italic; color: var(--rz-muted); }
.rz-muted { color: var(--rz-muted); }
.rz-source { font-size: 0.76rem; margin-top: 0.9rem; color: var(--rz-faint); }

.rz-meta {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.rz-pos {
  font-size: 0.70rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--rz-muted);
  background: var(--rz-surface-2);
  border-radius: 6px;
  padding: 0.12rem 0.55rem;
  border: 1px solid var(--rz-hairline);
}

.rz-example { font-size: 1.05rem; margin-top: 0.7rem; line-height: 1.55; }
.rz-example .target {
  font-weight: 700;
  color: var(--rz-text);
  background: var(--rz-primary-tint);
  border-radius: 4px;
  /* The negative margin cancels the padding for layout, so the highlight can
     breathe without opening a gap before the following comma or full stop. */
  padding: 0.05rem 0.2rem;
  margin: 0 -0.14rem;
}
.rz-example .cloze, .cloze {
  color: var(--rz-primary);
  font-weight: 700;
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-color: var(--rz-primary);
  text-underline-offset: 3px;
}

/* Styles both our own divider and the one Anki injects into every answer. */
hr.rz-rule, hr#answer {
  border: none;
  height: 2px;
  background: linear-gradient(to right, transparent 0%, var(--rz-primary) 25%,
                              var(--rz-primary) 75%, transparent 100%);
  opacity: 0.40;
  margin: 18px auto;
  width: 100%;
}

/* The question owns the space above the fold on the front; on the back it
   shrinks to a reminder so the answer leads. */
.rz-question {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 0 32px;
}
.rz-question-text {
  font-size: clamp(22px, 5.5vw, 36px);
  font-weight: 700;
  line-height: 1.22;
  color: var(--rz-text);
  word-break: break-word;
}
.rz-question--compact { flex: 0; padding: 4px 0 12px; }
.rz-question--compact .rz-question-text {
  font-size: clamp(15px, 3.5vw, 20px);
  font-weight: 600;
  color: var(--rz-muted);
}

.rz-answer {
  font-size: clamp(20px, 4.5vw, 30px);
  font-weight: 600;
  line-height: 1.30;
  color: var(--rz-text);
  word-break: break-word;
}

.rz-extra {
  margin-top: 18px;
  font-size: 14px;
  color: var(--rz-muted);
  line-height: 1.55;
  word-break: break-word;
}

img { max-width: 100%; height: auto; border-radius: 10px; display: block; margin: 12px auto; }
svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
audio { display: block; margin: 10px auto; width: 100%; max-width: 380px; }

.rz-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 18px;
  justify-content: center;
}
.rz-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--rz-surface);
  color: var(--rz-faint);
  border: 1px solid var(--rz-hairline);
}

/* margin-top:auto docks the signature to the bottom of the flex column. */
.rz-wordmark {
  margin-top: auto;
  padding-top: 24px;
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--rz-faint);
  user-select: none;
  -webkit-user-select: none;
}
.rz-wordmark .rz-dot { color: var(--rz-primary); opacity: 0.65; }
.rz-wordmark a { color: inherit; text-decoration: none; }
.rz-wordmark .rz-tagline { font-weight: 600; }

/* Baseline for arbitrary HTML that comes out of a student's own deck. */
* { box-sizing: border-box; }
table { border-collapse: collapse; width: 100%; overflow-x: auto; display: block; }
td, th { padding: 6px 8px; border: 1px solid var(--rz-hairline); font-size: 14px; }
b, strong { font-weight: 700; }
i, em { font-style: italic; }
a { color: var(--rz-primary); }
code, pre {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
  font-size: 13px;
  background: var(--rz-surface-2);
  border-radius: 5px;
  padding: 2px 5px;
}
`;

/** The one place the platform is described to students. Reword here only.
 *
 *  Deliberately carries **no price claim**. These cards travel: they end up in
 *  other people's Anki collections and get shared on, and they keep saying
 *  whatever they say for years. A "free" promise would outlive the pricing it
 *  describes. What is free today belongs on the pricing page, which can change;
 *  the card gets the part that stays true. */
export const RAZBIRAM_TAGLINE = "Bulgarisch lernen";

export const RAZBIRAM_URL = "https://razbiram.com";

/** The signature: back face only, docked to the bottom, quiet. A real link —
 *  Anki Desktop, AnkiDroid and AnkiMobile all open it in the system browser —
 *  that still reads as plain text ("razb·i·ram — Kostenlos für Lernende") if a
 *  client strips link styling. */
export const RAZBIRAM_SIGNATURE = `<div class="rz-wordmark">
  <a href="${RAZBIRAM_URL}" target="_blank" rel="noopener">razb<span class="rz-dot">·i·</span>ram</a>
  <span class="rz-tagline">— ${RAZBIRAM_TAGLINE}</span>
</div>`;

/** Derives the CEFR band from the note's tags and renders the tag pills.
 *  The tags are read from a hidden element's `textContent`, never interpolated
 *  into a JS string literal — a tag with a quote in it would otherwise break the
 *  whole script and blank the card. ES5 only: AnkiDroid's webview is old. */
export const RAZBIRAM_CARD_SCRIPT = `<div id="rz-tags-src" style="display:none">{{Tags}}</div>
<script>
(function () {
  var src = document.getElementById("rz-tags-src");
  var raw = src ? src.textContent : "";
  var levels = ["C2", "C1", "B2", "B1", "A2", "A1"];
  var band = null;
  for (var i = 0; i < levels.length; i++) {
    if (new RegExp("(?:^|[\\\\s:_-])" + levels[i] + "(?:[\\\\s:_-]|$)", "i").test(raw)) {
      band = levels[i];
      break;
    }
  }
  var badge = document.querySelector(".rz-badge[data-cefr-slot]");
  if (badge) {
    if (band) { badge.setAttribute("data-cefr", band); badge.textContent = band; }
    else { badge.style.display = "none"; }
  }
  var box = document.querySelector(".rz-tags");
  if (box) {
    var skip = { suspend: 1, marked: 1, leech: 1 };
    var tags = [];
    var parts = raw.replace(/^\\s+|\\s+$/g, "").split(/\\s+/);
    for (var k = 0; k < parts.length; k++) {
      if (parts[k] && !skip[parts[k].toLowerCase()]) tags.push(parts[k]);
    }
    if (!tags.length) { box.style.display = "none"; }
    else {
      for (var j = 0; j < tags.length; j++) {
        var pill = document.createElement("span");
        pill.className = "rz-tag";
        pill.textContent = tags[j].replace(/_/g, " ");
        box.appendChild(pill);
      }
    }
  }
})();
</script>`;
