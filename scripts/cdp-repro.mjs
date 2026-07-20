/* Drive headless Chrome via CDP to capture real console + exceptions while the
 * repro page converts an .apkg. Usage: node scripts/cdp-repro.mjs <chromePath> <url> <seconds> */
const [, , CHROME, URL, SECS = "30"] = process.argv;
const { spawn } = await import("node:child_process");
const port = 9333;
const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`,
  "--user-data-dir=/tmp/cdp-repro-profile", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://localhost:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no CDP target");
}

const ws = new WebSocket(await getWsUrl());
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
const t0 = Date.now();
const ts = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;

await new Promise((res) => (ws.onopen = res));
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a.preview ?? {})).join(" ");
    console.log(`${ts()} [console.${msg.params.type}] ${text}`);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const e = msg.params.exceptionDetails;
    console.log(`${ts()} [EXCEPTION] ${e.exception?.description ?? e.text}`);
  } else if (msg.method === "Log.entryAdded") {
    const e = msg.params.entry;
    console.log(`${ts()} [log.${e.level}] ${e.text} ${e.url ?? ""}`);
  }
};
send("Runtime.enable");
send("Log.enable");
send("Page.enable");
await sleep(300);
console.log(`${ts()} navigating to ${URL}`);
send("Page.navigate", { url: URL });

// Poll the #out element text every second so we see progress / final state.
await sleep(500);
let last = "";
const deadline = Date.now() + Number(SECS) * 1000;
while (Date.now() < deadline) {
  send("Runtime.evaluate", { expression: "document.getElementById('out')?.textContent || '(no #out)'", returnByValue: true });
  await sleep(1000);
}
// one final read via a fresh promise
await new Promise((res) => {
  const rid = ++id;
  const h = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id === rid) { console.log(`${ts()} FINAL #out: ${String(m.result?.result?.value).slice(0, 800)}`); ws.removeEventListener("message", h); res(); }
  };
  ws.addEventListener("message", h);
  ws.send(JSON.stringify({ id: rid, method: "Runtime.evaluate", params: { expression: "document.getElementById('out')?.textContent || '(no #out)'", returnByValue: true } }));
});
chrome.kill();
process.exit(0);
