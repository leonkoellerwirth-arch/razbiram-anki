/* Local repro harness: run the REAL browser pipeline against a real .apkg on disk.
 * Usage: node_modules/.bin/vite-node scripts/try-apkg.mts -- "<path-to.apkg>"
 * Prints the real error + stack (the UI only shows a generic message). */
import { readFileSync } from "node:fs";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { parseApkg } from "../src/apkg/parse";
import { buildDeckJson } from "../src/crowdanki/deckJson";
import { summarize } from "../src/crowdanki/summary";

const path = process.argv.slice(2).filter((a) => a !== "--")[0];
if (!path) {
  console.error("usage: vite-node scripts/try-apkg.mts -- <file.apkg>");
  process.exit(2);
}

async function loadSql(): Promise<SqlJsStatic> {
  const file = readFileSync("node_modules/sql.js/dist/sql-wasm.wasm");
  const wasmBinary = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  return initSqlJs({ wasmBinary });
}

try {
  const SQL = await loadSql();
  const buf = readFileSync(path);
  const parsed = await parseApkg(buf, SQL);
  console.log("schemaVersion:", parsed.schemaVersion);
  console.log("collectionEntry:", parsed.collectionEntry);
  console.log("models:", parsed.models.size);
  console.log("notes:", parsed.notes.length);
  console.log("decks:", parsed.deckNames.length, parsed.deckNames.slice(0, 5));
  console.log("media:", parsed.media.length);
  if (parsed.notes.length === 0) {
    console.log("RESULT: 0 notes → UI would show the 'keine Karten' error.");
  } else {
    const deck = buildDeckJson(parsed, "test");
    const s = summarize(deck);
    console.log("RESULT: OK — totalNotes", s.totalNotes, "models", s.modelCount, "cardTypes", s.cardTypes.join(","), "decks", s.deckNames.length);
  }
} catch (err) {
  console.error("FAILED:", err instanceof Error ? err.stack : err);
  process.exit(1);
}
