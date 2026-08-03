const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { captureSisalPage } = require("./sisal/browser-capture");
const { normalizeSisalCapture } = require("./sisal/normalize");

const root = path.resolve(__dirname, "..");
const sourceConfig = JSON.parse(fs.readFileSync(path.join(root, "data", "sources", "sisal-odds.json"), "utf8"));

function readArguments(argv) {
  const options = { competition: "serie-a", waitMs: 15000, headed: true, details: true };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--competition") options.competition = argv[++index];
    else if (argument === "--url") options.url = argv[++index];
    else if (argument === "--wait-ms") options.waitMs = Number(argv[++index]);
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--headless") options.headed = false;
    else if (argument === "--no-details") options.details = false;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Argomento non riconosciuto: ${argument}`);
  }
  return options;
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const options = readArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Uso: node scripts/import-sisal-odds.js [--competition serie-a] [--url URL] [--wait-ms 15000] [--headless] [--no-details]");
    return;
  }
  const competition = sourceConfig.competitions[options.competition];
  const pageUrl = options.url || competition?.url;
  if (!pageUrl) throw new Error(`Competizione Sisal non configurata: ${options.competition}. Usa --url.`);
  if (!Number.isFinite(options.waitMs) || options.waitMs < 1000 || options.waitMs > 60000) {
    throw new Error("--wait-ms deve essere compreso tra 1000 e 60000.");
  }

  const retrievedAt = new Date();
  const capture = await captureSisalPage({ pageUrl, waitMs: options.waitMs, headed: options.headed, includeDetails: options.details });
  if (capture.page?.url?.startsWith("chrome-error://") || capture.responses.length === 0) {
    throw new Error(`Sisal non ha restituito dati API (${capture.page?.text?.split("\n")[0] || "pagina vuota"}).`);
  }
  const artifact = {
    provider: "sisal",
    competition: options.competition,
    retrievedAt: retrievedAt.toISOString(),
    sourceUrl: pageUrl,
    acquisition: "public-page-browser-cdp",
    ...capture,
  };
  const outputDirectory = path.join(root, "data", "raw", "odds", "sisal", options.competition);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputFile = path.join(outputDirectory, `${timestampForFile(retrievedAt)}.json.gz`);
  fs.writeFileSync(outputFile, zlib.gzipSync(`${JSON.stringify(artifact)}\n`, { level: 9 }));
  const relativeRawFile = path.relative(root, outputFile).replace(/\\/g, "/");
  const normalized = normalizeSisalCapture({ capture: artifact, competitionKey: options.competition, competition: competition || {}, rawFile: relativeRawFile, root });
  const normalizedDirectory = path.join(root, "data", "normalized", "odds", "sisal");
  fs.mkdirSync(normalizedDirectory, { recursive: true });
  const normalizedFile = path.join(normalizedDirectory, `${options.competition}.json`);
  fs.writeFileSync(normalizedFile, `${JSON.stringify(normalized, null, 2)}\n`);
  console.log(`Sisal: ${artifact.responses.length} risposte API, ${normalized.summary.events} eventi, ${normalized.summary.markets} mercati, ${normalized.summary.selections} quote.`);
  console.log(path.relative(root, outputFile));
  console.log(path.relative(root, normalizedFile));
}

main().catch((error) => {
  console.error(`Import Sisal fallito: ${error.message}`);
  process.exitCode = 1;
});
