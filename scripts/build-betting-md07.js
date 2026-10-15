"use strict";

// MD7 orchestration only: all probabilities and admission rules remain in the
// existing builders. Historical forecasts are retained verbatim.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { buildMd06MarketCatalog } = require("./md06-market-catalog");
const statistical = require("./md06-statistical-models");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, data) => {
  const target = path.join(root, file), temporary = `${target}.md07.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(temporary, target); return; } catch (error) {
      if (attempt >= 5) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
};
const run = (file, args = [], env = {}) => execFileSync(process.execPath, [file, ...args], { cwd: root, env: { ...process.env, ...env }, stdio: "inherit" });
const before = read("data/normalized/predictions.json");
const fixtures = read("data/normalized/matches.json");
const round = fixtures.filter(m => m.competition === "serie-a" && m.matchday === 7);
const ids = new Set(round.map(m => m.id));
const lineups = read("data/sources/probable-lineups-md7-2026-27.json");
assert.equal(round.length, 10);
assert.equal(lineups.matchday, 7);
assert.equal(new Set(lineups.teams.map(t => t.teamId)).size, 20);
for (const team of lineups.teams) {
  assert.equal(team.players.filter(p => p.lineupStatus === "starter").length, 11, team.teamId);
  assert(team.players.every(p => p.playerId && p.teamId === team.teamId && p.sourceRole), team.teamId);
}
run("scripts/team-pages/build.js");
function refreshRound() {
  run("scripts/build-predictions.js", [], { SERIE_A_PREDICTION_PREVIEW_MATCHDAY: "7" });
  const preview = read("data/generated/prediction-preview-md07-2026-27.json");
  assert.equal(preview.predictions.length, 10);
  write("data/normalized/predictions.json", { ...before, generatedAt: preview.generatedAt,
    predictions: [...before.predictions.filter(p => !ids.has(p.matchId)), ...preview.predictions] });
}
refreshRound();
run("scripts/generate-mycombo-md01.js", ["--matchday", "7"]);
refreshRound();
run("scripts/enforce-mycombo-risk.js", ["--matchday", "7"]);
const predictionsData = read("data/normalized/predictions.json");
assert.deepEqual(predictionsData.predictions.filter(p => !ids.has(p.matchId)), before.predictions.filter(p => !ids.has(p.matchId)));
const odds = read("data/normalized/odds/sisal/serie-a.json");
const roundOdds = { ...odds, events: odds.events.filter(e => ids.has(e.canonicalMatchId)) };
assert.equal(roundOdds.events.length, 10);
const frozen = read("data/analysis/serie-a-md06-statistical-models-2026-10-10.json");
const prior = statistical.reconstructPriorSeason();
const current = statistical.currentSeasonActuals().filter(m => m.matchday < 7 && Object.values(m.metrics).every(v => Number.isFinite(v.home) && Number.isFinite(v.away)));
const evaluated = statistical.buildCurrentEvaluations({ odds: roundOdds, fixtures, history: [...prior, ...current], validation: frozen.validation,
  priorTeamIds: new Set(prior.flatMap(m => [m.homeTeam, m.awayTeam])), matchday: 7 });
const statisticalModels = { ...frozen, scope: "Serie A MD7; frozen MD6 validation", generatedAt: new Date().toISOString(),
  dataCoverage: { ...frozen.dataCoverage, currentMatches: current.length }, currentForecasts: evaluated.forecasts, evaluations: evaluated.evaluations };
write("data/analysis/serie-a-md07-statistical-models.json", statisticalModels);
const marketCatalog = buildMd06MarketCatalog({ predictionsData, odds: roundOdds, matches: fixtures, schedinaSlips: [], probableLineups: lineups,
  officialLineups: read("data/sources/official-lineups-2026-27.json"), statisticalModels, matchday: 7 });
write("data/normalized/schedina-md07.json", { schemaVersion: 1, competition: "serie-a", season: "2026-27", matchday: 7,
  generatedAt: new Date().toISOString(), title: "Schedine Serie A · 7ª giornata", description: "Pronostici condivisi con le letture delle dieci partite.",
  provider: odds.provider, sourceUrl: odds.sourceUrl, oddsRetrievedAt: odds.retrievedAt, modelVersion: predictionsData.engine.version,
  methodology: statisticalModels.methodology, selectionRule: "Criteri MD6 invariati; probabilità DUO ed EV non certificati restano N/D.",
  coverage: { profilesEvaluated: 10, qualifiedProfiles: 0, unavailableProfiles: 0 }, slips: [], marketCatalog });
console.log(`OK MD7: ${marketCatalog.totals.finalSelections} contratti, ${marketCatalog.totals.suggestions} pronostici pubblicati`);
