const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { normalizeSisalCapture } = require("./sisal/normalize");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const competitionKey = valueAfter("--competition") || "serie-a";
const merge = args.includes("--merge");
const config = JSON.parse(fs.readFileSync(path.join(root, "data", "sources", "sisal-odds.json"), "utf8"));
const competition = config.competitions[competitionKey];
if (!competition) throw new Error(`Competizione Sisal non configurata: ${competitionKey}`);
const rawDirectory = path.join(root, "data", "raw", "odds", "sisal", competitionKey);
const requestedRaw = valueAfter("--raw");
const rawFile = requestedRaw
  ? path.resolve(root, requestedRaw)
  : fs.readdirSync(rawDirectory).filter((name) => name.endsWith(".json.gz")).sort().reverse().map((name) => path.join(rawDirectory, name))[0];
if (!rawFile || !fs.existsSync(rawFile)) throw new Error(`Raw Sisal non trovato per ${competitionKey}`);
const capture = JSON.parse(zlib.gunzipSync(fs.readFileSync(rawFile)).toString("utf8"));
const relativeRawFile = path.relative(root, rawFile).replace(/\\/g, "/");
const normalized = normalizeSisalCapture({ capture, competitionKey, competition, rawFile: relativeRawFile, root });
const outputDirectory = path.join(root, "data", "normalized", "odds", "sisal");
fs.mkdirSync(outputDirectory, { recursive: true });
const outputFile = path.join(outputDirectory, `${competitionKey}.json`);
let output = normalized;
if (merge && fs.existsSync(outputFile)) {
  const previous = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  const updatedIds = new Set(normalized.events.map((event) => event.canonicalMatchId));
  const events = [
    ...normalized.events.map((event) => ({ ...event, retrievedAt: normalized.retrievedAt, rawFile: relativeRawFile })),
    ...previous.events.filter((event) => !updatedIds.has(event.canonicalMatchId)),
  ].sort((left, right) => String(left.startsAt).localeCompare(String(right.startsAt)) || left.name.localeCompare(right.name, "it"));
  const markets = events.flatMap((event) => event.markets);
  output = {
    ...normalized,
    sourceUrl: competition.url,
    rawFiles: [...new Set(events.map((event) => event.rawFile).filter(Boolean))],
    summary: {
      events: events.length,
      matchEvents: events.filter((event) => event.eventType === "MATCH").length,
      antepostEvents: events.filter((event) => event.eventType === "ANTEPOST").length,
      matchedEvents: events.filter((event) => event.eventType === "MATCH" && event.canonicalMatchId).length,
      unmatchedEvents: events.filter((event) => event.eventType === "MATCH" && !event.canonicalMatchId).length,
      markets: markets.length,
      playerMarkets: markets.filter((market) => market.marketScope === "player").length,
      selections: markets.reduce((sum, market) => sum + market.selections.length, 0),
    },
    events,
  };
}
fs.writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Normalizzato Sisal ${competitionKey}: ${output.summary.events} eventi, ${output.summary.markets} mercati, ${output.summary.selections} quote.`);
console.log(path.relative(root, outputFile));
