import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settleLeg } from "../js/pages/betting-settlement.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const matches = read("data/normalized/matches.json");
const schedina = read("data/normalized/schedina-md05.json");
const predictions = read("data/normalized/predictions.json").predictions;
const teams = read("data/teams/index.json").teams;
const matchById = new Map(matches.map(match => [match.id, match]));
const teamById = new Map(teams.map(team => [team.id, team.name]));
const legs = schedina.slips.flatMap(slip => slip.legs);

const expectedResults = new Map([
  ["monza-sassuolo-2026-27-md-05", [2, 1]],
  ["bologna-torino-2026-27-md-05", [1, 1]],
  ["udinese-cagliari-2026-27-md-05", [0, 1]],
  ["roma-inter-2026-27-md-05", [2, 2]]
]);

for (const [matchId, [home, away]] of expectedResults) {
  const match = matchById.get(matchId);
  assert.equal(match?.status, "finished", `${matchId}: stato non finale`);
  assert.deepEqual(match.score, { home, away }, `${matchId}: risultato errato`);
}

const findLeg = label => legs.find(leg => leg.label === label);
const settlement = label => settleLeg(findLeg(label), matchById.get(findLeg(label).matchId));

assert.equal(settlement("Sassuolo vincente").status, "lost");
assert.equal(settlement("Sassuolo meno di 6,5 corner").status, "won");
assert.equal(settlement("Sassuolo meno di 5,5 corner").status, "won");
assert.equal(settlement("Armand Laurienté assist · sostituto incluso").status, "lost");
assert.equal(settlement("Sebastiano Esposito gol o assist · sostituto incluso").status, "won");
assert.equal(settlement("Casa 0–2 gol · Ospite 1–3 gol").status, "won");
assert.equal(settlement("Rafik Belghali riceve un cartellino · sostituto incluso").status, "won");
assert.equal(settlement("Arthur Theate riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Zé Pedro riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Christian Kabasele riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Nikola Vlasic almeno 1 tiri · sostituto incluso").status, "unavailable");
assert.equal(settlement("Keinan Davis almeno 1 tiri in porta · sostituto incluso").status, "unavailable");

const romaMatch = matchById.get("roma-inter-2026-27-md-05");
const romaCombo = predictions.find(prediction => prediction.matchId === romaMatch.id).combinations.find(combo => combo.tier === "Safe");
const comboSettlement = (leg, match) => settleLeg({ ...leg, fixture: `${teamById.get(match.homeTeam)} - ${teamById.get(match.awayTeam)}` }, match).status;
const romaComboResults = new Map(romaCombo.legs.map(leg => [leg.label, comboSettlement(leg, romaMatch)]));
for (const label of ["Inter segna almeno un gol", "Roma o pareggio (1X)", "U/O 4.5 · UNDER", "1 TEMPO: U/O 0.5 · OVER", "TEMPO PRIMO GOAL · 1", "Roma SEGNA NEI 2 TEMPI · NO", "SEGNA GOAL OSPITE 2 TEMPO · SI"]) assert.equal(romaComboResults.get(label), "won", `MyCombo Roma-Inter: ${label} deve essere verde`);
assert.equal(romaComboResults.get("DC TEMPO 1 · X2"), "lost");
assert.equal(romaComboResults.get("Partita almeno 24 tiri totali"), "won");
assert.equal(romaComboResults.get("Partita almeno 7 tiri in porta"), "won");
assert.deepEqual([...romaComboResults.values()].reduce((counts,status)=>(counts[status]=(counts[status]||0)+1,counts),{}), { won: 9, lost: 1 });

const monzaMatch = matchById.get("monza-sassuolo-2026-27-md-05");
const monzaCombo = predictions.find(prediction => prediction.matchId === monzaMatch.id).combinations.find(combo => combo.tier === "Safe");
const caletaCarFouls = monzaCombo.legs.find(leg => leg.label.includes("CALETA CAR D.") && leg.market.includes("FALLI COMMESSI"));
assert.equal(comboSettlement(caletaCarFouls, monzaMatch), "won", "MyCombo Monza-Sassuolo: il fallo commesso da Caleta-Car deve essere liquidato");

const expectedComboSummaries = new Map([
  ["bologna-torino-2026-27-md-05", { won: 6, lost: 3, unavailable: 1 }],
  ["monza-sassuolo-2026-27-md-05", { won: 9, lost: 1 }],
  ["roma-inter-2026-27-md-05", { won: 9, lost: 1 }],
  ["udinese-cagliari-2026-27-md-05", { lost: 5, won: 5 }]
]);
for (const [matchId, expected] of expectedComboSummaries) {
  const match = matchById.get(matchId);
  const combo = predictions.find(prediction => prediction.matchId === matchId).combinations.find(item => item.tier === "Safe");
  const summary = combo.legs.map(leg => comboSettlement(leg, match)).reduce((counts,status)=>(counts[status]=(counts[status]||0)+1,counts),{});
  assert.deepEqual(summary, expected, `${matchId}: riepilogo MyCombo non coerente con i dati validati`);
}

console.log("Risultati MD05 verificati per Monza-Sassuolo, Bologna-Torino, Udinese-Cagliari e Roma-Inter; liquidazione Schedina coperta sui mercati disponibili.");
