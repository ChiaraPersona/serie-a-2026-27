const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const [url, output, widthArg = "390", heightArg = "844"] = process.argv.slice(2);
if (!url || !output) throw new Error("Uso: node scripts/capture-responsive-page.js <url> <output> [width] [height]");
const width = Number(widthArg), height = Number(heightArg);
const browser = ["C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(fs.existsSync);
if (!browser) throw new Error("Microsoft Edge non trovato");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function port() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
}

async function json(address) {
  let error;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(address); if (response.ok) return response.json(); error = new Error(`HTTP ${response.status}`); } catch (caught) { error = caught; }
    await sleep(100);
  }
  throw error;
}

class Cdp {
  constructor(address) {
    this.socket = new WebSocket(address);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(String(event.data));
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
    });
  }
  async call(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }
}

(async () => {
  const debugPort = await port();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "codex-responsive-"));
  const process = spawn(browser, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--no-first-run", "about:blank"], { stdio: "ignore", windowsHide: true });
  let client;
  try {
    await json(`http://127.0.0.1:${debugPort}/json/version`);
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
    const target = await response.json();
    client = new Cdp(target.webSocketDebuggerUrl);
    await client.call("Page.enable");
    await client.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height });
    await client.call("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await client.call("Page.navigate", { url });
    await sleep(3500);
    const dimensions = await client.call("Runtime.evaluate", { expression: "({innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth})", returnByValue: true });
    const screenshot = await client.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
    fs.writeFileSync(output, Buffer.from(screenshot.data, "base64"));
    console.log(JSON.stringify(dimensions.result.value));
  } finally {
    if (client) await client.call("Browser.close").catch(() => {});
    if (!process.killed) process.kill();
    await sleep(300);
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
