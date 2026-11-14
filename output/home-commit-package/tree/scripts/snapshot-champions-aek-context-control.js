"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const targetFixtureId = "ucl-2026-27-md02-14";
const lineupSourceFixtureId = "ucl-2026-27-md01-01";
const outputPath = path.join(root, "data/analysis/champions/aek-context-control-2026-10-04.json");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const round = (value, digits = 3) => Number(value.toFixed(digits));
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ł/g, "l").replace(/đ/g, "d").replace(/ø/g, "o").replace(/[^a-z0-9]+/g, " ").trim();
const tokens = value => normalize(value).split(" ").filter(Boolean);
const rolePrior = {
  goalkeeper: { shots: 0.01, shotsOnTarget: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42 },
  forward: { shots: 2.35, shotsOnTarget: 0.86 }
};
const slug = value => normalize(value).replace(/ /g, "-");

function inferRole(formation, index) {
  if (index === 0) return "goalkeeper";
  const lines = String(formation || "4-4-2").split("-").map(Number).filter(Number.isFinite);
  const defenders = lines[0] || 4;
  const forwards = lines.at(-1) || 2;
  if (index <= defenders) return "defender";
  if (index > 10 - forwards) return "forward";
  return "midfielder";
}

function targetPredictionFromCurrentBuilder() {
  const file = path.join(__dirname, "build-champions-pilot-predictions.js");
  let code = fs.readFileSync(file, "utf8");
  code = code.replace(
    "const pilotFixtures = calendar.fixtures.filter(fixture => fixture.matchday === 1);",
    `const pilotFixtures = calendar.fixtures.filter(fixture => fixture.id === "${targetFixtureId}");`
  ).replace(
    "if (fixtures.length !== 18) throw new Error(`Prima giornata Champions incompleta: attese 18 gare, trovate ${fixtures.length}`);",
    "if (fixtures.length !== 1) throw new Error(`CONTROL fixture mancante: ${fixtures.length}`);"
  );
  let captured = null;
  const fsProxy = { ...fs, writeFileSync: (_file, value) => { captured = JSON.parse(String(value)); } };
  const sandbox = {
    require: id => id === "fs" ? fsProxy : require(id),
    __dirname,
    __filename: file,
    console: { log() {}, error: console.error },
    process,
    Buffer,
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(code, sandbox, { filename: file });
  const prediction = captured?.fixtures?.[0];
  if (!prediction || prediction.fixtureId !== targetFixtureId) throw new Error("Impossibile materializzare il CONTROL MD2");
  return prediction;
}

function resolvePlayer(players, lineupName) {
  const wanted = normalize(lineupName);
  const exact = players.filter(player => normalize(player.name) === wanted || normalize(player.id) === wanted);
  if (exact.length === 1) return exact[0];
  const wantedTokens = tokens(lineupName);
  const surname = wantedTokens.at(-1);
  const candidates = players.filter(player => {
    const current = tokens(player.name);
    return current.at(-1) === surname || (wantedTokens.length > 1 && wantedTokens.every(token => current.includes(token)));
  });
  return candidates.length === 1 ? candidates[0] : null;
}

function main() {
  if (fs.existsSync(outputPath)) throw new Error(`CONTROL_ALREADY_EXISTS: ${path.relative(root, outputPath)}`);
  const calendar = read("data/normalized/champions-league-2026-27.json");
  const historical = read("data/normalized/champions-player-stats-2025-26.json");
  const target = calendar.fixtures.find(fixture => fixture.id === targetFixtureId);
  const lineupFixture = calendar.fixtures.find(fixture => fixture.id === lineupSourceFixtureId);
  const lineup = lineupFixture?.probableFormation?.home;
  if (!target || !lineup || lineup.team !== "AEK Athens" || lineup.players?.length !== 11) throw new Error("Fixture o XI CONTROL non disponibile");
  const prediction = targetPredictionFromCurrentBuilder();
  const teamProjection = prediction.teamProjections.find(team => team.team === "AEK Athens");
  if (!teamProjection?.shotsTotal || !teamProjection?.shotsOnTarget) throw new Error("Volumi squadra AEK CONTROL non disponibili");
  const team = historical.teams.find(item => item.team === "AEK Athens");
  const candidates = lineup.players.map((lineupName, index) => {
    const player = resolvePlayer(team.players, lineupName);
    const role = player?.position || inferRole(lineup.formation, index);
    const totals = player?.previousSeason?.totals || {};
    const historicalMinutes = Number(totals.minutes || 0);
    const historicalReliability = clamp(historicalMinutes / (historicalMinutes + 900), 0, 0.82);
    const prior = rolePrior[role] || rolePrior.midfielder;
    const baseline = key => round((Number.isFinite(totals.per90?.[key]) ? totals.per90[key] : prior[key]) * historicalReliability + prior[key] * (1 - historicalReliability));
    return {
      lineupName,
      playerId: player?.id || slug(`aek-athens-${lineupName}`),
      player: player?.name || lineupName,
      identityStatus: player ? "matched" : "role-baseline-unmatched-lineup-name",
      role,
      starterIndex: index,
      historicalMinutes,
      historicalRawShotsPer90: totals.per90?.shots ?? null,
      historicalRawSotPer90: totals.per90?.shotsOnTarget ?? null,
      rolePriorShotsPer90: prior.shots,
      rolePriorSotPer90: prior.shotsOnTarget,
      historicalReliability,
      baselineShotsPer90: baseline("shots"),
      baselineSotPer90: baseline("shotsOnTarget"),
      expectedMinutes: role === "goalkeeper" ? 90 : 84.6
    };
  });
  const outfield = candidates.filter(player => player.role !== "goalkeeper");
  const allocate = (rateKey, targetValue) => {
    const raw = outfield.map(player => ({ player, value: player[rateKey] * 0.94 }));
    const sum = raw.reduce((total, item) => total + item.value, 0);
    const factor = sum ? clamp(targetValue / sum, 0.72, 1.35) : 1;
    return { factor, rows: raw.map(item => [item.player.playerId, round(item.value * factor, 2)]) };
  };
  const shots = allocate("baselineShotsPer90", teamProjection.shotsTotal.central);
  const sot = allocate("baselineSotPer90", teamProjection.shotsOnTarget.central);
  const shotById = new Map(shots.rows), sotById = new Map(sot.rows);
  const players = candidates.map(player => ({
    ...player,
    projectedShots: player.role === "goalkeeper" ? 0 : shotById.get(player.playerId),
    projectedSot: player.role === "goalkeeper" ? 0 : sotById.get(player.playerId)
  }));
  const output = {
    schemaVersion: 1,
    immutableControl: true,
    createdAt: new Date().toISOString(),
    fixture: { fixtureId: target.id, date: target.date, homeTeam: target.homeTeam, awayTeam: target.awayTeam },
    lineupControl: {
      sourceFixtureId: lineupSourceFixtureId,
      status: lineupFixture.probableFormation.status,
      source: lineupFixture.probableFormation.source,
      team: lineup.team,
      formation: lineup.formation,
      players: lineup.players,
      note: "MD2 non dispone di una probabile formazione nel repository; il CONTROL congela l'ultimo XI ufficiale AEK disponibile senza inferenze."
    },
    method: {
      teamVolume: "build-champions-pilot-predictions.js corrente, senza modifiche",
      individualBaseline: "2025/26 rate shrinkato verso rolePrior con minutes/(minutes+900), cap 0.82",
      expectedMinutes: "84.6 per gli outfield: fattore corrente ratePer90 * 0.94; portiere 90",
      reconciliation: "scaling separato tiri/SOT con clamp 0.72..1.35"
    },
    expectedTeamShots: teamProjection.shotsTotal.central,
    expectedTeamSot: teamProjection.shotsOnTarget.central,
    reconciliation: {
      shotsFactor: round(shots.factor),
      sotFactor: round(sot.factor),
      sumProjectedShots: round(players.reduce((sum, player) => sum + player.projectedShots, 0), 2),
      sumProjectedSot: round(players.reduce((sum, player) => sum + player.projectedSot, 0), 2)
    },
    players,
    protectedInputs: {
      historicalDatasetSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "data/normalized/champions-player-stats-2025-26.json"))).digest("hex"),
      predictionBuilderSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "scripts/build-champions-pilot-predictions.js"))).digest("hex")
    }
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`CONTROL AEK salvato: ${path.relative(root, outputPath)} · team shots ${output.expectedTeamShots} · SOT ${output.expectedTeamSot}`);
}

main();
