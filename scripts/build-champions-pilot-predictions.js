"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const championsHistory = read("data/normalized/champions-history-2023-26.json");
const resultModel = read("data/normalized/champions-1x2-2026-27.json");
const motivation = read("data/normalized/champions-motivation-md01-2026-27.json");
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
    if (match.coverage !== "complete") continue;
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
  const homeMatches = rows.filter(row => row.venue === "home").length;
  const awayMatches = rows.filter(row => row.venue === "away").length;
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
  const venues = { overall: venue("overall"), home: venue("home"), away: venue("away") };
  const usableForDetailedVolumes = rows.length >= 6 && homeMatches >= 2 && awayMatches >= 2 && metrics.every(metric =>
    [venues.overall, venues.home, venues.away].every(split => Number.isFinite(split[metric].for.mean) && Number.isFinite(split[metric].against.mean))
  );
  return { teamId: team.id, team: team.name, league: team.leagueName, leagueCode: team.league, baselineKind: team.baselineKind || "domestic", matches: rows.length, homeMatches, awayMatches, currentSeasonMatches: rows.filter(row => row.season === "2026-27").length, usableForDetailedVolumes, venues, recent };
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

function goalBand(matrix) {
  const totals = new Map();
  for (const row of matrix) totals.set(row.home + row.away, (totals.get(row.home + row.away) || 0) + row.probability);
  const ordered = [...totals.entries()].sort((a, b) => a[0] - b[0]);
  const quantileTotal = probability => {
    let cumulative = 0;
    for (const [goals, chance] of ordered) {
      cumulative += chance;
      if (cumulative >= probability) return goals;
    }
    return ordered.at(-1)?.[0] ?? null;
  };
  const min = quantileTotal(0.2), max = quantileTotal(0.8);
  const probabilityPct = ordered.filter(([goals]) => goals >= min && goals <= max).reduce((sum, [, chance]) => sum + chance, 0) * 100;
  return { min, max, probabilityPct: round(probabilityPct, 1), interval: "p20-p80" };
}

function scoreForecast(matrix, selection, resultProbabilities) {
  const ordered = [...matrix].sort((a, b) => b.probability - a.probability || a.home + a.away - b.home - b.away);
  const outcomeOf = score => score.home > score.away ? "1" : score.home === score.away ? "X" : "2";
  const outcomeProbability = outcome => ({ "1": resultProbabilities.home, X: resultProbabilities.draw, "2": resultProbabilities.away })[outcome];
  const selectionProbability = selection.outcomes.reduce((total, outcome) => total + outcomeProbability(outcome), 0);
  const decorate = (score, label) => {
    const outcome = outcomeOf(score);
    return {
      score: `${score.home}-${score.away}`,
      outcome,
      label,
      probabilityPct: round(score.probability * 100, 1),
      conditionalProbabilityPct: round(score.probability / (selection.outcomes.includes(outcome) ? selectionProbability : outcomeProbability(outcome)) * 100, 1),
      isAbsoluteMode: score === ordered[0]
    };
  };
  const primaryScore = ordered.find(score => selection.outcomes.includes(outcomeOf(score)));
  const modalScore = ordered[0];
  const primary = decorate(primaryScore, `Coerente con ${selection.outcome}`);
  const modal = decorate(modalScore, "Moda assoluta");
  const display = [primary];
  if (modal.score !== primary.score) display.push(modal);
  for (const score of ordered) {
    if (display.length === 3) break;
    if (!display.some(item => item.score === `${score.home}-${score.away}`)) display.push(decorate(score, "Alternativa"));
  }
  return {
    primary,
    modal,
    alternatives: display.slice(1),
    display,
    coherentWithVerdict: selection.outcomes.includes(primary.outcome),
    method: "Il risultato principale è il punteggio più probabile compatibile con la selezione consigliata; nelle gare aperte la selezione include il pareggio tramite 1X o X2."
  };
}

const historicalOpeningFixtures = championsHistory.matches.filter(match =>
  match.status === "finished" &&
  match.matchday === 1 &&
  ["Group stage", "League phase"].includes(match.roundName) &&
  Number.isFinite(match.score90?.home) &&
  Number.isFinite(match.score90?.away)
);
const historicalOpeningTotalPrior = historicalOpeningFixtures.reduce((sum, match) => sum + match.score90.home + match.score90.away, 0) / historicalOpeningFixtures.length;
if (!Number.isFinite(historicalOpeningTotalPrior) || historicalOpeningFixtures.length < 50) throw new Error("Baseline gol Champions della prima giornata insufficiente");

const pilotFixtures = calendar.fixtures.filter(fixture => fixture.matchday === 1);
const resultByFixture = new Map(resultModel.fixtures.map(item => [item.fixtureId, item]));
const motivationByFixture = new Map(motivation.fixtures.map(item => [item.matchId, item]));
const oddsByFixture = new Map(odds.events.filter(item => item.canonicalMatchId).map(item => [item.canonicalMatchId, item]));
const selectionOdds = market => Object.fromEntries((market?.selections || []).filter(item => item.status === "open").map(item => [item.name, item.odds]));
function normalizedMarket(market) {
  const prices = selectionOdds(market);
  const total = Object.values(prices).reduce((sum, price) => sum + 1 / price, 0);
  return Object.fromEntries(Object.entries(prices).map(([name, price]) => [name, { odds: price, noMarginPct: round(100 / price / total, 1) }]));
}
const fixtures = pilotFixtures.map(fixture => {
  const home = profileById.get(nameToId.get(fixture.homeTeam)) || null;
  const away = profileById.get(nameToId.get(fixture.awayTeam)) || null;
  const detailedVolumesAvailable = Boolean(home?.usableForDetailedVolumes && away?.usableForDetailedVolumes);
  const result = resultByFixture.get(fixture.id);
  const fixtureMotivation = motivationByFixture.get(fixture.id) || null;
  const oddsEvent = oddsByFixture.get(fixture.id) || null;
  const resultMarket = oddsEvent?.markets.find(market => market.marketName === "1X2 ESITO FINALE") || null;
  const resultPrices = normalizedMarket(resultMarket);
  const rawHomeGoals = detailedVolumesAvailable ? blendMetric(home, away, "home", "goals", 0.2) : null;
  const rawAwayGoals = detailedVolumesAvailable ? blendMetric(away, home, "away", "goals", 0.2) : null;
  const totalPrior = detailedVolumesAvailable
    ? clamp(rawHomeGoals.central + rawAwayGoals.central, 1.6, 4.2)
    : clamp(historicalOpeningTotalPrior, 1.6, 4.2);
  const fitted = fitGoals(totalPrior, result.probabilities);
  const teamProjections = [
    { teamId: home?.teamId || null, team: fixture.homeTeam, venue: "home", expectedGoals: round(fitted.home), shotsTotal: detailedVolumesAvailable ? blendMetric(home, away, "home", "totalShots") : null, shotsOnTarget: detailedVolumesAvailable ? blendMetric(home, away, "home", "shotsOnTarget") : null, corners: detailedVolumesAvailable ? blendMetric(home, away, "home", "wonCorners") : null, fouls: detailedVolumesAvailable ? blendMetric(home, away, "home", "foulsCommitted") : null, cards: detailedVolumesAvailable ? blendMetric(home, away, "home", "yellowCards") : null },
    { teamId: away?.teamId || null, team: fixture.awayTeam, venue: "away", expectedGoals: round(fitted.away), shotsTotal: detailedVolumesAvailable ? blendMetric(away, home, "away", "totalShots") : null, shotsOnTarget: detailedVolumesAvailable ? blendMetric(away, home, "away", "shotsOnTarget") : null, corners: detailedVolumesAvailable ? blendMetric(away, home, "away", "wonCorners") : null, fouls: detailedVolumesAvailable ? blendMetric(away, home, "away", "foulsCommitted") : null, cards: detailedVolumesAvailable ? blendMetric(away, home, "away", "yellowCards") : null }
  ];
  teamProjections.forEach(team => {
    team.lines = detailedVolumesAvailable ? { shotsTotal: overLines(team.shotsTotal, [8.5, 10.5, 12.5, 14.5, 16.5]), shotsOnTarget: overLines(team.shotsOnTarget, [2.5, 3.5, 4.5, 5.5, 6.5]), corners: overLines(team.corners, [3.5, 4.5, 5.5, 6.5]) } : { shotsTotal: [], shotsOnTarget: [], corners: [] };
  });
  const combinedMetric = metric => ({
    central: round(teamProjections[0][metric].central + teamProjections[1][metric].central, 1),
    min: round(teamProjections[0][metric].min + teamProjections[1][metric].min, 1),
    max: round(teamProjections[0][metric].max + teamProjections[1][metric].max, 1),
    interval: "p20-p80-independent"
  });
  const matchProjection = detailedVolumesAvailable ? { shotsTotal: combinedMetric("shotsTotal"), shotsOnTarget: combinedMetric("shotsOnTarget"), corners: combinedMetric("corners") } : null;
  const matchCards = detailedVolumesAvailable ? { central: round(teamProjections[0].cards.central + teamProjections[1].cards.central), sd: round(Math.sqrt(teamProjections[0].cards.sd ** 2 + teamProjections[1].cards.sd ** 2)) } : null;
  const selection = result.recommendation || { outcome: result.favorite, outcomes: [result.favorite], probabilityPct: round(Math.max(...Object.values(result.probabilities)) * 100, 1) };
  const scores = scoreForecast(fitted.matrix, selection, result.probabilities);
  const exactScores = scores.display;
  return {
    fixtureId: fixture.id,
    date: fixture.date,
    kickoff: fixture.kickoff,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    status: detailedVolumesAvailable ? "experimental-detailed" : "experimental-result-goals",
    probabilities: result.displayPercentages,
    motivation: fixtureMotivation,
    favorite: result.favorite,
    confidence: result.confidence,
    expectedGoals: { home: round(fitted.home), away: round(fitted.away), total: round(fitted.home + fitted.away), domesticTotalPrior: detailedVolumesAvailable ? round(totalPrior) : null, championsOpeningTotalPrior: detailedVolumesAvailable ? null : round(historicalOpeningTotalPrior), method: detailedVolumesAvailable ? "lambda Poisson adattate alle probabilità 1X2 UEFA con prior gol domestico" : "lambda Poisson adattate alle probabilità 1X2 UEFA con prior storico della prima giornata Champions" },
    goalBand: goalBand(fitted.matrix),
    exactScores,
    scoreForecast: scores,
    verdict: {
      outcome: selection.outcome,
      outcomes: selection.outcomes,
      probabilityPct: selection.probabilityPct,
      label: selection.outcome === "1" ? fixture.homeTeam : selection.outcome === "2" ? fixture.awayTeam : selection.outcome === "X" ? "Pareggio" : selection.outcome === "1X" ? `${fixture.homeTeam} o pareggio` : `Pareggio o ${fixture.awayTeam}`
    },
    surprise: { value: null, level: "N/D", status: "unavailable" },
    goals: goalLines(fitted.matrix).map(line => {
      const market = oddsEvent?.markets.find(item => item.marketName === "UNDER/OVER" && Number(item.threshold) === line.threshold);
      const prices = normalizedMarket(market);
      return { ...line, market: prices.OVER && prices.UNDER ? { overOdds: prices.OVER.odds, underOdds: prices.UNDER.odds, overNoMarginPct: prices.OVER.noMarginPct, underNoMarginPct: prices.UNDER.noMarginPct, overEdgePct: round(line.overPct - prices.OVER.noMarginPct, 1), underEdgePct: round(line.underPct - prices.UNDER.noMarginPct, 1) } : null };
    }),
    teamProjections,
    matchProjection,
    likelyBooked: [],
    mvpCandidate: null,
    combinations: [],
    decisionSupport: { status: "unavailable", scenarios: [], correlationGraph: null },
    cards: matchCards ? { ...matchCards, lines: overLines(matchCards, [3.5, 4.5, 5.5]), refereeAdjustment: null, refereeStatus: "N/D · designazione non integrata", disciplinaryMotivationAdjustment: fixtureMotivation ? { home: fixtureMotivation.home.motivation.modelAdjustments.disciplinaryMotivationAdjustment, away: fixtureMotivation.away.motivation.modelAdjustments.disciplinaryMotivationAdjustment, applied: false } : null } : { central: null, sd: null, lines: [], refereeAdjustment: null, refereeStatus: "N/D · profili squadra non integrati", disciplinaryMotivationAdjustment: null },
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
    dataQuality: { detailedVolumesAvailable, teamSamples: detailedVolumesAvailable ? [home.matches, away.matches] : ["N/D", "N/D"], currentSeasonSamples: detailedVolumesAvailable ? [home.currentSeasonMatches, away.currentSeasonMatches] : ["N/D", "N/D"], odds: oddsEvent ? odds.retrievedAt : "N/D", lineups: fixture.probableFormation?.home.players?.length === 11 && fixture.probableFormation?.away.players?.length === 11 ? "undici editoriali disponibili · non applicati al modello" : fixture.probableFormation ? "moduli probabili disponibili · undici N/D" : "N/D", referee: "N/D", label: detailedVolumesAvailable ? "pilot statistico completo" : "pronostico risultato e gol" }
  };
});

if (fixtures.length !== 18) throw new Error(`Prima giornata Champions incompleta: attese 18 gare, trovate ${fixtures.length}`);
const output = {
  schemaVersion: 1,
  competition: "champions-league",
  season: "2026-27",
  generatedAt: [source.retrievedAt, odds.retrievedAt].filter(Boolean).sort().at(-1),
  status: "experimental-md01-team-volumes",
  scope: `Prima giornata completa: 18 pronostici risultato e gol; volumi dettagliati su ${fixtures.filter(item => item.dataQuality.detailedVolumesAvailable).length} gare con profili verificabili delle 36 partecipanti`,
  warning: "Stime preliminari indipendenti dalle quote. Tutte le gare usano il modello UEFA Elo 1X2; i volumi usano la baseline domestica e, solo dove il provider non espone il campionato, un fallback UEFA dichiarato. Se il campione non supera i requisiti minimi, tiri, corner, falli e cartellini restano N/D. Moduli probabili, assenze e arbitri non modificano le proiezioni.",
  readingTemplate: {
    id: "serie-a-reading-v1",
    graphics: "champions",
    unavailableValue: "N/D",
    sections: ["summary", "decisionSupport", "headToHead", "referee", "teamContext", "projections", "discipline", "mvp", "myCombo"]
  },
  methodology: {
    result: "Modello UEFA Elo 1X2 già validato cronologicamente.",
    goals: `Poisson: totale iniziale dai gol prodotti/concessi per sede e forma recente quando disponibili; altrimenti prior di ${round(historicalOpeningTotalPrior)} gol calcolato su ${historicalOpeningFixtures.length} gare di apertura Champions 2023/24-2025/26. Lambda adattate alle probabilità 1X2 senza usare quote.`,
    volumes: "Produzione per sede e volume concesso sono normalizzati rispetto alla baseline del campionato indicato nel profilo. I fallback UEFA sono marcati esplicitamente. Servono almeno sei gare complete, di cui due in casa e due in trasferta; il peso recente massimo del 20% è ridotto in base all'affidabilità delle gare 2026/27; intervallo p20-p80 approssimato dalla dispersione osservata.",
    cards: "Cartellini gialli di squadra con lo stesso blending; il correttore motivazionale disciplinare è esposto per audit ma resta disattivato finché non è calibrato con stile e arbitro.",
    thresholdPolicy: "Le probabilità sulle soglie sono diagnostiche e non costituiscono selezioni di valore finché non sono disponibili quote aggiornate."
  },
  coverage: { fixtures: fixtures.length, detailedVolumeFixtures: fixtures.filter(item => item.dataQuality.detailedVolumesAvailable).length, teams: profiles.length, historicalOpeningFixtures: historicalOpeningFixtures.length, sourceMatches: source.summary.matches, completeSourceMatches: source.summary.completeMatches, leagueBaselineMatches: Object.fromEntries(Object.values(leagueBaselines).map(item => [item.league, item.matches])), oddsMatched: fixtures.filter(item => item.market.provider).length, resultOdds: fixtures.filter(item => item.market.result1x2.every(row => row.odds)).length, goalOdds: fixtures.filter(item => item.goals.every(row => row.market)).length, requestedVolumeOdds: fixtures.filter(item => item.market.requestedVolumeMarketsAvailable).length, referees: fixtures.filter(item => item.dataQuality.referee !== "N/D").length, probableFormations: fixtures.filter(item => item.dataQuality.lineups !== "N/D").length, probableLineupsAvailable: fixtures.filter(item => item.dataQuality.lineups.startsWith("undici editoriali")).length, probableLineupsApplied: 0, probableLineups: 0 },
  leagueBaselines,
  profiles,
  fixtures
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici Champions MD1: ${fixtures.length} gare · ${fixtures.filter(item => item.dataQuality.detailedVolumesAvailable).length} con volumi · prior storico ${round(historicalOpeningTotalPrior)} gol`);
