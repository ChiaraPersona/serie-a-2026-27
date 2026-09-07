"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
const clamp = (value, low = 0, high = 100) => Math.max(low, Math.min(high, value));
const round = (value, digits = 0) => Number(value.toFixed(digits));

const calendar = read("data/normalized/champions-league-2026-27.json");
const resultModel = read("data/normalized/champions-1x2-2026-27.json");
const pilot = read("data/normalized/champions-pilot-predictions-2026-27.json");
const sourceStats = read("data/sources/champions-pilot-match-stats-2025-27.json");
const motivation = read("data/normalized/champions-motivation-md01-2026-27.json");
const styles = read("data/normalized/team-style-profiles.json");
const squads = read("data/normalized/champions-registered-squads-2026-27.json");

const weights = { market: 0.50, form: 0.15, venue: 0.10, absences: 0.10, tactical: 0.10, motivation: 0.05 };
const modelByFixture = new Map(resultModel.fixtures.map(item => [item.fixtureId, item]));
const pilotByFixture = new Map(pilot.fixtures.map(item => [item.fixtureId, item]));
const profileByTeam = new Map(pilot.profiles.map(item => [item.team, item]));
const motivationByFixture = new Map(motivation.fixtures.map(item => [item.matchId, item]));
const teamIdByName = new Map(sourceStats.teams.map(item => [item.name, item.id]));
const providerIdByName = new Map(sourceStats.teams.map(item => [item.name, item.espnTeamId]));
const styleByTeamId = new Map(styles.profiles.map(item => [item.teamId, item]));
const squadByTeam = new Map(squads.teams.map(item => [item.team, item]));

function surpriseLevel(value) {
  if (value <= 20) return "molto basso";
  if (value <= 40) return "basso";
  if (value <= 55) return "medio";
  if (value <= 70) return "alto";
  if (value <= 85) return "molto alto";
  return "estremo";
}

function normalizedMarket(fixtureId) {
  const analysis = pilotByFixture.get(fixtureId);
  const priced = (analysis?.market?.result1x2 || []).filter(item => ["1", "X", "2"].includes(item.selection) && Number.isFinite(item.odds) && item.odds > 1);
  if (priced.length === 3) {
    const inverse = Object.fromEntries(priced.map(item => [item.selection, 1 / item.odds]));
    const overround = inverse["1"] + inverse.X + inverse["2"];
    return {
      probabilities: { home: inverse["1"] / overround, draw: inverse.X / overround, away: inverse["2"] / overround },
      status: "latest-sisal-1x2-no-margin",
      provider: analysis.market.provider,
      retrievedAt: analysis.market.retrievedAt,
      odds: Object.fromEntries(priced.map(item => [item.selection, item.odds])),
      confidence: 1
    };
  }
  const fallback = modelByFixture.get(fixtureId);
  if (!fallback) throw new Error(`${fixtureId}: né quote 1X2 complete né fallback del modello`);
  return {
    probabilities: fallback.probabilities,
    status: "uefa-elo-model-fallback",
    provider: null,
    retrievedAt: resultModel.generatedAt,
    odds: null,
    confidence: 0.72
  };
}

function teamRows(teamName) {
  const providerId = providerIdByName.get(teamName);
  if (!providerId) return [];
  return sourceStats.matches.flatMap(match => {
    if (match.coverage !== "complete") return [];
    const side = match.home.providerTeamId === providerId ? "home" : match.away.providerTeamId === providerId ? "away" : null;
    if (!side) return [];
    const own = match[side], opponent = match[side === "home" ? "away" : "home"];
    return [{ date: match.date, venue: side, goalsFor: own.score, goalsAgainst: opponent.score, points: own.score > opponent.score ? 3 : own.score === opponent.score ? 1 : 0 }];
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function summarizeForm(rows, limit) {
  const sample = rows.slice(0, limit);
  if (!sample.length) return null;
  return {
    matches: sample.length,
    pointsPerMatch: round(sample.reduce((sum, item) => sum + item.points, 0) / sample.length, 2),
    goalDifferencePerMatch: round(sample.reduce((sum, item) => sum + item.goalsFor - item.goalsAgainst, 0) / sample.length, 2)
  };
}

function formComponent(favorite, underdog) {
  const favoriteRows = teamRows(favorite), underdogRows = teamRows(underdog);
  const favorite5 = summarizeForm(favoriteRows, 5), underdog5 = summarizeForm(underdogRows, 5);
  const favorite10 = summarizeForm(favoriteRows, 10), underdog10 = summarizeForm(underdogRows, 10);
  if (!favorite5 || !underdog5 || favorite5.matches < 3 || underdog5.matches < 3) {
    return { value: 50, status: "fallback-neutral-insufficient-sample", confidence: 0, evidence: { favorite: favorite5, underdog: underdog5 } };
  }
  const recent = (underdog5.pointsPerMatch - favorite5.pointsPerMatch) * 13 + (underdog5.goalDifferencePerMatch - favorite5.goalDifferencePerMatch) * 5;
  const context = favorite10 && underdog10 ? (underdog10.pointsPerMatch - favorite10.pointsPerMatch) * 3 : 0;
  return {
    value: round(clamp(50 + recent + context)),
    status: "espn-last5-with-last10-context",
    confidence: round(Math.min(favorite5.matches, underdog5.matches) / 5, 2),
    evidence: { favorite: { last5: favorite5, last10: favorite10 }, underdog: { last5: underdog5, last10: underdog10 } }
  };
}

function goalBalance(profile, venue) {
  const goals = profile?.venues?.[venue]?.goals;
  if (!goals || !Number.isFinite(goals.for?.mean) || !Number.isFinite(goals.against?.mean)) return null;
  return { matches: Math.min(goals.for.matches, goals.against.matches), goalsFor: goals.for.mean, goalsAgainst: goals.against.mean, balance: goals.for.mean - goals.against.mean };
}

function venueComponent(fixture, favorite, underdog) {
  const favoriteVenue = favorite === fixture.homeTeam ? "home" : "away";
  const underdogVenue = underdog === fixture.homeTeam ? "home" : "away";
  const favoriteSplit = goalBalance(profileByTeam.get(favorite), favoriteVenue);
  const underdogSplit = goalBalance(profileByTeam.get(underdog), underdogVenue);
  if (!favoriteSplit || !underdogSplit || favoriteSplit.matches < 2 || underdogSplit.matches < 2) {
    return { value: 50, status: "fallback-neutral-insufficient-venue-sample", confidence: 0, evidence: { favorite: favoriteSplit, underdog: underdogSplit } };
  }
  const homeAdjustment = underdogVenue === "home" ? 6 : favoriteVenue === "home" ? -4 : 0;
  return {
    value: round(clamp(50 + (underdogSplit.balance - favoriteSplit.balance) * 12 + homeAdjustment)),
    status: "espn-home-away-goal-balance",
    confidence: round(Math.min(1, Math.min(favoriteSplit.matches, underdogSplit.matches) / 8), 2),
    evidence: { favorite: { team: favorite, venue: favoriteVenue, ...favoriteSplit }, underdog: { team: underdog, venue: underdogVenue, ...underdogSplit } }
  };
}

function unavailablePlayers(team) {
  return (squadByTeam.get(team)?.players || []).filter(player => {
    const availability = player.availability || {};
    return availability.status || availability.injury || availability.suspension;
  });
}

function playerImpact(player) {
  const stats = player.previousSeason?.totals || {};
  const minutes = Number.isFinite(stats.minutes) ? stats.minutes : 0;
  const starter = Number.isFinite(stats.starts) ? stats.starts : 0;
  const roleWeight = player.position === "goalkeeper" ? 12 : player.position === "defender" ? 8 : player.position === "midfielder" ? 9 : player.position === "forward" ? 10 : 6;
  return clamp(roleWeight + Math.min(20, minutes / 180) + Math.min(10, starter / 3) + Math.min(12, ((stats.goals || 0) + (stats.assists || 0)) * 1.5), 0, 50);
}

function absencesComponent(favorite, underdog) {
  const favoriteUnavailable = unavailablePlayers(favorite), underdogUnavailable = unavailablePlayers(underdog);
  if (!favoriteUnavailable.length && !underdogUnavailable.length) {
    return { value: 50, status: "fallback-neutral-no-verified-availability", confidence: 0, evidence: { favorite: [], underdog: [] } };
  }
  const summarize = players => players.map(player => ({ name: player.name, position: player.position, impact: round(playerImpact(player)), status: player.availability.status || player.availability.injury || player.availability.suspension })).sort((a, b) => b.impact - a.impact);
  const favoriteEvidence = summarize(favoriteUnavailable), underdogEvidence = summarize(underdogUnavailable);
  const favoriteImpact = favoriteEvidence.reduce((sum, item) => sum + item.impact, 0);
  const underdogImpact = underdogEvidence.reduce((sum, item) => sum + item.impact, 0);
  return { value: round(clamp(50 + (favoriteImpact - underdogImpact) * 0.8)), status: "verified-player-availability-impact", confidence: 0.82, evidence: { favorite: favoriteEvidence, underdog: underdogEvidence } };
}

const ids = items => new Set((items || []).map(item => item.id));
const includesAny = (set, values) => values.some(value => set.has(value));

function tacticalRules(favoriteProfile, underdogProfile) {
  const favoriteWeaknesses = ids(favoriteProfile?.weaknesses);
  const favoriteStyle = ids(favoriteProfile?.playingStyle);
  const underdogStrengths = ids(underdogProfile?.strengths);
  const underdogStyle = ids(underdogProfile?.playingStyle);
  const matches = [];
  if (underdogStrengths.has("contropiede") && includesAny(favoriteStyle, ["controllano-la-partita-nella-meta-campo-avversaria", "attuano-la-trappola-del-fuorigioco"])) matches.push("Transizioni dell'underdog contro una favorita che alza il baricentro");
  if (includesAny(underdogStrengths, ["attaccare-sulle-fasce"]) || includesAny(underdogStyle, ["attaccano-dalla-sinistra", "attaccano-dalla-destra", "giocano-in-ampiezza"])) {
    if (favoriteWeaknesses.has("difendersi-da-attacchi-sulle-fasce")) matches.push("Ampiezza dell'underdog contro vulnerabilità difensiva sulle fasce");
  }
  if (includesAny(underdogStrengths, ["creare-occasioni-da-calci-piazzati", "segnare-da-calci-piazzati"]) && favoriteWeaknesses.has("difendere-sui-calci-piazzati")) matches.push("Piazzati dell'underdog contro una debolezza specifica della favorita");
  if (includesAny(underdogStrengths, ["duelli-aerei", "gioco-aereo"]) && favoriteWeaknesses.has("duelli-aerei")) matches.push("Gioco aereo dell'underdog contro una vulnerabilità nei duelli");
  if (underdogStrengths.has("creare-occasioni-tramite-passaggi-filtranti") && includesAny(favoriteWeaknesses, ["impedire-agli-avversari-di-creare-occasioni", "difendere-contro-giocatori-di-qualita"])) matches.push("Passaggi filtranti dell'underdog contro una difesa che concede occasioni");
  return matches;
}

function tacticalComponent(favorite, underdog) {
  const favoriteProfile = styleByTeamId.get(teamIdByName.get(favorite));
  const underdogProfile = styleByTeamId.get(teamIdByName.get(underdog));
  if (favoriteProfile && underdogProfile) {
    const matches = tacticalRules(favoriteProfile, underdogProfile);
    return { value: round(clamp(48 + matches.length * 12, 30, 82)), status: "qualitative-style-matchup", confidence: matches.length ? 0.82 : 0.68, evidence: { matches } };
  }
  const favoriteVolume = profileByTeam.get(favorite), underdogVolume = profileByTeam.get(underdog);
  const favoriteConcedes = favoriteVolume?.recent?.totalShots?.against?.weightedMean;
  const underdogCreates = underdogVolume?.recent?.totalShots?.for?.weightedMean;
  const favoriteBaseline = favoriteVolume?.venues?.overall?.totalShots?.against?.mean;
  const underdogBaseline = underdogVolume?.venues?.overall?.totalShots?.for?.mean;
  if ([favoriteConcedes, underdogCreates, favoriteBaseline, underdogBaseline].every(Number.isFinite)) {
    const pressureDelta = (favoriteConcedes + underdogCreates) - (favoriteBaseline + underdogBaseline);
    return { value: round(clamp(50 + pressureDelta * 3, 30, 70)), status: "statistical-shot-pressure-fallback", confidence: 0.5, evidence: { favoriteRecentShotsConceded: favoriteConcedes, underdogRecentShotsCreated: underdogCreates, pressureDelta: round(pressureDelta, 2), qualitativeProfilesAvailable: false } };
  }
  return { value: 50, status: "fallback-neutral-no-comparable-matchup", confidence: 0, evidence: { matches: [] } };
}

function motivationComponent(entry, favorite, underdog) {
  const sides = [entry?.home, entry?.away].filter(Boolean);
  const favoriteSide = sides.find(item => item.team === favorite)?.motivation;
  const underdogSide = sides.find(item => item.team === underdog)?.motivation;
  if (!favoriteSide || !underdogSide) return { value: 50, status: "fallback-neutral-unavailable", confidence: 0, evidence: null };
  const value = 50 + (underdogSide.score - favoriteSide.score) * 1.2 + (favoriteSide.rotationRisk - underdogSide.rotationRisk) * 0.6;
  return { value: round(clamp(value)), status: "motivation-index-relative", confidence: round((favoriteSide.confidence + underdogSide.confidence) / 2, 2), evidence: { favorite: { score: favoriteSide.score, rotationRisk: favoriteSide.rotationRisk }, underdog: { score: underdogSide.score, rotationRisk: underdogSide.rotationRisk } } };
}

function concreteReasons({ market, form, venue, absences, tactical, motivation: motivationScore }, favorite, underdog) {
  const candidates = [{ priority: Math.abs(market.value - 50) + 20, text: `Quote normalizzate: ${favorite} non vince nel ${market.value}% degli scenari 1X2` }];
  if (form.confidence > 0 && Math.abs(form.value - 50) >= 7) {
    const fav = form.evidence.favorite.last5, dog = form.evidence.underdog.last5;
    candidates.push({ priority: Math.abs(form.value - 50), text: `${underdog} nelle ultime 5: ${dog.pointsPerMatch} punti/gara; ${favorite}: ${fav.pointsPerMatch}` });
  }
  if (venue.confidence > 0 && venue.value >= 57) {
    const dog = venue.evidence.underdog, fav = venue.evidence.favorite;
    candidates.push({ priority: venue.value - 50, text: `Rendimento ${dog.venue === "home" ? "casalingo" : "esterno"} dell'underdog: saldo gol ${dog.balance >= 0 ? "+" : ""}${round(dog.balance, 2)}; favorita ${fav.balance >= 0 ? "+" : ""}${round(fav.balance, 2)}` });
  }
  if (absences.confidence > 0 && absences.value >= 57 && absences.evidence.favorite.length) candidates.push({ priority: absences.value - 50, text: `Assenze verificate della favorita: ${absences.evidence.favorite.slice(0, 2).map(item => item.name).join(", ")}` });
  if (tactical.status === "qualitative-style-matchup" && tactical.evidence.matches.length) candidates.push({ priority: tactical.value - 50 + 5, text: tactical.evidence.matches[0] });
  else if (tactical.status === "statistical-shot-pressure-fallback" && tactical.value >= 57) candidates.push({ priority: tactical.value - 50, text: `Pressione recente dell'underdog: ${round(tactical.evidence.underdogRecentShotsCreated, 1)} tiri creati; favorita ne concede ${round(tactical.evidence.favoriteRecentShotsConceded, 1)}` });
  if (motivationScore.confidence > 0 && motivationScore.value >= 58) candidates.push({ priority: motivationScore.value - 50, text: `Motivazione: ${underdog} ${motivationScore.evidence.underdog.score}/100, ${favorite} ${motivationScore.evidence.favorite.score}/100` });
  return candidates.sort((a, b) => b.priority - a.priority).slice(0, 3).map(item => item.text);
}

const fixtures = calendar.fixtures.filter(item => item.matchday === 1).map(fixture => {
  const marketData = normalizedMarket(fixture.id);
  const favoriteIsHome = marketData.probabilities.home >= marketData.probabilities.away;
  const favorite = favoriteIsHome ? fixture.homeTeam : fixture.awayTeam;
  const underdog = favoriteIsHome ? fixture.awayTeam : fixture.homeTeam;
  const favoriteWinProbability = favoriteIsHome ? marketData.probabilities.home : marketData.probabilities.away;
  const market = { value: round((1 - favoriteWinProbability) * 100), status: marketData.status, confidence: marketData.confidence, evidence: { provider: marketData.provider, retrievedAt: marketData.retrievedAt, odds: marketData.odds, normalizedProbabilities: { home: round(marketData.probabilities.home * 100, 1), draw: round(marketData.probabilities.draw * 100, 1), away: round(marketData.probabilities.away * 100, 1) }, favoriteWinProbabilityPct: round(favoriteWinProbability * 100, 1) } };
  const components = {
    market,
    form: formComponent(favorite, underdog),
    venue: venueComponent(fixture, favorite, underdog),
    absences: absencesComponent(favorite, underdog),
    tactical: tacticalComponent(favorite, underdog),
    motivation: motivationComponent(motivationByFixture.get(fixture.id), favorite, underdog)
  };
  const raw = Object.entries(weights).reduce((sum, [key, weight]) => sum + components[key].value * weight, 0);
  const surpriseFactor = round(clamp(raw));
  const confidence = round(Object.entries(weights).reduce((sum, [key, weight]) => sum + components[key].confidence * weight, 0), 2);
  return {
    fixtureId: fixture.id,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    surpriseFactor,
    surpriseLevel: surpriseLevel(surpriseFactor),
    favorite,
    underdog,
    components: Object.fromEntries(Object.entries(components).map(([key, value]) => [key, value.value])),
    componentDetails: components,
    confidence: { value: confidence, label: confidence >= 0.8 ? "alta" : confidence >= 0.6 ? "media" : "bassa", missingOrFallbackComponents: Object.entries(components).filter(([, value]) => value.status.includes("fallback") || value.confidence === 0).map(([key]) => key) },
    reasons: concreteReasons(components, favorite, underdog)
  };
});

if (fixtures.length !== 18) throw new Error(`Fattore Sorpresa: attese 18 gare MD1, trovate ${fixtures.length}`);
if (fixtures.some(item => item.surpriseFactor < 0 || item.surpriseFactor > 100 || item.reasons.length > 3)) throw new Error("Fattore Sorpresa: output fuori contratto");

write("data/normalized/champions-surprise-factor-md01-2026-27.json", {
  schemaVersion: 1,
  competition: "UEFA Champions League",
  season: "2026-27",
  matchday: 1,
  generatedAt: sourceStats.retrievedAt,
  status: "experimental-explainable",
  warning: "Il dato misura la vulnerabilità della favorita, non la probabilità di vittoria dell'underdog. Le assenze restano neutrali finché non sono disponibili stati verificati e abbassano la confidence.",
  methodology: {
    formula: weights,
    market: "Quote Sisal 1X2 più recenti convertite in probabilità implicite e normalizzate senza margine; fallback UEFA Elo documentato.",
    form: "Ultime cinque gare ESPN con punti e saldo gol; le ultime dieci forniscono un correttivo di contesto.",
    venue: "Saldo gol casa/trasferta nel campione ESPN, con bonus prudente se l'underdog gioca in casa.",
    absences: "Impatto basato su ruolo, minuti, status titolare e contributo solo per indisponibilità verificate; fallback neutro se gli stati non esistono.",
    tactical: "Incrocio tra punti di forza, vulnerabilità e stile WhoScored; fallback quantitativo sulla pressione di tiri recente quando il profilo qualitativo non è disponibile.",
    motivation: "Differenza relativa di Motivation Index e Rotation Risk già presenti nel progetto.",
    neutralFallback: 50,
    confidence: "Media pesata della copertura delle sei componenti; i fallback e i dati mancanti la riducono."
  },
  bands: [
    { min: 0, max: 20, label: "molto basso" },
    { min: 21, max: 40, label: "basso" },
    { min: 41, max: 55, label: "medio" },
    { min: 56, max: 70, label: "alto" },
    { min: 71, max: 85, label: "molto alto" },
    { min: 86, max: 100, label: "estremo" }
  ],
  summary: {
    fixtures: fixtures.length,
    marketFromOdds: fixtures.filter(item => item.componentDetails.market.status === "latest-sisal-1x2-no-margin").length,
    marketFallbacks: fixtures.filter(item => item.componentDetails.market.status.includes("fallback")).length,
    verifiedAbsenceFixtures: fixtures.filter(item => item.componentDetails.absences.confidence > 0).length,
    qualitativeTacticalFixtures: fixtures.filter(item => item.componentDetails.tactical.status === "qualitative-style-matchup").length,
    statisticalTacticalFallbacks: fixtures.filter(item => item.componentDetails.tactical.status === "statistical-shot-pressure-fallback").length,
    lowConfidence: fixtures.filter(item => item.confidence.label === "bassa").length
  },
  fixtures
});

console.log(`OK Fattore Sorpresa Champions MD1: ${fixtures.length} gare · ${fixtures.filter(item => item.componentDetails.market.status === "latest-sisal-1x2-no-margin").length} quote · ${fixtures.filter(item => item.confidence.label === "bassa").length} confidence bassa`);
