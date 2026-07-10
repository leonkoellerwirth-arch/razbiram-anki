import initSqlJs, { type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

/** Load (and cache) the sql.js WASM module in the browser. Vite fingerprints and
 *  serves the wasm from our own origin, so nothing is fetched from a CDN — the
 *  whole conversion stays local, in the student's browser. Tests initialise
 *  sql.js themselves (reading the wasm from disk), so they never import this. */
let cached: Promise<SqlJsStatic> | null = null;

export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!cached) cached = initSqlJs({ locateFile: () => wasmUrl });
  return cached;
}
