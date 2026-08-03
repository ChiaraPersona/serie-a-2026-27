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
fs.writeFileSync(outputFile, `${JSON.stringify(normalized, null, 2)}\n`);
console.log(`Normalizzato Sisal ${competitionKey}: ${normalized.summary.events} eventi, ${normalized.summary.markets} mercati, ${normalized.summary.selections} quote.`);
console.log(path.relative(root, outputFile));
