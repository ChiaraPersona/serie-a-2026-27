const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_BROWSER_PATHS = [
  process.env.SISAL_BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].filter(Boolean);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function findBrowserExecutable() {
  const executable = DEFAULT_BROWSER_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    throw new Error("Chrome o Edge non trovato. Imposta SISAL_BROWSER_PATH con il percorso del browser.");
  }
  return executable;
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForJson(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw new Error(`Chrome DevTools non disponibile: ${lastError?.message || "timeout"}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    if (typeof WebSocket !== "function") {
      throw new Error("L'importatore richiede Node.js 22 o successivo (WebSocket globale non disponibile).");
    }
    this.socket = new WebSocket(webSocketUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", () => reject(new Error("Connessione DevTools fallita.")), { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
    this.socket.addEventListener("close", () => {
      for (const { reject, timer } of this.pending.values()) {
        clearTimeout(timer);
        reject(new Error("Connessione DevTools chiusa."));
      }
      this.pending.clear();
    });
  }

  handleMessage(rawMessage) {
    const message = JSON.parse(String(rawMessage));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result || {});
      return;
    }
    for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  async call(method, params = {}, timeoutMs = 15000) {
    await this.ready;
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout DevTools: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  close() {
    if (this.socket.readyState < WebSocket.CLOSING) this.socket.close();
  }
}

async function waitForRenderedOdds(client, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.call("Runtime.evaluate", {
      expression: "document.querySelectorAll('[data-qa^=\"esito_\"]').length",
      returnByValue: true,
    });
    const count = Number(result.result?.value || 0);
    if (count > 0) return count;
    await sleep(400);
  }
  return 0;
}

async function settleBodyJobs(bodyJobs, maxWaitMs = 5000) {
  const deadline = Date.now() + maxWaitMs;
  let previousLength = -1;
  while (previousLength !== bodyJobs.length && Date.now() < deadline) {
    previousLength = bodyJobs.length;
    const remaining = Math.max(1, deadline - Date.now());
    await Promise.race([Promise.allSettled([...bodyJobs]), sleep(remaining)]);
    if (Date.now() < deadline) await sleep(100);
  }
}

async function captureSisalPage({ pageUrl, pageUrls, waitMs = 15000, headed = true, includeDetails = true }) {
  const urls = pageUrls || [pageUrl];
  if (!urls.length || urls.some((url) => !url)) throw new Error("Nessuna URL Sisal valida da acquisire.");
  const browserPath = findBrowserExecutable();
  const port = await reservePort();
  const profileDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sisal-odds-"));
  const browserProcess = spawn(browserPath, [
    `--remote-debugging-port=${port}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-http2",
    "--disable-quic",
    ...(headed ? [] : ["--headless=new", "--disable-gpu"]),
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  let client;
  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
    if (!targetResponse.ok) throw new Error(`Creazione scheda Chrome fallita: HTTP ${targetResponse.status}`);
    const target = await targetResponse.json();
    client = new CdpClient(target.webSocketDebuggerUrl);
    await client.ready;
    await client.call("Page.enable");
    await client.call("Runtime.enable");
    await client.call("Network.enable", {
      maxTotalBufferSize: 100 * 1024 * 1024,
      maxResourceBufferSize: 25 * 1024 * 1024,
    });

    const candidates = new Map();
    const requestMethods = new Map();
    const bodies = [];
    const bodyJobs = [];
    let activePageUrl = urls[0];
    client.on("Network.requestWillBeSent", ({ requestId, request }) => {
      requestMethods.set(requestId, request?.method || "");
    });
    client.on("Network.responseReceived", ({ requestId, response, type }) => {
      const url = response?.url || "";
      const isEventDetail = url.includes("/palinsesto/prematch/v1/eventDetail/");
      const isOddsPayload = isEventDetail || (urls.length === 1 && (
        url.includes("/palinsesto/prematch/alberaturaPrematch") ||
        url.includes("/palinsesto/prematch/schedaManifestazione") ||
        url.includes("/palinsesto/prematch/v1/schedaManifestazione")
      ));
      if (requestMethods.get(requestId) === "GET" && response?.status === 200 && isOddsPayload) {
        candidates.set(requestId, {
          url,
          sourcePageUrl: activePageUrl,
          status: response.status,
          mimeType: response.mimeType,
          type,
          headers: Object.fromEntries(Object.entries(response.headers || {}).filter(([name]) =>
            ["cache-control", "content-type", "date", "etag", "expires", "last-modified", "vary"].includes(name.toLowerCase())
          )),
        });
      }
    });
    client.on("Network.loadingFinished", ({ requestId }) => {
      requestMethods.delete(requestId);
      const metadata = candidates.get(requestId);
      if (!metadata) return;
      candidates.delete(requestId);
      const job = client.call("Network.getResponseBody", { requestId }, 5000)
        .then(({ body, base64Encoded }) => {
          const decoded = base64Encoded ? Buffer.from(body, "base64").toString("utf8") : body;
          let payload = decoded;
          try { payload = JSON.parse(decoded); } catch { /* Preserve the exact text when it is not JSON. */ }
          bodies.push({ ...metadata, payload });
        })
        .catch((error) => bodies.push({ ...metadata, captureError: error.message }));
      bodyJobs.push(job);
    });

    const pages = [];
    let renderedOdds = 0;
    for (const url of urls) {
      activePageUrl = url;
      await client.call("Page.navigate", { url });
      const pageOdds = await waitForRenderedOdds(client, waitMs);
      renderedOdds += pageOdds;
      await sleep(800);
      await settleBodyJobs(bodyJobs);
      const state = await client.call("Runtime.evaluate", {
        expression: "JSON.stringify({title:document.title,url:location.href,text:document.body.innerText.slice(0,1000)})",
        returnByValue: true,
      });
      const parsed = JSON.parse(state.result?.value || "{}");
      pages.push({ sourceUrl: url, title: parsed.title, url: parsed.url, renderedOdds: pageOdds, ...(parsed.url?.startsWith("chrome-error://") ? { text: parsed.text } : {}) });
    }

    const detailRequests = [];
    const manifest = bodies.find((response) => Array.isArray(response.payload?.avvenimentoFeList));
    if (includeDetails && manifest) {
      const regulatorEventIds = [...new Set(manifest.payload.avvenimentoFeList
        .map((event) => event.regulatorEventId || `${event.codicePalinsesto}-${event.codiceAvvenimento}`)
        .filter(Boolean))];
      if (regulatorEventIds.length > 40) throw new Error(`Troppi eventi Sisal da dettagliare: ${regulatorEventIds.length}`);
      for (const regulatorEventId of regulatorEventIds) {
        const detailUrl = `https://betting.sisal.it/api/lettura-palinsesto-sport/palinsesto/prematch/v1/eventDetail/${regulatorEventId}?offerId=0&metaTplEnabled=true`;
        const request = await client.call("Runtime.evaluate", {
          expression: `(async()=>{const response=await fetch(${JSON.stringify(detailUrl)},{credentials:"include"});return {status:response.status,url:response.url};})()`,
          awaitPromise: true,
          returnByValue: true,
        }, 30000).catch((error) => ({ result: { value: { status: 0, url: detailUrl, error: error.message } } }));
        detailRequests.push({ regulatorEventId, ...(request.result?.value || {}) });
        await sleep(150);
      }
      await sleep(500);
      await settleBodyJobs(bodyJobs);
    }
    const uniqueBodies = [...new Map(bodies.map((body) => [body.url, body])).values()];
    return {
      browser: { executable: browserPath, product: "Chromium CDP" },
      renderedOdds,
      page: pages[pages.length - 1],
      pages,
      detailRequests,
      responses: uniqueBodies.sort((a, b) => a.url.localeCompare(b.url)),
    };
  } finally {
    if (client) {
      try { await client.call("Browser.close"); } catch { /* Browser may already be closing. */ }
      client.close();
    }
    if (!browserProcess.killed) browserProcess.kill();
    await Promise.race([
      new Promise((resolve) => browserProcess.once("exit", resolve)),
      sleep(3000),
    ]);
    for (let attempt = 0; attempt < 6 && fs.existsSync(profileDirectory); attempt += 1) {
      try { fs.rmSync(profileDirectory, { recursive: true, force: true, maxRetries: 2, retryDelay: 150 }); } catch { /* Retry after Chrome releases file handles. */ }
      if (fs.existsSync(profileDirectory)) await sleep(300);
    }
  }
}

module.exports = { captureSisalPage, findBrowserExecutable };
