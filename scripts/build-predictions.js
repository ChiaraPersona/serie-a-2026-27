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
  generatedAt
}));

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  generatedAt,
  engine: {
    version: ENGINE_VERSION,
    principle: "Modello deterministico indipendente dalle quote; il mercato viene confrontato soltanto dopo la stima.",
    weights: WEIGHTS,
    surpriseFactor: "Apertura della gara, probabilita dell'esito sfavorito, divergenza mercato-dati e incompletezza prepartita. Non determina da solo il verdetto.",
    spatialModel: "Valuta separatamente sviluppo a sinistra, al centro e a destra e lo incrocia con le vulnerabilita avversarie.",
    volumeModel: "Stima per squadra tiri totali, tiri nello specchio e corner come intervalli, senza imporre una partita ricca o povera di gol.",
    playerModel: "I cinque probabili ammoniti e il candidato MVP provengono dalle probabili formazioni e dallo storico individuale disponibile.",
    limitations: ["Quote disponibili in un solo snapshot del 3 agosto 2026.", "Forma ufficiale 2026/27 non ancora disponibile.", "Indisponibili, arbitri e meteo saranno integrati soltanto quando verificati.", "Le probabili formazioni sono proiezioni editoriali e non distinte ufficiali."]
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
