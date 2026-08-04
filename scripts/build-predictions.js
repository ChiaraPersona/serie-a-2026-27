"use strict";

const fs = require("fs");
const path = require("path");
const { ENGINE_VERSION, WEIGHTS, predictMatch } = require("./predictions/engine");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matches = read("data/normalized/matches.json");
const readings = read("data/normalized/readings.json");
const standings = read("data/normalized/standings-2025-26.json");
const styles = read("data/normalized/team-style-profiles.json");
const discipline = read("data/normalized/team-referee-profiles.json");
const historicalMatches = read("data/normalized/referee-matches/2025-26/serie-a.json").matches;
const objectives = read("data/team-objectives.json");
const teams = read("data/teams/index.json").teams;
const odds = read("data/normalized/odds/sisal/serie-a.json");
const generatedAt = odds.retrievedAt || new Date().toISOString();

const byId = items => new Map(items.map(item => [item.teamId || item.team || item.matchId || item.canonicalMatchId, item]));
const readingByMatch = byId(readings);
const styleByTeam = byId(styles.profiles);
const disciplineByTeam = byId(discipline.profiles);
const objectiveByTeam = byId(objectives.teams);
const oddsByMatch = byId(odds.events);
const homeByTeam = byId(standings.homeRows);
const awayByTeam = byId(standings.awayRows);
const teamById = new Map(teams.map(team => [team.id, team]));
const squadsByTeam = new Map(teams.map(team => [team.id, read(`data/generated/team-pages/${team.id}-squad.json`)]));
const standingsByTeam = new Map(standings.rows.map(row => [row.team, row]));
const meanStandingPoints = standings.rows.reduce((total, row) => total + row.points, 0) / standings.rows.length;

function recentForm(teamId) {
  const rows = historicalMatches.filter(match => match.homeTeam.slug === teamId || match.awayTeam.slug === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  if (!rows.length) return null;
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0;
  rows.forEach((match, index) => {
    const atHome = match.homeTeam.slug === teamId;
    const opponent = atHome ? match.awayTeam.slug : match.homeTeam.slug;
    const opponentStrength = (standingsByTeam.get(opponent)?.points || meanStandingPoints) / meanStandingPoints;
    const weight = 0.82 ** index;
    weightTotal += weight;
    goalsFor += (atHome ? match.score.home : match.score.away) * (opponentStrength ** 0.25) * weight;
    goalsAgainst += (atHome ? match.score.away : match.score.home) / (opponentStrength ** 0.25) * weight;
  });
  return { matches: rows.length, goalsFor: goalsFor / weightTotal, goalsAgainst: goalsAgainst / weightTotal, decay: 0.82, opponentAdjusted: true };
}

function scoreCalibration() {
  const factorial = value => { let result = 1; for (let number = 2; number <= value; number += 1) result *= number; return result; };
  const poisson = (goals, lambda) => Math.exp(-lambda) * (lambda ** goals) / factorial(goals);
  const counts = new Map();
  historicalMatches.forEach(match => counts.set(`${match.score.home}-${match.score.away}`, (counts.get(`${match.score.home}-${match.score.away}`) || 0) + 1));
  const factors = {};
  for (let home = 0; home <= 7; home += 1) {
    for (let away = 0; away <= 7; away += 1) {
      const key = `${home}-${away}`;
      const expected = historicalMatches.length * poisson(home, standings.summary.homeGoalsPerMatch) * poisson(away, standings.summary.awayGoalsPerMatch);
      const observed = counts.get(key) || 0;
      const raw = (observed + 4) / (expected + 4);
      factors[key] = Number(Math.max(0.72, Math.min(1.35, raw ** 0.55)).toFixed(3));
    }
  }
  return { season: "2025-26", matches: historicalMatches.length, method: "Frequenze punteggio Serie A con pseudo-conteggio 4, shrink 55% e limiti 0.72-1.35.", factors };
}

const sharedScoreCalibration = scoreCalibration();

const targetMatches = matches
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && oddsByMatch.has(match.id))
  .sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));

const predictions = targetMatches.map(match => predictMatch({
  match,
  reading: readingByMatch.get(match.id),
  homeVenue: homeByTeam.get(match.homeTeam),
  awayVenue: awayByTeam.get(match.awayTeam),
  homeProfile: styleByTeam.get(match.homeTeam),
  awayProfile: styleByTeam.get(match.awayTeam),
  homeRecent: recentForm(match.homeTeam),
  awayRecent: recentForm(match.awayTeam),
  homeDiscipline: disciplineByTeam.get(match.homeTeam),
  awayDiscipline: disciplineByTeam.get(match.awayTeam),
  homeObjective: objectiveByTeam.get(match.homeTeam),
  awayObjective: objectiveByTeam.get(match.awayTeam),
  homeTeam: teamById.get(match.homeTeam),
  awayTeam: teamById.get(match.awayTeam),
  homeSquad: squadsByTeam.get(match.homeTeam),
  awaySquad: squadsByTeam.get(match.awayTeam),
  leagueSummary: standings.summary,
  oddsEvent: oddsByMatch.get(match.id),
  oddsRetrievedAt: odds.retrievedAt,
  oddsSourceUrl: odds.sourceUrl,
  scoreCalibration: sharedScoreCalibration,
  generatedAt
}));

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  generatedAt,
  engine: {
    version: ENGINE_VERSION,
    principle: "Un'unica matrice dei punteggi indipendente dalle quote genera 1X2, gol e mercati collegati.",
    weights: WEIGHTS,
    surpriseFactor: "Apertura della gara, probabilita dell'esito sfavorito, divergenza mercato-dati e incompletezza prepartita. Non determina da solo il verdetto.",
    spatialModel: "Valuta separatamente sviluppo a sinistra, al centro e a destra e lo incrocia con le vulnerabilita avversarie.",
    goalModel: "Forze relative casa/trasferta e complessive, ultime otto gare corrette per avversario, probabile XI, divisione di provenienza e calibrazione empirica dei punteggi 2025/26.",
    scoreCalibration: sharedScoreCalibration,
    volumeModel: "Stima per squadra tiri totali, tiri nello specchio e corner come intervalli, senza imporre una partita ricca o povera di gol.",
    playerModel: "I cinque probabili ammoniti e il candidato MVP provengono dalle probabili formazioni e dallo storico individuale disponibile.",
    limitations: ["Quote disponibili in un solo snapshot del 3 agosto 2026.", "Forma ufficiale 2026/27 non ancora disponibile: la forma recente usa le ultime otto gare 2025/26.", "Indisponibili, arbitri e meteo saranno integrati soltanto quando verificati.", "Le probabili formazioni sono proiezioni editoriali e non distinte ufficiali.", "La calibrazione empirica usa una sola stagione e deve essere verificata con backtest pluristagionale."]
  },
  sources: [
    { label: "Lega Serie A - programma prime cinque giornate", url: "https://www.legaseriea.it/serie-a/news/date-orari-e-programmazione-tv-delle-prime-cinque-giornate" },
    { label: "Sisal - quote Serie A", url: odds.sourceUrl },
    { label: "Calciomercato.com - proiezione formazioni 20 squadre", url: teams.find(team => team.probableLineup?.source?.url)?.probableLineup.source.url }
  ],
  predictions
};

fs.writeFileSync(path.join(root, "data/normalized/predictions.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici preliminari: ${predictions.length} · motore ${ENGINE_VERSION}`);
