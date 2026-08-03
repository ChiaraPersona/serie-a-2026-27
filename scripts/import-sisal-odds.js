const fs = require("fs");
const path = require("path");
const { captureSisalPage } = require("./sisal/browser-capture");

const root = path.resolve(__dirname, "..");
const competitionUrls = {
  "serie-a": "https://www.sisal.it/scommesse-matchpoint/quote/calcio/serie-a?cluster=27&cde=1000001",
  "champions-league": "https://www.sisal.it/scommesse-matchpoint/quote/calcio/champions-league?cluster=27&cde=1000001",
};

function readArguments(argv) {
  const options = { competition: "serie-a", waitMs: 15000, headed: true };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--competition") options.competition = argv[++index];
    else if (argument === "--url") options.url = argv[++index];
    else if (argument === "--wait-ms") options.waitMs = Number(argv[++index]);
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--headless") options.headed = false;
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
    console.log("Uso: node scripts/import-sisal-odds.js [--competition serie-a] [--url URL] [--wait-ms 15000] [--headless]");
    return;
  }
  const pageUrl = options.url || competitionUrls[options.competition];
  if (!pageUrl) throw new Error(`Competizione Sisal non configurata: ${options.competition}. Usa --url.`);
  if (!Number.isFinite(options.waitMs) || options.waitMs < 1000 || options.waitMs > 60000) {
    throw new Error("--wait-ms deve essere compreso tra 1000 e 60000.");
  }

  const retrievedAt = new Date();
  const capture = await captureSisalPage({ pageUrl, waitMs: options.waitMs, headed: options.headed });
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
  const outputFile = path.join(outputDirectory, `${timestampForFile(retrievedAt)}.json`);
  fs.writeFileSync(outputFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Sisal: ${artifact.responses.length} risposte API, ${artifact.renderedOdds} quote renderizzate.`);
  console.log(path.relative(root, outputFile));
}

main().catch((error) => {
  console.error(`Import Sisal fallito: ${error.message}`);
  process.exitCode = 1;
});
