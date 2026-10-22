"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const history = read("data/generated/head-to-head/first-leg-2026-27.json");
const historySummary = read("data/generated/head-to-head/first-leg-2026-27-summary.json");
const predictions = read("data/normalized/predictions.json");
const app = fs.readdirSync(path.join(root, "js"), { recursive: true })
  .filter(file => file.endsWith(".js"))
  .map(file => fs.readFileSync(path.join(root, "js", file), "utf8"))
  .join("\n");
const page = fs.readFileSync(path.join(root, "lettura.html"), "utf8");
const appRelease = fs.readFileSync(path.join(root, "scripts/build-site.js"), "utf8").match(/const readingVersion = "([^"]+)"/)?.[1];

assert.strictEqual(history.fixtures.length, 190, "Lo storico deve coprire le 190 partite di andata");
assert.strictEqual(historySummary.fixtures.length, 190, "Il riepilogo H2H deve coprire le 190 partite di andata");
assert(historySummary.fixtures.every(fixture => !fixture.previousMeetings && Number.isInteger(fixture.coverage?.available)), "Il riepilogo H2H deve escludere gli eventi di dettaglio");
assert.strictEqual(predictions.predictions.length, 59, "Devono restare disponibili i pronostici archiviati MD1-MD6 e quelli correnti MD7");
assert(predictions.predictions.every(prediction => prediction.headToHead?.usedInModel), "Ogni pronostico deve usare il correttivo H2H");
assert(predictions.predictions.every(prediction => prediction.headToHead.home >= 0.95 && prediction.headToHead.home <= 1.05 && prediction.headToHead.away >= 0.95 && prediction.headToHead.away <= 1.05), "Il correttivo H2H deve restare entro il 5%");
assert(app.includes('requestedMatchId?"first-leg-2026-27.json":"first-leg-2026-27-summary.json"'), "La pagina Lettura non separa indice e dettaglio H2H");
assert(app.includes("Archivio risultati") && app.includes("Giornate future") && app.includes("ri-archive-content-"), "Indice Letture: archivio e calendario navigabili assenti");
assert(app.includes("Dettaglio ammoniti N/D"), "La UI non distingue i cartellini mancanti dallo zero");
assert(appRelease && page.includes(appRelease), "Cache busting non propagato alla pagina Lettura");
console.log("OK collegamento H2H: motore, 190 letture, copertura esplicita e cache aggiornata");
