"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const history = read("data/generated/head-to-head/first-leg-2026-27.json");
const predictions = read("data/normalized/predictions.json");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const page = fs.readFileSync(path.join(root, "lettura.html"), "utf8");

assert.strictEqual(history.fixtures.length, 190, "Lo storico deve coprire le 190 partite di andata");
assert.strictEqual(predictions.predictions.length, 10, "Devono restare disponibili i 10 pronostici quotati");
assert(predictions.predictions.every(prediction => prediction.headToHead?.usedInModel), "Ogni pronostico deve usare il correttivo H2H");
assert(predictions.predictions.every(prediction => prediction.headToHead.home >= 0.95 && prediction.headToHead.home <= 1.05 && prediction.headToHead.away >= 0.95 && prediction.headToHead.away <= 1.05), "Il correttivo H2H deve restare entro il 5%");
assert(app.includes('loadGenerated("head-to-head/first-leg-2026-27.json")'), "La pagina Lettura non carica il dataset H2H");
assert(app.includes("Precedenti per tutte le 190 partite"), "La directory del girone di andata non è renderizzata");
assert(app.includes("match.matchday<=19&&match.matchday!==nextDay"), "La directory non deve ripetere la giornata gia mostrata nel prossimo turno");
assert(app.includes("Dettaglio ammoniti N/D"), "La UI non distingue i cartellini mancanti dallo zero");
assert(page.includes("20260805-xg-blend25"), "Cache busting non propagato alla pagina Lettura");
console.log("OK collegamento H2H: motore, 190 letture, copertura esplicita e cache aggiornata");
