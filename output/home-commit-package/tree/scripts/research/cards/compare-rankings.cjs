"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { kickoff } = require("./data");
const { rotationHistory, replacementBonus } = require("./duo-rotation.cjs");

const root = path.resolve(__dirname, "../../..");
const matches = new Map(require("../../../data/normalized/matches.json").map(match => [match.id, match]));
const officialLineups = new Map(require("../../../data/sources/official-lineups-2026-27.json").fixtures.map(fixture => [fixture.matchId, fixture]));
const snapshotFile = (day, trial) => path.join(root, "data/analysis/card-prediction-research", `ranking-comparison${trial ? "-" + trial : ""}-md${day}.json`);
const trialRankings = { fouls: "foulsTieBreak", propensity: "yellowPropensity", "opponent-cards": "opponentCards", "duo-rotation": "duoRotation" };
const opponentCardsReport = "docs/reports/gialli-provocati-avversari-md01-md11-2026-11-09.md";
const shortlistSize = total => Math.max(1, Math.min(5, Math.round(total)));
const validList = (name, list) => (name === "adaptive" ? list.length >= 1 && list.length <= 5 :
  list.length === ({ fixedThree: 3, fixedFour: 4 }[name] ?? 5)) && list.every(candidate => candidate.playerId);

function loadDrawnYellows() {
  const report = fs.readFileSync(path.join(root, opponentCardsReport), "utf8");
  const byPlayer = new Map();
  const seen = new Set();
  for (const line of report.split(/\r?\n/).filter(line => /^\| \d+ \| .* \| \[Diretta\]/.test(line))) {
    const [, day, fixture, minute, victim, booked] = line.split("|").map(field => field.trim());
    const [home, away] = fixture.toLowerCase().split("–");
    const match = matches.get(`${home}-${away}-2026-27-md-${day.padStart(2, "0")}`);
    assert(match?.status === "finished", `Fixture senza referto: ${fixture} / ${day}`);
    const cards = match.bookings.filter(event => event.player === booked && event.minute === Number.parseInt(minute) && event.eventType === "yellow");
    assert.equal(cards.length, 1, `Giallo non univoco: ${fixture} / ${booked} / ${minute}`);
    const side = cards[0].team === match.homeTeam ? "away" : "home";
    const players = match.playerStats[side].filter(player => player.player === victim && player.playerId);
    assert.equal(players.length, 1, `Identità non univoca: ${fixture} / ${victim}`);
    const key = JSON.stringify([match.id, booked, minute]);
    assert(!seen.has(key), `Attribuzione duplicata: ${key}`);
    seen.add(key);
    const id = players[0].playerId;
    const prior = byPlayer.get(id) ?? new Map();
    prior.set(match.id, { matchId: match.id, date: match.date });
    byPlayer.set(id, prior);
  }
  assert(seen.size > 0, "Nessun giallo provocato verificabile");
  return byPlayer;
}

function foulTieBreak(row) {
  const baseline = row.rankings.combined;
  if (baseline.length < 5) return baseline;
  const score = candidate => candidate.duelResearch.riskScore * candidate.expectedMinutes / 90;
  const cutoff = score(baseline[4]);
  const band = 5;
  const exposure = candidate => candidate.duelResearch.foulExposureRate * candidate.expectedMinutes / 90;
  const totals = {};
  for (const candidate of row.candidates) totals[candidate.teamId] = (totals[candidate.teamId] ?? 0) + exposure(candidate);
  const pool = row.candidates.filter(candidate => score(candidate) >= cutoff - band && score(candidate) <= cutoff + band);
  if (!pool.every(candidate => Number.isFinite(row.cardContext.teamFouls[candidate.teamId]) && totals[candidate.teamId] > 0)) return baseline;
  const expectedFouls = candidate => row.cardContext.teamFouls[candidate.teamId] * exposure(candidate) / totals[candidate.teamId];
  const locked = baseline.filter(candidate => score(candidate) > cutoff + band);
  pool.sort((a, b) => expectedFouls(b) - expectedFouls(a) || score(b) - score(a) || a.name.localeCompare(b.name, "it"));
  return [...locked, ...pool].slice(0, 5);
}

function addRotationEvidence(row, match) {
  const official = officialLineups.get(match.id);
  const availableAt = official?.availableAt ?? official?.publishedAt ?? official?.retrievedAt;
  const beforeKickoff = typeof availableAt === "string" && availableAt.includes("T") &&
    Date.parse(availableAt) < Date.parse(row.kickoff) && Date.parse(availableAt) <= Date.now();
  const starters = new Set(row.candidates.map(candidate => candidate.playerId));
  for (const { teamId } of row.lineups) {
    const team = beforeKickoff ? official.teams.find(lineup => lineup.teamId === teamId) : null;
    const listed = ["complete", "user-provided", "user-confirmed-image", "official-user-provided-image", "explicit-user-provided"].includes(team?.benchCoverage);
    const bench = listed && team.substitutes?.length && team.substitutes.every(player => player.playerId)
      ? new Set(team.substitutes.map(player => player.playerId)) : null;
    const history = rotationHistory([...matches.values()], match, teamId);
    for (const candidate of row.candidates.filter(candidate => candidate.teamId === teamId)) {
      candidate.duoRotation = replacementBonus(candidate, starters, history, bench);
    }
  }
}

function capture(day) {
  const output = execFileSync(process.execPath, ["scripts/build-predictions.js", "--inspect-card-ranking"], {
    cwd: root,
    env: { ...process.env, SERIE_A_PREDICTION_PREVIEW_MATCHDAY: String(day), SERIE_A_PREDICTION_MATCH_ID: "" },
    maxBuffer: 8 * 1024 * 1024
  });
  const result = JSON.parse(output);
  const drawnYellows = loadDrawnYellows();
  assert(result.fixtures.length, "Giornata senza fixture");
  for (const row of result.fixtures) {
    const match = matches.get(row.matchId);
    row.kickoff = kickoff(match);
    addRotationEvidence(row, match);
    for (const candidate of row.candidates) {
      const opponentId = candidate.duelResearch.correctedOpponent?.playerId;
      const priorGames = candidate.role === "Difensore" && opponentId && match.date
        ? [...(drawnYellows.get(opponentId)?.values() ?? [])].filter(prior => prior.date && prior.date < match.date)
        : [];
      candidate.opponentCards = { priorMatchIds: priorGames.map(prior => prior.matchId), factor: 1 + Math.min(0.1, 0.025 * priorGames.length) };
    }
    const teams = new Set(row.lineups.map(lineup => lineup.teamId));
    function topFive(score, enforceTeamQuota = true) {
      const order = (a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "it");
      const ranked = [...row.candidates].sort(order);
      const selected = ranked.slice(0, 5);
      for (const team of enforceTeamQuota ? teams : []) {
        if (selected.some(candidate => candidate.teamId === team)) continue;
        const replacement = ranked.find(candidate => candidate.teamId === team);
        if (replacement && selected.length) selected[selected.length - 1] = replacement;
      }
      return selected.sort(order);
    }
    row.rankings = {
      current: row.selected,
      minutes: topFive(candidate => candidate.riskScore * candidate.expectedMinutes),
      noTeamQuota: row.candidates.slice(0, 5),
      defensiveDuels: topFive(candidate => candidate.duelResearch.riskScore),
      combined: topFive(candidate => candidate.duelResearch.riskScore * candidate.expectedMinutes, false),
      duoRotation: topFive(candidate => candidate.duelResearch.riskScore * candidate.expectedMinutes / 90 + candidate.duoRotation.points, false),
      opponentCards: topFive(candidate => candidate.duelResearch.riskScore * candidate.expectedMinutes * candidate.opponentCards.factor, false),
      yellowPropensity: topFive(candidate => candidate.duelResearch.riskScore * candidate.expectedMinutes * candidate.propensity.factor, false),
      combinedYellowHistory: topFive(candidate => candidate.duelResearch.yellowHistory.riskScore * candidate.expectedMinutes, false)
    };
    const { home, away, refereeFactor } = row.cardContext;
    const hasEstimate = Number.isFinite(home) && Number.isFinite(away);
    row.cardContext.sizeWithoutReferee = hasEstimate ? shortlistSize(home + away) : 5;
    row.cardContext.size = hasEstimate ? shortlistSize((home + away) * refereeFactor) : 5;
    row.rankings.adaptive = row.rankings.combined.slice(0, row.cardContext.size);
    row.rankings.fixedThree = row.rankings.combined.slice(0, 3);
    row.rankings.fixedFour = row.rankings.combined.slice(0, 4);
    row.rankings.foulsTieBreak = foulTieBreak(row);
    delete row.selected;
  }
  return result;
}

async function evaluate(fixtures, duo) {
  const { cardType, disciplinaryCoverage, nameKey } = await import("../../../js/pages/disciplinary.mjs");
  const { recordedDuoYellow } = await import("./recorded-duo-yellow.mjs");
  const variantNames = Object.keys(fixtures[0].rankings).filter(name => fixtures.every(row => row.rankings[name]));
  const stats = Object.fromEntries(variantNames.map(name => [name, { hits: 0, candidates: 0, replacementHits: 0, unknown: 0, unused: 0, matchesAtLeastThree: 0, matchesExactlyThree: 0, changedLists: 0, listSizes: {} }]));
  let refereeChangedSize = 0;
  let matchesWithOpponentSignal = 0;
  const rotation = { candidates: 0, verifiedBench: 0, candidatesWithActualReplacement: 0, correctReplacement: 0, matchesWithSignal: 0 };
  const swaps = Object.fromEntries(Object.values(trialRankings).filter(name => variantNames.includes(name))
    .map(name => [name, { changedMatches: 0, added: 0, addedHits: 0, removed: 0, removedHits: 0 }]));
  const duels = { defenderCandidates: 0, legacyDefenderOpponents: 0, legacyNamed: 0, correctedNamed: 0, examples: [] };
  const exclusions = [];
  let games = 0;
  let gamesWithThreePossible = 0;
  for (const row of fixtures) {
    const match = matches.get(row.matchId);
    if (match?.status !== "finished" || disciplinaryCoverage(match) !== "COMPLETE") {
      exclusions.push({ matchId: row.matchId, reason: "Esito o copertura gialli non disponibile" });
      continue;
    }
    const events = match.bookings.filter(event => cardType(event.eventType ?? event.card) === "yellow");
    const individualHit = candidate => events.some(event =>
      candidate.teamId === (event.teamId ?? event.team) &&
      (event.playerId ? candidate.playerId === event.playerId : nameKey(candidate.name) === nameKey(event.playerName ?? event.player))
    );
    const outcomes = new Map();
    const outcome = candidate => {
      const key = JSON.stringify([candidate.teamId, candidate.playerId, candidate.name]);
      if (!outcomes.has(key)) outcomes.set(key, duo ? recordedDuoYellow(match, candidate) : { status: individualHit(candidate) ? "hit" : "miss" });
      return outcomes.get(key);
    };
    const hit = candidate => outcome(candidate).status === "hit";
    const comparable = variantNames.every(name => validList(name, row.rankings[name]));
    if (!comparable) {
      exclusions.push({ matchId: row.matchId, reason: "Top 5 incompleta o identità candidato non risolta" });
      continue;
    }
    games++;
    if (row.candidates.some(candidate => candidate.opponentCards?.factor > 1)) matchesWithOpponentSignal++;
    const projected = row.candidates.filter(candidate => candidate.duoRotation?.playerId);
    if (projected.length) rotation.matchesWithSignal++;
    for (const candidate of projected) {
      rotation.candidates++;
      if (candidate.duoRotation.availability === "VERIFIED_BENCH") rotation.verifiedBench++;
      if (match.resultCoverage?.substitutions !== "complete") continue;
      const actual = match.substitutions?.filter(swap => swap.team === candidate.teamId && swap.playerOutId === candidate.playerId);
      if (actual?.length !== 1 || !actual[0].playerInId) continue;
      rotation.candidatesWithActualReplacement++;
      if (actual[0].playerInId === candidate.duoRotation.playerId) rotation.correctReplacement++;
    }
    if (row.cardContext && row.cardContext.size !== row.cardContext.sizeWithoutReferee) refereeChangedSize++;
    for (const candidate of row.candidates.filter(candidate => candidate.role === "Difensore" && candidate.duelResearch)) {
      const { legacyOpponent, correctedOpponent } = candidate.duelResearch;
      duels.defenderCandidates++;
      duels.legacyNamed += Number(Boolean(legacyOpponent));
      duels.correctedNamed += Number(Boolean(correctedOpponent));
      if (legacyOpponent?.role === "Difensore") {
        duels.legacyDefenderOpponents++;
        if (duels.examples.length < 5) duels.examples.push({ matchId: row.matchId, defender: candidate.name, legacyOpponent, correctedOpponent });
      }
    }
    if (new Set(events.map(event => `${event.teamId ?? event.team}:${event.playerId ?? nameKey(event.playerName ?? event.player)}`)).size >= 3) gamesWithThreePossible++;
    for (const [name, tally] of Object.entries(swaps)) {
      const added = row.rankings[name].filter(candidate =>
        !row.rankings.combined.some(original => original.playerId === candidate.playerId && original.teamId === candidate.teamId));
      const removed = row.rankings.combined.filter(candidate =>
        !row.rankings[name].some(replacement => replacement.playerId === candidate.playerId && replacement.teamId === candidate.teamId));
      tally.changedMatches += Number(added.length > 0);
      tally.added += added.length;
      tally.addedHits += added.filter(hit).length;
      tally.removed += removed.length;
      tally.removedHits += removed.filter(hit).length;
    }
    const original = new Set((row.rankings.current ?? row.rankings.combined).map(candidate => candidate.playerId));
    for (const name of variantNames) {
      const list = row.rankings[name];
      const hits = list.filter(hit).length;
      const unknown = list.filter(candidate => outcome(candidate).status === "unknown").length;
      stats[name].hits += hits;
      stats[name].candidates += list.length;
      stats[name].replacementHits += list.filter(candidate => outcome(candidate).via === "replacement").length;
      stats[name].unknown += unknown;
      stats[name].unused += list.filter(candidate => outcome(candidate).status === "unused").length;
      stats[name].matchesAtLeastThree += Number(hits >= 3);
      stats[name].matchesExactlyThree += Number(hits === 3 && unknown === 0);
      stats[name].changedLists += Number(list.length !== original.size || list.some(candidate => !original.has(candidate.playerId)));
      stats[name].listSizes[list.length] = (stats[name].listSizes[list.length] ?? 0) + 1;
    }
  }
  return { games, gamesWithThreePossible, stats, refereeChangedSize, matchesWithOpponentSignal, swaps, rotation, duels, exclusions };
}

async function main() {
  const [mode, ...values] = process.argv.slice(2);
  const duo = values.includes("--duo");
  const flags = Object.keys(trialRankings).filter(name => values.includes("--" + name));
  assert(flags.length <= 1, "Selezionare una sola variante");
  const [trial] = flags;
  const days = values.filter(value => value !== "--" + trial && value !== "--duo").map(Number);
  assert(["reconstruct", "freeze", "evaluate"].includes(mode) && days.length && days.every(day => Number.isInteger(day) && day >= 1 && day <= 38),
    "Uso: compare-rankings.cjs reconstruct|freeze|evaluate GIORNATA [GIORNATA...] [--fouls|--propensity|--opponent-cards|--duo-rotation] [--duo]");
  if (mode === "freeze") {
    assert.equal(days.length, 1, "Congelare una giornata per volta");
    const [day] = days;
    const snapshot = capture(day);
    if (trial) for (const row of snapshot.fixtures) {
      const name = trialRankings[trial];
      row.rankings = { combined: row.rankings.combined, [name]: row.rankings[name] };
    }
    for (const row of snapshot.fixtures) {
      assert(row.kickoff && Date.parse(snapshot.generatedAt) < Date.parse(row.kickoff) && Date.now() < Date.parse(row.kickoff) &&
        matches.get(row.matchId).status === "scheduled", `Fixture non congelabile: ${row.matchId}`);
      assert(row.lineups.length === 2 && row.lineups.every(lineup => lineup.size === 11 &&
        ["official", "probable"].includes(lineup.status) && (!lineup.matchId || lineup.matchId === row.matchId) &&
        Number.isFinite(Date.parse(lineup.updatedAt)) && Date.parse(lineup.updatedAt) <= Date.parse(snapshot.generatedAt)),
      `Undici di riferimento non verificabili: ${row.matchId}`);
      for (const [name, list] of Object.entries(row.rankings)) {
        assert(validList(name, list), `Lista non confrontabile: ${row.matchId} / ${name} (${list.length} nomi, ${list.filter(candidate => !candidate.playerId).length} senza ID)`);
      }
    }
    snapshot.category = "PROSPECTIVE_LOCAL_INPUTS";
    snapshot.target = duo ? "RECORDED_DUO_YELLOW" : "RECORDED_YELLOW";
    snapshot.rules = { current: "legacy", minutes: "riskScore * expectedMinutes / 90; team quota retained", noTeamQuota: "legacy score; no team quota", defensiveDuels: "compatible attacker or midfielder by lane; team quota retained", combined: "defensive-duel score * expectedMinutes / 90; no team quota" };
    snapshot.rules.combinedYellowHistory = "combined ranking with regularized individual ordinary yellows per 90 replacing the historical all-cards rate";
    snapshot.rules.adaptive = "combined ranking truncated to rounded expected match yellows times referee factor, bounded to 1–5; five if unavailable";
    snapshot.rules.fixedThree = "first three of combined ranking";
    snapshot.rules.fixedFour = "first four of combined ranking";
    snapshot.rules.foulsTieBreak = "allocate expected team fouls by individual minutes and matchup-adjusted foul rate; use only within five points of the fifth combined score";
    snapshot.rules.yellowPropensity = "combined score adjusted by individual yellows per foul versus prior-season role, shrunk by 30 equivalent fouls and capped at +/-10%";
    snapshot.rules.opponentCards = "combined score boosted for defenders by 2.5% per distinct earlier match with an attributed yellow drawn by their compatible direct opponent, capped at 10%";
    snapshot.rules.duoRotation = "add historical direct-replacement recurrence × projected substitute exposure × shrunk substitute yellow rate × 100; require two prior pairings and availability evidence";
    snapshot.implementation = Object.fromEntries([
      "scripts/predictions/engine.js", "scripts/predictions/defensive-duel.cjs", "scripts/build-predictions.js", "scripts/research/cards/compare-rankings.cjs", "scripts/research/cards/duo-rotation.cjs"
    ].map(file => [file, createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex")]));
    if (trial === "opponent-cards") snapshot.input = { file: opponentCardsReport, sha256: createHash("sha256").update(fs.readFileSync(path.join(root, opponentCardsReport))).digest("hex") };
    const file = snapshotFile(day, trial);
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ saved: file, fixtures: snapshot.fixtures.length, generatedAt: snapshot.generatedAt }));
    return;
  }
  const snapshots = days.map(day => mode === "reconstruct" ? capture(day) : JSON.parse(fs.readFileSync(snapshotFile(day, trial), "utf8")));
  const fixtures = snapshots.flatMap(snapshot => snapshot.fixtures);
  assert.equal(new Set(fixtures.map(row => row.matchId)).size, fixtures.length, "Fixture duplicate nel campione");
  console.log(JSON.stringify({ mode, target: duo ? "RECORDED_DUO_YELLOW" : "RECORDED_YELLOW", days, ...await evaluate(fixtures, duo) }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
