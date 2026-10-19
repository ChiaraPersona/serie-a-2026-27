"use strict";
const SOURCE = "data/normalized/understat-serie-a-xg.json";
const TEAM_IDS = { "AC Milan": "milan", Atalanta: "atalanta", Bologna: "bologna", Cagliari: "cagliari", Como: "como", Cremonese: "cremonese", Fiorentina: "fiorentina", Genoa: "genoa", Inter: "inter", Juventus: "juventus", Lazio: "lazio", Lecce: "lecce", Napoli: "napoli", "Parma Calcio 1913": "parma", Pisa: "pisa", Roma: "roma", Sassuolo: "sassuolo", Torino: "torino", Udinese: "udinese", Verona: "hellas-verona" };
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
function historicalXGAdapter(raw, sourceHash) {
  if (!raw || raw.provider !== "Understat" || raw.competition !== "Serie A" || !Number.isFinite(Date.parse(raw.retrievedAt))) return null;
  const rows = (raw.matches || []).filter(m => m.season === "2025-26").map(m => ({ id: `understat-2025-26-${m.providerMatchId}`, date: m.date, homeTeam: TEAM_IDS[m.homeTeam?.name], awayTeam: TEAM_IDS[m.awayTeam?.name], homeXG: m.xg?.home, awayXG: m.xg?.away, sourceUrl: m.sourceUrl }));
  if (!rows.length || new Set(rows.map(row => row.id)).size !== rows.length || rows.some(row => !row.homeTeam || !row.awayTeam || row.homeTeam === row.awayTeam || !Number.isFinite(Date.parse(row.date)) || Date.parse(row.date) >= Date.parse(raw.retrievedAt))) throw new Error("Invalid historical xG season, identity, duplicate or availability");
  const complete = rows.filter(row => [row.homeXG, row.awayXG].every(v => Number.isFinite(v) && v >= 0));
  const teams = {};
  const rate = (subset, getter) => ({ value: mean(subset.map(getter)), sample: subset.length, matchIds: subset.map(row => row.id) });
  for (const team of new Set(complete.flatMap(row => [row.homeTeam, row.awayTeam]))) {
    const all = complete.filter(row => row.homeTeam === team || row.awayTeam === team), home = all.filter(row => row.homeTeam === team), away = all.filter(row => row.awayTeam === team);
    teams[team] = { overallFor: rate(all, row => row.homeTeam === team ? row.homeXG : row.awayXG), overallAgainst: rate(all, row => row.homeTeam === team ? row.awayXG : row.homeXG),
      homeFor: rate(home, row => row.homeXG), homeAgainst: rate(home, row => row.awayXG), awayFor: rate(away, row => row.awayXG), awayAgainst: rate(away, row => row.homeXG) };
  }
  return { source: SOURCE, sourceHash, competition: "serie-a", season: "2025-26", retrievedAt: raw.retrievedAt, sourceUrl: raw.source, teams,
    league: { home: rate(complete, row => row.homeXG), away: rate(complete, row => row.awayXG) }, rows,
    audit: { matches: rows.length, completeXGMatches: complete.length, missingXGMatches: rows.filter(row => !complete.includes(row)).map(row => row.id), teamCount: Object.keys(teams).length,
      currentProvider: "StatMuse normalized teamStats.expectedGoals", historicalProvider: "Understat", crossProviderCalibration: "UNVERIFIED: no adjustment learned or applied", availability: raw.retrievedAt, targetUse: "PREVIOUS_COMPLETED_SERIE_A_SEASON_ONLY" } };
}
function auditCurrentXG(matches, throughMatchday = 5) {
  const rows = matches.filter(m => m.competition === "serie-a" && m.season === "2026-27" && m.matchday >= 1 && m.matchday <= throughMatchday && m.status === "finished" && !m.resultCoverage?.awarded);
  const coverage = subset => { const home = subset.filter(m => Number.isFinite(m.teamStats?.home?.expectedGoals) && m.teamStats.home.expectedGoals >= 0), away = subset.filter(m => Number.isFinite(m.teamStats?.away?.expectedGoals) && m.teamStats.away.expectedGoals >= 0);
    const missing = subset.filter(m => !home.includes(m) || !away.includes(m));
    return { matches: subset.length, withHomeXG: home.length, withAwayXG: away.length, completeXGMatches: subset.filter(m => home.includes(m) && away.includes(m)).length, missing: missing.map(m => m.id), teamsAffected: [...new Set(missing.flatMap(m => [m.homeTeam, m.awayTeam]))] }; };
  return { ...coverage(rows), byMatchday: Object.fromEntries([...new Set(rows.map(row => row.matchday))].sort().map(md => [md, coverage(rows.filter(row => row.matchday === md))])), missingIsZero: false };
}
module.exports = { SOURCE, TEAM_IDS, historicalXGAdapter, auditCurrentXG };
