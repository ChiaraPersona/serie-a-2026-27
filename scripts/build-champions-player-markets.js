const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(Number(value).toFixed(digits));
const slug = value => normalize(value).replace(/ /g, "-");
const normalize = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/ł/g, "l").replace(/đ/g, "d").replace(/ø/g, "o")
  .replace(/[^a-z0-9]+/g, " ").trim();
const tokens = value => normalize(value).split(" ").filter(Boolean);
const poissonAtLeast = (lambda, threshold) => {
  let term = Math.exp(-lambda), cumulative = term;
  for (let k = 1; k < threshold; k += 1) { term *= lambda / k; cumulative += term; }
  return clamp(1 - cumulative, 0, 1);
};

const calendar = read("data/normalized/champions-league-2026-27.json");
const predictions = read("data/normalized/champions-pilot-predictions-2026-27.json");
const playerStats = read("data/normalized/champions-player-stats-2025-26.json");
const odds = read("data/normalized/odds/sisal/champions-league.json");

const teamStats = new Map(playerStats.teams.map(team => [team.team, team]));
const oddsByFixture = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const calendarByFixture = new Map(calendar.fixtures.map(fixture => [fixture.id, fixture]));
const roleLabel = role => ({ goalkeeper: "Portiere", defender: "Difensore", midfielder: "Centrocampista", forward: "Attaccante" }[role] || "N/D");
const rolePrior = {
  goalkeeper: { shots: 0.01, shotsOnTarget: 0, cards: 0.04, foulsCommitted: 0.04, goals: 0, assists: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18, cards: 0.22, foulsCommitted: 0.95, goals: 0.04, assists: 0.05 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42, cards: 0.18, foulsCommitted: 1.15, goals: 0.13, assists: 0.12 },
  forward: { shots: 2.35, shotsOnTarget: 0.86, cards: 0.1, foulsCommitted: 0.82, goals: 0.34, assists: 0.13 }
};

function inferRole(formation, index) {
  if (index === 0) return "goalkeeper";
  const lines = String(formation || "4-4-2").split("-").map(Number).filter(Number.isFinite);
  const defenders = lines[0] || 4;
  const forwards = lines.at(-1) || 2;
  if (index <= defenders) return "defender";
  if (index > 10 - forwards) return "forward";
  return "midfielder";
}

function resolvePlayer(team, lineupName) {
  const players = teamStats.get(team)?.players || [];
  const wanted = normalize(lineupName), wantedTokens = tokens(lineupName);
  let exact = players.filter(player => normalize(player.name) === wanted || normalize(player.id) === wanted);
  if (exact.length === 1) return exact[0];
  const surname = wantedTokens.at(-1);
  const candidates = players.filter(player => {
    const current = tokens(player.name);
    return current.at(-1) === surname || (wantedTokens.length > 1 && wantedTokens.every(token => current.includes(token)));
  });
  return candidates.length === 1 ? candidates[0] : null;
}

function lineupCandidates(fixture, prediction) {
  const rows = [];
  for (const side of ["home", "away"]) {
    const formation = fixture.probableFormation?.[side];
    const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
    const teamProjection = prediction.teamProjections.find(item => item.team === team);
    (formation?.players || []).forEach((name, index) => {
      const player = resolvePlayer(team, name);
      const role = player?.position || inferRole(formation?.formation, index);
      const totals = player?.previousSeason?.totals || {};
      const per90 = totals.per90 || {};
      const minutes = Number(totals.minutes || 0);
      const reliability = clamp(minutes / (minutes + 900), 0, 0.82);
      const prior = rolePrior[role] || rolePrior.midfielder;
      const rate = key => round((Number.isFinite(per90[key]) ? per90[key] : prior[key]) * reliability + prior[key] * (1 - reliability), 3);
      rows.push({
        lineupName: name,
        name: player?.name || name,
        playerId: player?.id || slug(`${team}-${name}`),
        team,
        teamId: slug(team),
        venue: side,
        role: roleLabel(role),
        roleKey: role,
        index,
        minutes,
        appearances: totals.appearances ?? null,
        starts: totals.starts ?? null,
        per90: { shots: rate("shots"), shotsOnTarget: rate("shotsOnTarget"), cards: rate("cards"), foulsCommitted: rate("foulsCommitted"), goals: rate("goals"), assists: rate("assists") },
        dataStatus: player && minutes >= 700 ? "verified-history" : player ? "limited-history" : "role-baseline",
        teamProjection
      });
    });
  }
  return rows;
}

function scaleShotProjections(players, key, teamCentral) {
  const outfield = players.filter(player => player.roleKey !== "goalkeeper");
  const raw = outfield.map(player => ({ player, value: player.per90[key] * 0.94 }));
  const sum = raw.reduce((total, item) => total + item.value, 0);
  const target = Number.isFinite(teamCentral) ? teamCentral : sum;
  const factor = sum ? clamp(target / sum, 0.72, 1.35) : 1;
  return raw.map(item => ({ player: item.player, projection: round(item.value * factor, 2) }));
}

function marketSelection(event, predicate, selectionName) {
  for (const market of event?.markets || []) {
    if (!predicate(market)) continue;
    const selection = market.selections?.find(item => item.status === "open" && Number(item.odds) > 1 && normalize(item.name) === normalize(selectionName));
    if (selection) return {
      providerMarketId: market.providerMarketId,
      providerSelectionId: selection.providerSelectionId,
      marketCode: market.marketCode,
      marketName: market.marketName,
      variantName: market.variantName,
      selection: selection.name,
      odds: selection.odds,
      replacementIncluded: /SOST|DUO|INC TS/i.test(`${market.marketName} ${market.variantName}`)
    };
  }
  return null;
}

function playerMarket(event, candidate, marketCode, selectionName, threshold = null) {
  const full = tokens(candidate.name), lineup = tokens(candidate.lineupName);
  const surnames = new Set([full.at(-1), lineup.at(-1)].filter(Boolean));
  const matches = (event?.markets || []).filter(market => market.marketCode === marketCode && market.status === "open" && (threshold == null || Number(market.threshold) === Number(threshold))).map(market => {
    const variantTokens = tokens(market.variantName);
    let score = 0;
    for (const surname of surnames) if (variantTokens.includes(surname)) score += 7;
    for (const token of full.slice(0, -1)) if (token.length > 2 && variantTokens.includes(token)) score += 2;
    for (const token of lineup.slice(0, -1)) if (token.length > 2 && variantTokens.includes(token)) score += 1;
    return { market, score };
  }).filter(item => item.score >= 7).sort((a, b) => b.score - a.score);
  if (!matches.length || (matches[1] && matches[1].score === matches[0].score && matches[1].market.variantName !== matches[0].market.variantName)) return null;
  const market = matches[0].market;
  const selection = market.selections?.find(item => item.status === "open" && Number(item.odds) > 1 && normalize(item.name) === normalize(selectionName));
  return selection ? {
    providerMarketId: market.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
    marketCode: market.marketCode,
    marketName: market.marketName,
    variantName: market.variantName,
    selection: selection.name,
    odds: selection.odds,
    replacementIncluded: /SOST|DUO|INC TS/i.test(`${market.marketName} ${market.variantName}`)
  } : null;
}

function buildShooterRows(players, prediction, event) {
  const rows = [];
  for (const side of ["home", "away"]) {
    const teamPlayers = players.filter(player => player.venue === side);
    const teamProjection = prediction.teamProjections.find(item => item.venue === side);
    const total = scaleShotProjections(teamPlayers, "shots", teamProjection?.shotsTotal?.central);
    const target = scaleShotProjections(teamPlayers, "shotsOnTarget", teamProjection?.shotsOnTarget?.central);
    const targetById = new Map(target.map(item => [item.player.playerId, item.projection]));
    for (const item of total) {
      const sot = targetById.get(item.player.playerId) || 0;
      rows.push({
        name: item.player.name,
        lineupName: item.player.lineupName,
        playerId: item.player.playerId,
        team: item.player.team,
        teamId: item.player.teamId,
        role: item.player.role,
        projectedShots: item.projection,
        projectedShotsOnTarget: sot,
        dataStatus: item.player.dataStatus,
        minutes: item.player.minutes,
        markets: {
          shotsOver05: playerMarket(event, item.player, "28507", "OVER", 0.5),
          shotsOver15: playerMarket(event, item.player, "28507", "OVER", 1.5),
          shotsOnTargetOver05: playerMarket(event, item.player, "28506", "OVER", 0.5)
        }
      });
    }
  }
  const totals = [...rows].sort((a, b) => b.projectedShots - a.projectedShots || a.name.localeCompare(b.name, "it"));
  const onTarget = [...rows].sort((a, b) => b.projectedShotsOnTarget - a.projectedShotsOnTarget || a.name.localeCompare(b.name, "it"));
  return {
    totalShots: totals.slice(0, 5).map((row, index) => ({ ...row, rank: index + 1 })),
    shotsOnTarget: onTarget.slice(0, 5).map((row, index) => ({ ...row, rank: index + 1 }))
  };
}

function buildBooked(players, event) {
  const rows = players.filter(player => player.roleKey !== "goalkeeper").map(player => {
    const roleBase = player.roleKey === "defender" ? 1.15 : player.roleKey === "midfielder" ? 0.95 : 0.5;
    const observed = player.per90.cards * 3.6 + player.per90.foulsCommitted * 0.42;
    const reliability = clamp(player.minutes / 1800, 0.3, 1);
    const riskScore = Math.round(clamp((roleBase + observed * (0.55 + reliability * 0.45) + 0.48) * 19, 12, 88));
    const quote = playerMarket(event, player, "28576", "SI");
    return {
      name: player.name,
      lineupName: player.lineupName,
      playerId: player.playerId,
      team: player.team,
      teamId: player.teamId,
      role: player.role,
      riskScore,
      evidence: [`${round(player.per90.cards, 2)} cartellini/90`, `${round(player.per90.foulsCommitted, 2)} falli/90`, player.dataStatus === "role-baseline" ? "baseline di ruolo" : `${player.minutes} minuti nel 2025/26`],
      dataStatus: player.dataStatus,
      sisal: quote
    };
  }).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name, "it"));
  const selected = rows.slice(0, 5);
  for (const team of [...new Set(players.map(player => player.team))]) {
    if (!selected.some(candidate => candidate.team === team)) {
      const replacement = rows.find(candidate => candidate.team === team && !selected.includes(candidate));
      if (replacement) selected[selected.length - 1] = replacement;
    }
  }
  return selected.sort((a, b) => b.riskScore - a.riskScore).map((candidate, index) => ({ ...candidate, rank: index + 1, possibleFirstBooked: index === 0 }));
}

function buildMvp(players, prediction) {
  const rows = players.map(player => {
    const teamProbability = player.venue === "home" ? prediction.probabilities.home : prediction.probabilities.away;
    const expectedGoals = prediction.expectedGoals[player.venue];
    const production = clamp(player.per90.goals / 0.7 * 48 + player.per90.assists / 0.4 * 20 + player.per90.shotsOnTarget / 1.5 * 32, 0, 100);
    const roleFit = player.roleKey === "forward" ? 13 : player.roleKey === "midfielder" ? 8 : player.roleKey === "goalkeeper" ? 3 : 5;
    const tactical = clamp(38 + expectedGoals * 22 + roleFit, 25, 95);
    const reliability = clamp((player.dataStatus === "verified-history" ? 70 : player.dataStatus === "limited-history" ? 48 : 24) + Math.min(20, player.minutes / 120), 0, 100);
    const components = { resultScenario: teamProbability, individualProduction: round(production), historicalRating: 50, officialMvpHistory: 50, tacticalFit: round(tactical), opponentHistory: 50, dataReliability: round(reliability) };
    const score = components.resultScenario * 0.3 + components.individualProduction * 0.2 + components.historicalRating * 0.15 + components.officialMvpHistory * 0.15 + components.tacticalFit * 0.1 + components.opponentHistory * 0.05 + components.dataReliability * 0.05;
    return { ...player, score, components, teamProbability, expectedGoals };
  }).sort((a, b) => b.score - a.score);
  const favoriteSide = prediction.probabilities.home >= prediction.probabilities.away ? "home" : "away";
  const favoriteProbability = prediction.probabilities[favoriteSide];
  const otherProbability = prediction.probabilities[favoriteSide === "home" ? "away" : "home"];
  const favoriteRule = favoriteProbability >= 50 && favoriteProbability - otherProbability >= 15;
  const best = favoriteRule ? rows.find(player => player.venue === favoriteSide) || rows[0] : rows[0];
  const surprise = rows[0] !== best ? rows[0] : null;
  return {
    name: best.name,
    team: best.team,
    teamId: best.teamId,
    role: best.role,
    score: round(best.score),
    confidence: best.components.dataReliability >= 70 ? "alta" : best.components.dataReliability >= 50 ? "moderata" : "prudente",
    evidence: [`${round(best.per90.goals, 2)} gol/90`, `${round(best.per90.assists, 2)} assist/90`, `${round(best.per90.shotsOnTarget, 2)} tiri in porta/90`, `scenario squadra ${round(best.teamProbability)}% vittoria · ${best.expectedGoals.toFixed(2)} gol attesi`],
    components: best.components,
    mvpHistory: { season: "2025-26", provider: "Champions/competizioni domestiche", status: "N/D", awards: null, note: "Nessuno storico MVP Champions omogeneo integrato" },
    selectionRule: favoriteRule ? "favorite-over-50-gap-15" : "scenario-weighted",
    surpriseCandidate: surprise ? { name: surprise.name, team: surprise.team, teamId: surprise.teamId, role: surprise.role, score: round(surprise.score) } : null
  };
}

function findSimpleMarket(event, marketCode, selectionName, variantTest = () => true) {
  return marketSelection(event, market => market.marketCode === marketCode && variantTest(market), selectionName);
}

function candidateLegs(prediction, shooters, booked, event) {
  const favoriteSide = prediction.probabilities.home >= prediction.probabilities.away ? "home" : "away";
  const favoriteSelection = favoriteSide === "home" ? "1X" : "X2";
  const dcProbability = favoriteSide === "home" ? prediction.probabilities.home + prediction.probabilities.draw : prediction.probabilities.away + prediction.probabilities.draw;
  const lambda = prediction.expectedGoals.total;
  const btts = (1 - Math.exp(-prediction.expectedGoals.home)) * (1 - Math.exp(-prediction.expectedGoals.away));
  const legs = [];
  const macroFamily = family => ({ result: "result", "result-full": "result", goals: "goals", "total-goals": "goals", "goal-band": "goals", "team-goal": "goals", corners: "corners", "player-shots": "shots-total", "match-shots": "shots-total", "player-sot": "shots-on-target", "player-card": "cards" }[family] || family);
  const add = (family, label, probability, sisal, source) => { if (sisal?.odds >= 1.10) legs.push({ family, macroFamily: macroFamily(family), label, modelProbabilityPct: round(probability * 100), sisal, source }); };
  add("result", `Doppia chance ${favoriteSelection}`, dcProbability / 100, findSimpleMarket(event, "28319", favoriteSelection), "modello UEFA Elo 1X2");
  const goalSelection = btts >= 0.52 ? "GOAL" : "NOGOAL";
  add("goals", goalSelection === "GOAL" ? "Entrambe segnano" : "Almeno una non segna", goalSelection === "GOAL" ? btts : 1 - btts, findSimpleMarket(event, "18", goalSelection), "Poisson sugli xG");
  add("first-half-result", `Doppia chance ${favoriteSelection} nel 1° tempo`, clamp(0.58 + Math.abs(prediction.probabilities.home - prediction.probabilities.away) / 250, 0.58, 0.82), findSimpleMarket(event, "99987", favoriteSelection, market => /TEMPO 1/i.test(market.variantName)), "scenario 1X2 ridotto al primo tempo");
  const over15 = poissonAtLeast(lambda, 2);
  add("total-goals", "Over 1,5 gol", over15, findSimpleMarket(event, "7989", "OVER", market => Number(market.threshold) === 1.5), "Poisson sugli xG");
  const favoriteOutcome = favoriteSide === "home" ? "1" : "2";
  const favoriteProbability = prediction.probabilities[favoriteSide] / 100;
  add("result-full", `Esito ${favoriteOutcome}`, favoriteProbability, findSimpleMarket(event, "3", favoriteOutcome), "modello UEFA Elo 1X2");
  const multiGoalProbability = poissonAtLeast(lambda, 1) - poissonAtLeast(lambda, 5);
  add("goal-band", "Multigol 1–4", multiGoalProbability, findSimpleMarket(event, "30562", "1-4"), "Poisson sugli xG");
  const homeScores = 1 - Math.exp(-prediction.expectedGoals.home);
  const awayScores = 1 - Math.exp(-prediction.expectedGoals.away);
  const teamScoreSide = homeScores >= awayScores ? "home" : "away";
  const teamScoreSelection = teamScoreSide === "home" ? "165" : "166";
  const teamScoreName = teamScoreSide === "home" ? prediction.homeTeam : prediction.awayTeam;
  add("team-goal", `${teamScoreName} segna`, teamScoreSide === "home" ? homeScores : awayScores, findSimpleMarket(event, teamScoreSelection, "SI"), "Poisson sugli xG squadra");
  const cornerCentral = prediction.matchProjection?.corners?.central;
  if (Number.isFinite(cornerCentral)) {
    const cornerThreshold = Math.max(6.5, Math.floor(cornerCentral - 2) + 0.5);
    add("corners", `Over ${String(cornerThreshold).replace(".", ",")} corner`, 0.7, findSimpleMarket(event, "975", "OVER", market => Number(market.threshold) === cornerThreshold), "volume partita p20-p80");
  }
  const topShot = shooters.totalShots.find(player => player.markets.shotsOver05);
  if (topShot) add("player-shots", `${topShot.name} almeno 1 tiro`, 1 - Math.exp(-topShot.projectedShots), topShot.markets.shotsOver05, "volume giocatore regolarizzato");
  const topSot = shooters.shotsOnTarget.find(player => player.markets.shotsOnTargetOver05);
  if (topSot) add("player-sot", `${topSot.name} almeno 1 tiro in porta`, 1 - Math.exp(-topSot.projectedShotsOnTarget), topSot.markets.shotsOnTargetOver05, "volume giocatore regolarizzato");
  const card = booked.find(player => player.sisal);
  if (card) add("player-card", `${card.name} cartellino`, clamp(card.riskScore / 150, 0.12, 0.5), card.sisal, "indice disciplinare comparativo");
  const totalShots = prediction.matchProjection?.shotsTotal?.central;
  if (Number.isFinite(totalShots)) {
    const threshold = Math.max(17.5, Math.floor(totalShots - 4) + 0.5);
    add("match-shots", `Over ${String(threshold).replace(".", ",")} tiri totali`, 0.72, findSimpleMarket(event, "15859", "OVER", market => Number(market.threshold) === threshold), "volume partita p20-p80");
  }
  return legs;
}

function buildCombinations(prediction, shooters, booked, event) {
  const candidates = candidateLegs(prediction, shooters, booked, event);
  const definitions = [
    { tier: "Safe", scenario: "Prudente", risk: "basso", count: 3, targetOdds: 5, offset: 0 },
    { tier: "Balanced", scenario: "Equilibrata", risk: "medio", count: 4, targetOdds: 10, offset: 1 },
    { tier: "Aggressive", scenario: "Più selettiva", risk: "alto", count: 5, targetOdds: 20, offset: 2 }
  ];
  const selectionUsage = new Map(), familyUsage = new Map();
  return definitions.map((definition, definitionIndex) => {
    const start = Math.min(definition.offset, Math.max(0, candidates.length - definition.count));
    const selected = [];
    const usedFamilies = new Set();
    for (const candidate of [...candidates.slice(start), ...candidates.slice(0, start)].sort((a,b) => (selectionUsage.get(a.sisal.providerSelectionId)||0)-(selectionUsage.get(b.sisal.providerSelectionId)||0) || (familyUsage.get(a.family)||0)-(familyUsage.get(b.family)||0))) {
      if (usedFamilies.has(candidate.macroFamily)) continue;
      selected.push(candidate);
      usedFamilies.add(candidate.macroFamily);
      if (selected.length === definition.count) break;
    }
    for (const candidate of selected) {
      selectionUsage.set(candidate.sisal.providerSelectionId, (selectionUsage.get(candidate.sisal.providerSelectionId)||0)+1);
      familyUsage.set(candidate.family, (familyUsage.get(candidate.family)||0)+1);
    }
    const combinedOdds = selected.reduce((value, leg) => value * leg.sisal.odds, 1);
    const modelProbability = selected.reduce((value, leg) => value * leg.modelProbabilityPct / 100, 1) * Math.pow(0.94, Math.max(0, selected.length - 1));
    return {
      ...definition,
      quotaPolicy: "orientativa",
      minimumSelectionOdds: 1.10,
      odds: round(combinedOdds, 2),
      qualityStatus: selected.length >= 3 ? "editoriale" : "nd",
      legs: selected.map(leg => ({ label: leg.label, odds: leg.sisal.odds, modelProbabilityPct: leg.modelProbabilityPct, marketCode: leg.sisal.marketCode, marketName: leg.sisal.marketName, variantName: leg.sisal.variantName, providerMarketId: leg.sisal.providerMarketId, providerSelectionId: leg.sisal.providerSelectionId, replacementIncluded: leg.sisal.replacementIncluded, source: leg.source })),
      prudentProbabilityPct: selected.length ? round(modelProbability * 100, 2) : null,
      fairOdds: modelProbability ? round(1 / modelProbability, 2) : null,
      probabilityMethod: "Selezioni ordinate dal modello; le quote Sisal vengono collegate soltanto dopo e non modificano la scelta.",
      unavailableReason: selected.length >= 3 ? null : "Meno di tre mercati Sisal compatibili con le proiezioni indipendenti."
    };
  });
}

const fixtures = predictions.fixtures.map(prediction => {
  const fixture = calendarByFixture.get(prediction.fixtureId);
  const event = oddsByFixture.get(prediction.fixtureId);
  const players = lineupCandidates(fixture, prediction);
  const shooters = buildShooterRows(players, prediction, event);
  const likelyBooked = buildBooked(players, event);
  const mvpCandidate = buildMvp(players, prediction);
  const combinations = buildCombinations(prediction, shooters, likelyBooked, event);
  return {
    fixtureId: prediction.fixtureId,
    homeTeam: prediction.homeTeam,
    awayTeam: prediction.awayTeam,
    likelyBooked,
    mvpCandidate,
    shooters,
    combinations,
    coverage: {
      lineupPlayers: players.length,
      verifiedPlayerHistories: players.filter(player => player.dataStatus === "verified-history").length,
      limitedPlayerHistories: players.filter(player => player.dataStatus === "limited-history").length,
      roleBaselines: players.filter(player => player.dataStatus === "role-baseline").length,
      cardMarkets: likelyBooked.filter(player => player.sisal).length,
      shooterMarkets: new Set([...shooters.totalShots, ...shooters.shotsOnTarget].flatMap(player => Object.values(player.markets).filter(Boolean).map(market => market.providerSelectionId))).size,
      sisalEventMatched: Boolean(event)
    }
  };
});

const output = {
  schemaVersion: 1,
  competition: "UEFA Champions League",
  season: "2026/27",
  matchday: 1,
  generatedAt: new Date().toISOString(),
  oddsRetrievedAt: odds.retrievedAt,
  modelPolicy: "Pronostici, gerarchie e candidati sono calcolati prima dell'associazione alle quote. Le quote Sisal sono solo prezzi numerici esterni e non orientano la selezione.",
  methodology: {
    booked: "Stesso impianto Serie A: ruolo, cartellini e falli per 90 minuti regolarizzati, con graduatoria unica e presenza di entrambe le squadre.",
    mvp: "Stessi pesi Serie A su scenario risultato, produzione individuale, fit tattico e affidabilità; lo storico MVP Champions omogeneo resta N/D.",
    shooters: "Tiri e tiri in porta per 90 minuti regolarizzati per ruolo, scalati sui volumi previsti della squadra e limitati ai probabili titolari.",
    myCombo: "Tre profili per partita costruiti con mercati compatibili e sostituto incluso quando previsto; niente DNB, confronti giocatore, prima a corner, X primo tempo/finale o quasi ammonito."
  },
  summary: {
    fixtures: fixtures.length,
    completeLineups: fixtures.filter(fixture => fixture.coverage.lineupPlayers === 22).length,
    matchedOddsEvents: fixtures.filter(fixture => fixture.coverage.sisalEventMatched).length,
    actualCardQuotes: fixtures.reduce((sum, fixture) => sum + fixture.coverage.cardMarkets, 0),
    actualShooterQuotes: fixtures.reduce((sum, fixture) => sum + fixture.coverage.shooterMarkets, 0),
    usableMyCombos: fixtures.reduce((sum, fixture) => sum + fixture.combinations.filter(combo => combo.qualityStatus !== "nd").length, 0)
  },
  fixtures
};

write("data/normalized/champions-player-markets-md01-2026-27.json", output);
console.log(`Champions player markets: ${output.summary.fixtures} gare, ${output.summary.completeLineups} XI completi, ${output.summary.usableMyCombos} MyCombo utilizzabili.`);
