"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const resultModel = read("data/normalized/champions-1x2-2026-27.json");
const odds = read("data/normalized/odds/sisal/champions-league.json");
const outputPath = path.join(root, "data/normalized/champions-pilot-predictions-2026-27.json");
const pilotTeams = new Set(source.teams.map(team => team.id));
const nameToId = new Map(source.teams.map(team => [team.name, team.id]));
const metrics = ["goals", "totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted", "yellowCards"];
const round = (value, digits = 2) => Number(value.toFixed(digits));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function quantile(values, probability) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const low = Math.floor(index), high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function summarize(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return { matches: 0, mean: null, sd: null, p20: null, median: null, p80: null };
  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length;
  return { matches: clean.length, mean: round(mean, 3), sd: round(Math.sqrt(variance), 3), p20: round(quantile(clean, 0.2), 3), median: round(quantile(clean, 0.5), 3), p80: round(quantile(clean, 0.8), 3) };
}

function sourceSideRows() {
  return source.matches.flatMap(match => [
    { league: match.league, venue: "home", for: { goals: match.home.score, ...match.home.statistics }, against: { goals: match.away.score, ...match.away.statistics } },
    { league: match.league, venue: "away", for: { goals: match.away.score, ...match.away.statistics }, against: { goals: match.home.score, ...match.home.statistics } }
  ]);
}

const allSourceSides = sourceSideRows();
function leagueBaseline(league, venue) {
  const rows = allSourceSides.filter(row => row.league === league && (venue === "overall" || row.venue === venue));
  return Object.fromEntries(metrics.map(metric => [metric, {
    for: summarize(rows.map(row => row.for[metric])),
    against: summarize(rows.map(row => row.against[metric]))
  }]));
}

const leagueBaselines = source.teams.reduce((output, team) => {
  if (!output[team.league]) output[team.league] = {
    league: team.league,
    leagueName: team.leagueName,
    matches: source.matches.filter(match => match.league === team.league).length,
    venues: { overall: leagueBaseline(team.league, "overall"), home: leagueBaseline(team.league, "home"), away: leagueBaseline(team.league, "away") }
  };
  return output;
}, {});

function teamRows(team) {
  const rows = [];
  for (const match of source.matches) {
    const side = match.home.providerTeamId === team.espnTeamId ? "home" : match.away.providerTeamId === team.espnTeamId ? "away" : null;
    if (!side) continue;
    const own = match[side], opponent = match[side === "home" ? "away" : "home"];
    rows.push({
      eventId: match.eventId,
      date: match.date,
      season: match.season,
      venue: side,
      for: { goals: own.score, ...own.statistics },
      against: { goals: opponent.score, ...opponent.statistics }
    });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function profile(team) {
  const rows = teamRows(team);
  const venue = key => {
    const selected = key === "overall" ? rows : rows.filter(row => row.venue === key);
    return Object.fromEntries(metrics.map(metric => [metric, { for: summarize(selected.map(row => row.for[metric])), against: summarize(selected.map(row => row.against[metric])) }]));
  };
  const recentRows = rows.slice(-8).reverse();
  const recent = Object.fromEntries(metrics.map(metric => {
    let totalWeight = 0, produced = 0, conceded = 0;
    recentRows.forEach((row, index) => {
      const weight = 0.82 ** index;
      totalWeight += weight;
      produced += row.for[metric] * weight;
      conceded += row.against[metric] * weight;
    });
    return [metric, { matches: recentRows.length, decay: 0.82, for: { ...summarize(recentRows.map(row => row.for[metric])), weightedMean: round(produced / totalWeight, 3) }, against: { ...summarize(recentRows.map(row => row.against[metric])), weightedMean: round(conceded / totalWeight, 3) } }];
  }));
  return { teamId: team.id, team: team.name, league: team.leagueName, leagueCode: team.league, matches: rows.length, currentSeasonMatches: rows.filter(row => row.season === "2026-27").length, venues: { overall: venue("overall"), home: venue("home"), away: venue("away") }, recent };
}

const profiles = source.teams.map(profile);
const profileById = new Map(profiles.map(item => [item.teamId, item]));

function blendMetric(team, opponent, venue, metric, floor = 0) {
  const opposite = venue === "home" ? "away" : "home";
  const ownBaseline = leagueBaselines[team.leagueCode].venues[venue][metric].for.mean;
  const opponentBaseline = leagueBaselines[opponent.leagueCode].venues[opposite][metric].against.mean;
  const recentBaseline = leagueBaselines[team.leagueCode].venues.overall[metric].for.mean;
  const targetBaseline = (ownBaseline + opponentBaseline) / 2;
  const reliability = team.currentSeasonMatches / (team.currentSeasonMatches + 6);
  const recentWeight = 0.2 * reliability;
  const unusedRecentWeight = 0.2 - recentWeight;
  const ownWeight = 0.45 + unusedRecentWeight * 0.5625;
  const opponentWeight = 0.35 + unusedRecentWeight * 0.4375;
  const inputs = [
    { label: `${team.team} ${venue === "home" ? "in casa" : "in trasferta"}`, value: team.venues[venue][metric].for.mean / ownBaseline * targetBaseline, sd: team.venues[venue][metric].for.sd / ownBaseline * targetBaseline, weight: ownWeight },
    { label: `${opponent.team} concede ${opposite === "home" ? "in casa" : "in trasferta"}`, value: opponent.venues[opposite][metric].against.mean / opponentBaseline * targetBaseline, sd: opponent.venues[opposite][metric].against.sd / opponentBaseline * targetBaseline, weight: opponentWeight },
    { label: `ultime ${team.recent[metric].matches} ${team.team}`, value: team.recent[metric].for.weightedMean / recentBaseline * targetBaseline, sd: team.recent[metric].for.sd / recentBaseline * targetBaseline, weight: recentWeight }
  ].filter(item => Number.isFinite(item.value));
  const weight = inputs.reduce((sum, input) => sum + input.weight, 0);
  const central = inputs.reduce((sum, input) => sum + input.value * input.weight, 0) / weight;
  const sd = Math.max(0.45, inputs.reduce((sum, input) => sum + (input.sd || 0) * input.weight, 0) / weight);
  return { central: round(Math.max(floor, central)), sd: round(sd), min: round(Math.max(floor, central - 0.84 * sd), 1), max: round(central + 0.84 * sd, 1), interval: "p20-p80-approx", normalization: { method: "relative-to-domestic-league", targetBaseline: round(targetBaseline, 3), currentSeasonReliabilityPct: round(reliability * 100, 1) }, inputs: inputs.map(input => ({ label: input.label, value: round(input.value, 3), weightPct: round(input.weight / weight * 100, 1) })) };
}

function poisson(k, lambda) {
  let factorial = 1;
  for (let n = 2; n <= k; n += 1) factorial *= n;
  return Math.exp(-lambda) * lambda ** k / factorial;
}

function scoreProbabilities(homeGoals, awayGoals) {
  const rows = [];
  for (let home = 0; home <= 9; home += 1) for (let away = 0; away <= 9; away += 1) rows.push({ home, away, probability: poisson(home, homeGoals) * poisson(away, awayGoals) });
  const total = rows.reduce((sum, row) => sum + row.probability, 0);
  return rows.map(row => ({ ...row, probability: row.probability / total }));
}

function outcomes(matrix) {
  return {
    home: matrix.filter(row => row.home > row.away).reduce((sum, row) => sum + row.probability, 0),
    draw: matrix.filter(row => row.home === row.away).reduce((sum, row) => sum + row.probability, 0),
    away: matrix.filter(row => row.home < row.away).reduce((sum, row) => sum + row.probability, 0)
  };
}

function fitGoals(totalPrior, target) {
  let best = null;
  for (let home = 0.3; home <= 3.8; home += 0.025) {
    for (let away = 0.3; away <= 3.8; away += 0.025) {
      const matrix = scoreProbabilities(home, away);
      const result = outcomes(matrix);
      const probabilityLoss = (result.home - target.home) ** 2 + (result.draw - target.draw) ** 2 + (result.away - target.away) ** 2;
      const totalLoss = ((home + away - totalPrior) / 3) ** 2;
      const loss = probabilityLoss * 0.82 + totalLoss * 0.18;
      if (!best || loss < best.loss) best = { home, away, matrix, result, loss };
    }
  }
  return best;
}

function countCdf(threshold, mean, variance) {
  const maximum = Math.floor(threshold);
  if (!(mean > 0)) return 1;
  if (!(variance > mean + 0.05)) return Array.from({ length: maximum + 1 }, (_, k) => poisson(k, mean)).reduce((sum, value) => sum + value, 0);
  const r = mean ** 2 / (variance - mean);
  const p = r / (r + mean);
  let pmf = p ** r, total = pmf;
  for (let k = 1; k <= maximum; k += 1) {
    pmf *= ((k - 1 + r) / k) * (1 - p);
    total += pmf;
  }
  return total;
}

function overLines(metric, thresholds) {
  const variance = Math.max(metric.central, metric.sd ** 2);
  return thresholds.map(threshold => ({ threshold, overPct: round((1 - countCdf(threshold, metric.central, variance)) * 100, 1), underPct: round(countCdf(threshold, metric.central, variance) * 100, 1) }));
}

function goalLines(matrix) {
  return [1.5, 2.5, 3.5].map(threshold => {
    const under = matrix.filter(row => row.home + row.away <= Math.floor(threshold)).reduce((sum, row) => sum + row.probability, 0);
    return { threshold, overPct: round((1 - under) * 100, 1), underPct: round(under * 100, 1) };
  });
}

const pilotFixtures = calendar.fixtures.filter(fixture => fixture.matchday === 1 && nameToId.has(fixture.homeTeam) && nameToId.has(fixture.awayTeam));
const resultByFixture = new Map(resultModel.fixtures.map(item => [item.fixtureId, item]));
const oddsByFixture = new Map(odds.events.filter(item => item.canonicalMatchId).map(item => [item.canonicalMatchId, item]));
const selectionOdds = market => Object.fromEntries((market?.selections || []).filter(item => item.status === "open").map(item => [item.name, item.odds]));
function normalizedMarket(market) {
  const prices = selectionOdds(market);
  const total = Object.values(prices).reduce((sum, price) => sum + 1 / price, 0);
  return Object.fromEntries(Object.entries(prices).map(([name, price]) => [name, { odds: price, noMarginPct: round(100 / price / total, 1) }]));
}
const fixtures = pilotFixtures.map(fixture => {
  const home = profileById.get(nameToId.get(fixture.homeTeam));
  const away = profileById.get(nameToId.get(fixture.awayTeam));
  const result = resultByFixture.get(fixture.id);
  const oddsEvent = oddsByFixture.get(fixture.id) || null;
  const resultMarket = oddsEvent?.markets.find(market => market.marketName === "1X2 ESITO FINALE") || null;
  const resultPrices = normalizedMarket(resultMarket);
  const rawHomeGoals = blendMetric(home, away, "home", "goals", 0.2);
  const rawAwayGoals = blendMetric(away, home, "away", "goals", 0.2);
  const totalPrior = clamp(rawHomeGoals.central + rawAwayGoals.central, 1.6, 4.2);
  const fitted = fitGoals(totalPrior, result.probabilities);
  const teamProjections = [
    { teamId: home.teamId, team: home.team, venue: "home", expectedGoals: round(fitted.home), shotsTotal: blendMetric(home, away, "home", "totalShots"), shotsOnTarget: blendMetric(home, away, "home", "shotsOnTarget"), corners: blendMetric(home, away, "home", "wonCorners"), fouls: blendMetric(home, away, "home", "foulsCommitted"), cards: blendMetric(home, away, "home", "yellowCards") },
    { teamId: away.teamId, team: away.team, venue: "away", expectedGoals: round(fitted.away), shotsTotal: blendMetric(away, home, "away", "totalShots"), shotsOnTarget: blendMetric(away, home, "away", "shotsOnTarget"), corners: blendMetric(away, home, "away", "wonCorners"), fouls: blendMetric(away, home, "away", "foulsCommitted"), cards: blendMetric(away, home, "away", "yellowCards") }
  ];
  teamProjections.forEach(team => {
    team.lines = { shotsTotal: overLines(team.shotsTotal, [8.5, 10.5, 12.5, 14.5, 16.5]), shotsOnTarget: overLines(team.shotsOnTarget, [2.5, 3.5, 4.5, 5.5, 6.5]), corners: overLines(team.corners, [3.5, 4.5, 5.5, 6.5]) };
  });
  const matchCards = { central: round(teamProjections[0].cards.central + teamProjections[1].cards.central), sd: round(Math.sqrt(teamProjections[0].cards.sd ** 2 + teamProjections[1].cards.sd ** 2)) };
  const exactScores = [...fitted.matrix].sort((a, b) => b.probability - a.probability).slice(0, 3).map(row => ({ score: `${row.home}-${row.away}`, probabilityPct: round(row.probability * 100, 1) }));
  return {
    fixtureId: fixture.id,
    date: fixture.date,
    kickoff: fixture.kickoff,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    status: "preliminary-no-odds",
    probabilities: result.displayPercentages,
    favorite: result.favorite,
    confidence: result.confidence,
    expectedGoals: { home: round(fitted.home), away: round(fitted.away), total: round(fitted.home + fitted.away), domesticTotalPrior: round(totalPrior), method: "lambda Poisson adattate alle probabilità 1X2 UEFA con prior gol domestico" },
    exactScores,
    goals: goalLines(fitted.matrix).map(line => {
      const market = oddsEvent?.markets.find(item => item.marketName === "UNDER/OVER" && Number(item.threshold) === line.threshold);
      const prices = normalizedMarket(market);
      return { ...line, market: prices.OVER && prices.UNDER ? { overOdds: prices.OVER.odds, underOdds: prices.UNDER.odds, overNoMarginPct: prices.OVER.noMarginPct, underNoMarginPct: prices.UNDER.noMarginPct, overEdgePct: round(line.overPct - prices.OVER.noMarginPct, 1), underEdgePct: round(line.underPct - prices.UNDER.noMarginPct, 1) } : null };
    }),
    teamProjections,
    cards: { ...matchCards, lines: overLines(matchCards, [3.5, 4.5, 5.5]), refereeAdjustment: null, refereeStatus: "N/D · designazione non integrata" },
    market: {
      provider: oddsEvent ? "Sisal" : null,
      retrievedAt: oddsEvent ? odds.retrievedAt : null,
      result1x2: ["1", "X", "2"].map((selection, index) => {
        const modelPct = [result.displayPercentages.home, result.displayPercentages.draw, result.displayPercentages.away][index];
        const price = resultPrices[selection];
        return { selection, modelPct, odds: price?.odds ?? null, noMarginPct: price?.noMarginPct ?? null, edgePct: price ? round(modelPct - price.noMarginPct, 1) : null };
      }),
      requestedVolumeMarketsAvailable: Boolean(oddsEvent?.markets.some(item => /TIRI TOTALI|TIRI IN PORTA|U\/O CORNER|CARTELLINI/.test(item.marketName)))
    },
    dataQuality: { teamSamples: [home.matches, away.matches], currentSeasonSamples: [home.currentSeasonMatches, away.currentSeasonMatches], odds: oddsEvent ? odds.retrievedAt : "N/D", lineups: "N/D", referee: "N/D", label: "pilot statistico" }
  };
});

if (fixtures.length !== 4) throw new Error(`Pilot Champions incompleto: attese 4 gare, trovate ${fixtures.length}`);
const output = {
  schemaVersion: 1,
  competition: "champions-league",
  season: "2026-27",
  generatedAt: [source.retrievedAt, odds.retrievedAt].filter(Boolean).sort().at(-1),
  status: "experimental-pilot-partial-odds",
  scope: "Prima giornata, sole gare delle quattro squadre italiane",
  warning: "Stime preliminari indipendenti dalle quote. Volumi e cartellini usano baseline normalizzate dei cinque campionati domestici e pesi recenti legati all'affidabilità del campione. Assenze, probabili formazioni e arbitri non sono ancora integrati.",
  methodology: {
    result: "Modello UEFA Elo 1X2 già validato cronologicamente.",
    goals: "Poisson: totale iniziale dai gol prodotti/concessi per sede e forma recente; lambda adattate alle probabilità 1X2 senza usare quote.",
    volumes: "Produzione per sede e volume concesso sono normalizzati rispetto alle baseline complete dei cinque campionati. Il peso recente massimo del 20% è ridotto in base all'affidabilità delle gare 2026/27; intervallo p20-p80 approssimato dalla dispersione osservata.",
    cards: "Cartellini gialli di squadra con lo stesso blending; distribuzione negativa binomiale quando la varianza supera la media, altrimenti Poisson. Nessun correttivo arbitrale.",
    thresholdPolicy: "Le probabilità sulle soglie sono diagnostiche e non costituiscono selezioni di valore finché non sono disponibili quote aggiornate."
  },
  coverage: { fixtures: fixtures.length, teams: profiles.length, sourceMatches: source.summary.matches, completeSourceMatches: source.summary.completeMatches, leagueBaselineMatches: Object.fromEntries(Object.values(leagueBaselines).map(item => [item.league, item.matches])), oddsMatched: fixtures.filter(item => item.market.provider).length, resultOdds: fixtures.filter(item => item.market.result1x2.every(row => row.odds)).length, goalOdds: fixtures.filter(item => item.goals.every(row => row.market)).length, requestedVolumeOdds: fixtures.filter(item => item.market.requestedVolumeMarketsAvailable).length, referees: 0, probableLineups: 0 },
  leagueBaselines,
  profiles,
  fixtures
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici pilot Champions: ${fixtures.length} gare · ${profiles.length} profili · ${source.summary.completeMatches} referti completi`);
