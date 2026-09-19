"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const data = read("data/normalized/schedina-md05.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(item => item.matchId.endsWith("-md-05"));
const source = read("data/sources/mycombo-serie-a-2026-27-md-05.json");
const matches = read("data/normalized/matches.json");
const matchById = new Map(matches.map(match => [match.id, match]));
const renderer = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const legs = data.slips.flatMap(slip => slip.legs);
const sourcePortfolios = Object.values(source.matches).flat();
const sourceComboLegs = sourcePortfolios.flatMap(portfolio => portfolio.legs || []);
const openComboLegs = Object.entries(source.matches).filter(([matchId]) => matchById.get(matchId)?.status !== "finished").flatMap(([,portfolios]) => portfolios.flatMap(portfolio => portfolio.legs || []));
const forbiddenOpenMarket = leg => /market-(?:casa segna goal 2t|ospite segna goal 2t|segna goal tempo x|squadra x segna nei 2 tempi|squadra x vince almeno un tempo|u o goal squadra tempo|(?:casa|ospite) vince a 0(?: 1t| 2t)?|(?:1 tempo |2 tempo )?segna ultimo goal|1 tempo 1x2 corner|tempo primo goal|draw no bet(?: tempo x)?)$/.test(leg.overlapKey) || /\bduo\b|multigiocat/.test(leg.overlapKey);

assert.equal(data.matchday, 5);
assert.equal(data.slips.length, 8);
assert.equal(legs.length, 45);
assert.equal(Object.keys(source.matches).length, 10);
assert.equal(sourcePortfolios.filter(portfolio => portfolio.tier === "Safe").length, 10);
assert(Object.entries(source.matches).filter(([matchId]) => matchById.get(matchId)?.status === "finished").every(([,portfolios]) => portfolios.find(portfolio => portfolio.tier === "Safe").legs.length === 10), "Le MyCombo concluse devono conservare le 10 selezioni storiche");
assert(Object.entries(source.matches).filter(([matchId]) => matchById.get(matchId)?.status !== "finished").every(([,portfolios]) => {
  const safe = portfolios.find(portfolio => portfolio.tier === "Safe");
  return safe.status === "N/D" ? safe.legs.length === 0 && Boolean(safe.reason) : safe.legs.length === 10;
}), "Le MyCombo aperte devono contenere 10 mercati ammessi oppure un N/D motivato");
assert(!sourceComboLegs.some(leg => /market-(?:prima sostituzione nel match|(?:casa |ospite )?pari dispari)$/.test(leg.overlapKey)), "La fonte MyCombo contiene ancora sostituzione o pari/dispari");
assert.equal(source.constraints.minLegOddsInclusive, 1.15);
assert.equal(source.constraints.displayedComboLegs, 10);
assert.deepEqual(source.constraints.excludedMarketNames, [
  "ARBITRO CONSULTA MONITOR VAR INC TS",
  "RIGORE SI/NO",
  "PRIMA SOSTITUZIONE NEL MATCH",
  "PARI/DISPARI",
  "CASA: PARI/DISPARI",
  "OSPITE: PARI/DISPARI",
  "CASA: SEGNA GOAL 2T",
  "OSPITE: SEGNA GOAL 2T",
  "SEGNA GOAL TEMPO X",
  "SQUADRA X SEGNA NEI 2 TEMPI",
  "U/O GOAL SQUADRA TEMPO",
  "SEGNA ULTIMO GOAL",
  "1 TEMPO: SEGNA ULTIMO GOAL",
  "2 TEMPO: SEGNA ULTIMO GOAL",
  "1 TEMPO: 1X2 CORNER",
  "TEMPO PRIMO GOAL",
  "DRAW NO BET",
  "DRAW NO BET TEMPO X",
  "SQUADRA X VINCE ALMENO UN TEMPO",
  "CASA: VINCE A 0",
  "OSPITE: VINCE A 0",
  "CASA: VINCE A 0 1T",
  "OSPITE: VINCE A 0 1T",
  "CASA: VINCE A 0 2T",
  "OSPITE: VINCE A 0 2T"
]);
assert.deepEqual(source.constraints.excludedMarketNameFragments, ["DUO", "MULTIGIOCAT"]);
assert.match(source.constraints.providerEligibilityPolicy, /sezione MyCombo/);
assert.equal(openComboLegs.filter(forbiddenOpenMarket).length, 0, "Una MyCombo ancora aperta contiene un mercato vietato");
assert(!data.slips.some(slip => ["exact-score", "exact-score-multi"].includes(slip.type)));
assert(!legs.some(leg => /^RISULTATO ESATTO/.test(leg.market)));
assert.equal(new Set(legs.map(leg => String(leg.providerSelectionId))).size, legs.length);
assert(legs.every(leg => leg.odds >= 1.10 && leg.selection !== "12" && leg.coherent));
assert(!data.slips.some(slip => /scintilla|bagliore|supernova|prisma|quasar|costellazione/i.test(`${slip.id} ${slip.name}`)), "Sono rimasti nomi di costellazioni nella Schedina MD05");
assert.deepEqual(data.slips.map(slip => slip.name), [
  "Tre mercati prudenti",
  "Tre mercati a quota intermedia",
  "Cinque mercati · cinque partite",
  "Otto gol, assist e tiri · gruppo 1",
  "Otto gol, assist e tiri · gruppo 2",
  "Multigol casa/ospite · 10 partite",
  "Poker ammoniti 1",
  "Poker ammoniti 2"
]);
assert(renderer.includes("MyCombo · fino a 10 esiti per gara"));
assert(renderer.includes("data-mycombo-pick"), "I dieci esiti MyCombo devono essere pulsanti selezionabili");
assert(renderer.includes("bindMyComboInteractions"), "Interazione MyCombo assente");
assert(renderer.includes('data-finished="true"') && renderer.includes('verde = esito preso'), "Le MyCombo concluse devono mostrare gli esiti liquidati");
assert(!renderer.includes('item.match.status!=="finished"'), "Monza-Sassuolo deve restare visibile come snapshot pre-partita nella sezione MyCombo");
assert(renderer.indexOf("${myCombo}${roundContent") > renderer.indexOf("const myCombo="), "Le MyCombo devono precedere le schedine nella pagina MD05");

for (const prediction of predictions) {
  const combo = prediction.combinations.find(item => item.tier === "Safe");
  const finished = matchById.get(prediction.matchId)?.status === "finished";
  if (!finished && combo?.qualityStatus === "nd") {
    assert.equal(combo.legs.length, 0, `${prediction.matchId}: un profilo N/D non deve contenere esiti`);
    assert(combo.unavailableReason, `${prediction.matchId}: motivazione N/D assente`);
    continue;
  }
  assert.equal(combo?.legs.length, 10, `${prediction.matchId}: la MyCombo Safe deve contenere 10 eventi`);
  assert(combo.legs.every(leg => leg.odds >= 1.15), `${prediction.matchId}: quota MyCombo sotto 1,15`);
  assert(!combo.legs.some(leg => /MONITOR VAR|RIGORE SI\/NO|PRIMA SOSTITUZIONE|PARI\/DISPARI/i.test(leg.market)), `${prediction.matchId}: mercato vietato presente`);
  assert(!combo.legs.some(leg => /HANDICAP|ASIATIC|\bAH\b/i.test(`${leg.market} ${leg.variant} ${leg.label}`)), `${prediction.matchId}: handicap o mercato asiatico vietato`);
  assert.equal(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${prediction.matchId}: mercato ripetuto`);
  const semanticKeys = combo.legs.flatMap(leg => leg.semanticKeys || []);
  assert.equal(new Set(semanticKeys).size, semanticKeys.length, `${prediction.matchId}: macro-scenario ripetuto`);
}

const parmaGenoa = predictions.find(prediction => prediction.matchId === "parma-genoa-2026-27-md-05");
for (const combo of parmaGenoa.combinations) {
  const goalLegs = combo.legs.filter(leg => (leg.semanticKeys || []).includes("goals"));
  assert(goalLegs.length <= 1, "Parma-Genoa: Multigoal, Under/Over e altre varianti gol non possono convivere");
}

console.log(`Schedina MD05 valida: ${data.slips.length} proposte, ${legs.length} selezioni e ${predictions.length} MyCombo distinte.`);
