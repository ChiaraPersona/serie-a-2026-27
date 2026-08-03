const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const competitionIndex = process.argv.indexOf("--competition");
const competition = competitionIndex >= 0 ? process.argv[competitionIndex + 1] : "serie-a";
const normalizedFile = path.join(root, "data", "normalized", "odds", "sisal", `${competition}.json`);
assert(fs.existsSync(normalizedFile), `Dataset Sisal mancante: ${normalizedFile}`);
const dataset = JSON.parse(fs.readFileSync(normalizedFile, "utf8"));
assert(dataset.provider === "sisal" && dataset.competition === competition, "Provider o competizione Sisal non validi");
assert(/^\d{4}-\d{2}-\d{2}T/.test(dataset.retrievedAt), "Timestamp Sisal non valido");
assert(dataset.sourceUrl?.startsWith("https://www.sisal.it/"), "URL sorgente Sisal non valido");
assert(dataset.rawFile?.endsWith(".json.gz"), "Riferimento raw Sisal non valido");
const rawFile = path.join(root, dataset.rawFile);
assert(fs.existsSync(rawFile), `Raw Sisal mancante: ${rawFile}`);
const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(rawFile)).toString("utf8"));
assert(raw.provider === "sisal" && Array.isArray(raw.responses), "Raw Sisal non valido");
assert(raw.responses.every((response) => !Object.keys(response.headers || {}).some((name) => /cookie|authorization|token/i.test(name))), "Header sensibili presenti nel raw Sisal");
assert((raw.detailRequests || []).every((request) => request.status === 200), "Richiesta dettaglio Sisal fallita");
assert(Array.isArray(dataset.events), "Eventi Sisal mancanti");
assert(dataset.summary.events === dataset.events.length, "Conteggio eventi Sisal incoerente");
assert(new Set(dataset.events.map((event) => event.providerEventId)).size === dataset.events.length, "Eventi Sisal duplicati");

const markets = dataset.events.flatMap((event) => event.markets);
const selections = markets.flatMap((market) => market.selections);
assert(dataset.summary.markets === markets.length, "Conteggio mercati Sisal incoerente");
assert(dataset.summary.selections === selections.length, "Conteggio selezioni Sisal incoerente");
assert(dataset.summary.playerMarkets === markets.filter((market) => market.marketScope === "player").length, "Conteggio mercati giocatore Sisal incoerente");
assert(new Set(selections.map((selection) => selection.providerSelectionId)).size === selections.length, "Selection ID Sisal duplicati");
assert(selections.every((selection) => Number.isFinite(selection.odds) && selection.odds >= 1 && selection.oddsRaw === Math.round(selection.odds * 100)), "Quote Sisal non valide");
assert(markets.every((market) => market.providerMarketId && market.marketName && market.selections.length), "Mercato Sisal incompleto");
assert(markets.every((market) => ["match", "player"].includes(market.marketScope) && Array.isArray(market.providerPlayerIds)), "Ambito mercato Sisal non valido");
const matchEvents = dataset.events.filter((event) => event.eventType === "MATCH");
assert(dataset.summary.matchEvents === matchEvents.length, "Conteggio eventi partita Sisal incoerente");
assert(dataset.summary.antepostEvents === dataset.events.filter((event) => event.eventType === "ANTEPOST").length, "Conteggio antepost Sisal incoerente");
if (dataset.canonicalCompetition && matchEvents.length) {
  assert(dataset.summary.matchedEvents === matchEvents.length, `Matching incompleto: ${dataset.summary.matchedEvents}/${matchEvents.length}`);
  assert(matchEvents.every((event) => event.canonicalMatchId && event.home?.canonicalTeamId && event.away?.canonicalTeamId), "Riferimenti canonici Sisal mancanti");
}
console.log(`OK Sisal ${competition}: ${dataset.summary.events} eventi, ${dataset.summary.markets} mercati, ${dataset.summary.selections} quote, ${dataset.summary.playerMarkets} mercati giocatore`);
