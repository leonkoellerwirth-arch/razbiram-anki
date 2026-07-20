/** The guide, in the app rather than in a file nobody opens.
 *
 *  The students using this are often 13–18 and have never exported anything from
 *  any program. So: no jargon without an explanation next to it, one action per
 *  step, and the two things that actually go wrong (an empty export, and looking
 *  for the file in the wrong place) answered before they happen. */

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "In Anki das Deck exportieren",
    body: (
      <>
        Öffne Anki am Computer. Klicke mit der rechten Maustaste auf dein Deck →{" "}
        <b>Exportieren</b>. Wähle oben <b>„Anki-Deck-Paket (.apkg)“</b> und setze
        das Häkchen bei <b>„Unterdecks einschließen“</b>. Dann auf <b>Exportieren</b>{" "}
        und dir merken, wohin du speicherst — meistens der Ordner{" "}
        <b>Downloads</b>.
      </>
    ),
  },
  {
    title: "Die Datei hier hereinziehen",
    body: (
      <>
        Zieh die gespeicherte Datei oben in das gestrichelte Feld — oder klick das
        Feld an und such sie aus. Sie endet auf <code>.apkg</code>. Deine Karten
        bleiben dabei auf deinem Gerät: nichts wird hochgeladen, nichts wird
        gespeichert.
      </>
    ),
  },
  {
    title: "Ansehen und herunterladen",
    body: (
      <>
        Du siehst sofort, wie viele Karten gefunden wurden. Setz das Häkchen bei{" "}
        <b>razbiram-Stil anwenden</b>, wenn deine Karten im razbiram-Design
        aussehen sollen. Dann lädst du sie herunter: <b>.apkg für Anki</b> — zum
        Doppelklicken, landet direkt in deinem Anki. Das ist der Weg, auf dem du
        den razbiram-Stil auch wirklich siehst.
      </>
    ),
  },
];

const HELP: { q: string; a: React.ReactNode }[] = [
  {
    q: "Es heißt „0 Karten gefunden“ — was nun?",
    a: (
      <>
        Fast immer ist beim Export das falsche Deck erwischt worden. Schau in Anki
        auf die Zahl neben dem Deck-Namen: Sie muss <b>größer als 0</b> sein.
        Liegen deine Karten in Unterdecks, exportiere das <b>Ober-Deck</b> und setz
        das Häkchen bei <b>„Unterdecks einschließen“</b>.
      </>
    ),
  },
  {
    q: "Ich finde die exportierte Datei nicht.",
    a: (
      <>
        Sie liegt dort, wo Anki beim Speichern hingezeigt hat — meistens im Ordner{" "}
        <b>Downloads</b>. Sortiere den Ordner nach Datum, dann steht sie ganz oben.
      </>
    ),
  },
  {
    q: "Wie kommen die Karten wieder in mein Anki?",
    a: (
      <>
        Lade sie hier als <b>.apkg</b> herunter und mach einen <b>Doppelklick</b>{" "}
        darauf — Anki öffnet sich und fügt sie ein. Karten, die du schon hast,
        werden dabei aktualisiert und nicht doppelt angelegt.
      </>
    ),
  },
  {
    q: "Geht das auch auf dem Handy?",
    a: (
      <>
        Zum Umwandeln brauchst du einen Computer, weil du die Datei aus Anki
        exportieren musst. Die fertigen Karten kannst du danach ganz normal auf dem
        Handy lernen.
      </>
    ),
  },
  {
    q: "Und was ist die deck.json?",
    a: (
      <>
        Das ist das Format, in dem razbiram.com seine Decks liest. Ein eigener
        Upload dort ist noch in Arbeit — bis dahin ist die Datei vor allem für
        Lehrkräfte und für razbiram selbst nützlich. Für dein eigenes Lernen
        nimmst du die <b>.apkg</b>.
      </>
    ),
  },
  {
    q: "Kostet das etwas?",
    a: (
      <>
        Nein. Dieses Werkzeug ist kostenlos und quelloffen, und razbiram.com ist für
        Lernende kostenlos.
      </>
    ),
  },
];

export function Guide() {
  return (
    <section id="anleitung" style={{ marginTop: 40, scrollMarginTop: 20 }}>
      <h2 style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
        So geht’s — in drei Schritten
      </h2>
      <p className="rz-muted" style={{ margin: "0 0 18px", fontSize: 15 }}>
        Du brauchst nichts zu installieren und dich nirgends anzumelden.
      </p>

      <ol className="rz-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rz-step">
            <span className="rz-step-num rz-numeral" aria-hidden="true">{i + 1}</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{step.title}</div>
              <div className="rz-muted" style={{ fontSize: 15 }}>{step.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <h2 style={{ fontSize: 22, margin: "32px 0 12px", letterSpacing: "-0.01em" }}>
        Wenn etwas klemmt
      </h2>
      <div style={{ display: "grid", gap: 8 }}>
        {HELP.map((item) => (
          <details key={item.q} className="rz-faq">
            <summary>{item.q}</summary>
            <div className="rz-muted" style={{ fontSize: 15, marginTop: 8 }}>{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
