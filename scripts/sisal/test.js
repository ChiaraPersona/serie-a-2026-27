const assert = require("assert");
const path = require("path");
const { normalizeSisalCapture, normalizedName } = require("./normalize");

const root = path.resolve(__dirname, "../..");
const event = {
  eventId: 9001,
  regulatorEventId: "40000-1",
  codicePalinsesto: 40000,
  codiceAvvenimento: 1,
  descrizione: "Atalanta - Sassuolo",
  eventType: "MATCH",
  data: "2026-08-23T18:45:00.000Z",
  stato: 1,
  firstCompetitor: { competitorId: 10, description: "Atalanta" },
  secondCompetitor: { competitorId: 20, description: "Sassuolo" },
};
const capture = {
  provider: "sisal",
  competition: "serie-a",
  retrievedAt: "2026-08-03T18:00:00.000Z",
  sourceUrl: "https://www.sisal.it/scommesse-matchpoint/quote/calcio/serie-a",
  acquisition: "public-page-browser-cdp",
  responses: [{
    url: "https://betting.sisal.it/api/lettura-palinsesto-sport/palinsesto/prematch/v1/eventDetail/40000-1",
    payload: {
      avvenimentoFe: event,
      scommessaMap: {
        "40000-1-3": { codiceScommessa: 3, descrizione: "1X2 ESITO FINALE", dataUltimaModifica: "2026-08-03T17:59:00.000Z" },
      },
      infoAggiuntivaMap: {
        "40000-1-3-0": {
          codicePalinsesto: 40000,
          codiceAvvenimento: 1,
          codiceScommessa: 3,
          marketId: 700,
          descrizione: "1X2 ESITO FINALE",
          soglia: "",
          stato: 1,
          esitoList: [
            { selectionId: 701, codiceEsito: 1, descrizione: "1", quota: 185, stato: 1 },
            { selectionId: 702, codiceEsito: 2, descrizione: "X", quota: 340, stato: 1 },
            { selectionId: 703, codiceEsito: 3, descrizione: "2", quota: 420, stato: 0 },
          ],
        },
      },
    },
  }],
};
const competition = {
  canonicalCompetition: "serie-a",
  season: "2026-27",
  matchSource: "data/normalized/matches.json",
  teamAliases: {},
};

const normalized = normalizeSisalCapture({ capture, competitionKey: "serie-a", competition, rawFile: "raw.json.gz", root });
assert.strictEqual(normalized.summary.events, 1);
assert.strictEqual(normalized.summary.markets, 1);
assert.strictEqual(normalized.summary.selections, 3);
assert.strictEqual(normalized.summary.playerMarkets, 0);
assert.strictEqual(normalized.events[0].canonicalMatchId, "atalanta-sassuolo-2026-27-md-01");
assert.strictEqual(normalized.events[0].markets[0].selections[0].odds, 1.85);
assert.strictEqual(normalized.events[0].markets[0].selections[2].status, "suspended");
assert.strictEqual(normalized.events[0].markets[0].marketScope, "match");
assert.deepStrictEqual(normalized.events[0].markets[0].providerPlayerIds, []);
assert.strictEqual(normalizedName("A.C. Milan"), "milan");
const manifestCapture = {
  ...capture,
  responses: [{
    url: "https://betting.sisal.it/api/lettura-palinsesto-sport/palinsesto/prematch/v1/schedaManifestazione/0/1-1",
    payload: {
      avvenimentoFeList: [event],
      scommessaMap: capture.responses[0].payload.scommessaMap,
      infoAggiuntivaMap: capture.responses[0].payload.infoAggiuntivaMap,
    },
  }],
};
const manifestNormalized = normalizeSisalCapture({ capture: manifestCapture, competitionKey: "serie-a", competition, rawFile: "raw.json.gz", root });
assert.strictEqual(manifestNormalized.summary.events, 1);
assert.strictEqual(manifestNormalized.summary.selections, 3);
console.log("OK normalizzazione Sisal, quote decimali e matching calendario");
