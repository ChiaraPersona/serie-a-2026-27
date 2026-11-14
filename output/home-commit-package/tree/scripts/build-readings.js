const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const matchdayIndex = process.argv.indexOf('--matchday');
const scopedMatchday = matchdayIndex < 0 ? null : Number(process.argv[matchdayIndex + 1]);
if (scopedMatchday !== null && (!Number.isInteger(scopedMatchday) || scopedMatchday < 1 || scopedMatchday > 38)) throw Error('Giornata non valida');
const sourceDir = path.join(root, "data", "sources", "readings");
const outputFile = path.join(root, "data", "normalized", "readings.json");
const matches = storageReadJson(path.join(root, "data", "normalized", "matches.json"));
const cup = storageReadJson(path.join(root, "data", "normalized", "coppa-italia-2026-27.json"));
const cupOpponents = storageReadJson(path.join(root, "data", "sources", "coppa-opponents-2026-27.json"));
const cupOpponentsOutputFile = path.join(root, "data", "normalized", "coppa-opponents-2026-27.json");
const teams = storageReadJson(path.join(root, "data", "teams", "index.json")).teams;
const injuries = storageReadJson(path.join(root, "data", "sources", "fantacalcio-injuries-2026-27.json"));
const odds = storageReadJson(path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json"));
const allTeams = [...teams, ...cupOpponents.teams];
const teamIdByName = new Map(allTeams.flatMap(team => [team.name, team.shortName, team.officialName].filter(Boolean).map(name => [name, team.id])));
const cupMatches = cup.matches.filter(match => match.stage === "round-16").map(match => ({
  ...match,
  homeTeam: teamIdByName.get(match.home),
  awayTeam: teamIdByName.get(match.away),
  matchday: "Sedicesimi",
  matchdayDate: match.date,
  timezone: "Europe/Rome"
}));
const readingMatches = [...matches, ...cupMatches];
const matchIds = new Set(readingMatches.map(match => match.id));
const matchById = new Map(readingMatches.map(match => [match.id, match]));
const teamNameById = new Map(allTeams.map(team => [team.id, team.name]));
const injuriesByTeam = new Map(injuries.teams.map(team => [team.teamId, team.reports || []]));
const oddsByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const moduleIds = ["context", "form", "availability", "tactics", "referee", "market", "synthesis"];

const files = fs.readdirSync(sourceDir)
  .filter(file => file.endsWith(".json") && !file.startsWith("_"))
  .sort();
const emptySections = () => Object.fromEntries(moduleIds.map(moduleId => [moduleId, { content: null, signals: [], sources: [] }]));
const availabilityLine = teamId => {
  const reports = injuriesByTeam.get(teamId) || [];
  const teamName = teamNameById.get(teamId) || teamId;
  if (!reports.length) return `${teamName}: nessuna segnalazione presente nel monitor alla data di aggiornamento.`;
  return `${teamName}: ${reports.map(report => `${report.currentName || report.sourceName} - ${report.description}`).join("; ")}`;
};
let readings = files.flatMap(file => {
  const source = storageReadJson(path.join(sourceDir, file));
  if (source.type !== "prototype-batch") return [source];
  return source.matchIds.map(matchId => ({
    id: `lettura-${matchId}`,
    matchId,
    status: source.status || "draft",
    updatedAt: source.updatedAt,
    title: null,
    summary: null,
    prototype: true,
    sections: emptySections()
  }));
});
const scopedIds = new Set(matches.filter(m => m.competition === 'serie-a' && m.matchday === scopedMatchday).map(m => m.id));
if (scopedMatchday !== null) readings = readings.filter(r => scopedIds.has(r.matchId));

for (const reading of readings) {
  if (!reading.id || !reading.matchId || !["draft", "published", "archived"].includes(reading.status)) {
    throw new Error(`Lettura non valida: ${reading.id || "senza ID"}`);
  }
  if (reading.prototype !== undefined && typeof reading.prototype !== "boolean") throw new Error(`Flag prototipo non valido: ${reading.id}`);
  if (!matchIds.has(reading.matchId)) throw new Error(`Partita non trovata per ${reading.id}: ${reading.matchId}`);
  if (!reading.sections || moduleIds.some(moduleId => !reading.sections[moduleId])) {
    throw new Error(`Sette sezioni obbligatorie non complete: ${reading.id}`);
  }
  if (!reading.sections.availability.content) {
    const match = matchById.get(reading.matchId);
    const signals = [availabilityLine(match.homeTeam), availabilityLine(match.awayTeam)];
    reading.sections.availability = {
      content: `Monitor indisponibili aggiornato al ${String(injuries.importedAt).slice(0, 10)}. Le segnalazioni sono redazionali e i casi da valutare non vengono trasformati in assenze certe.`,
      signals,
      sources: [{ label: injuries.provider, url: injuries.sourceUrl }]
    };
    reading.updatedAt = String(injuries.importedAt).slice(0, 10);
  }
  if (!reading.sections.referee.content) {
    const match = matchById.get(reading.matchId);
    const assignment = match.refereeAssignment;
    if (assignment) {
      reading.sections.referee = {
        content: `Designazione ufficiale AIA: ${assignment.referee.name} dirigerÃ  la gara. Assistenti, IV ufficiale e sala VAR sono riportati senza attribuire alla designazione un effetto automatico sul pronostico.`,
        signals: [
          `Assistenti: ${assignment.assistants.join(" - ")}.`,
          `IV ufficiale: ${assignment.fourthOfficial}.`,
          `VAR: ${assignment.var}; AVAR: ${assignment.avar}.`
        ],
        sources: [{
          label: `AIA-FIGC - designazioni ${match.matchday}ª giornata`,
          url: match.sources.find(source => source.sourceType === "aia-figc-designations")?.sourceUrl
        }]
      };
      reading.updatedAt = [reading.updatedAt, match.sources.find(source => source.sourceType === "aia-figc-designations")?.publishedAt].filter(Boolean).sort().at(-1);
    }
  }
  if (!reading.sections.market.content) {
    const event = oddsByMatch.get(reading.matchId);
    const mainMarket = event?.markets.find(market => market.marketName === "1X2 ESITO FINALE" && market.status === "open");
    if (mainMarket) {
      const eventRetrievedAt = event.retrievedAt || odds.retrievedAt;
      reading.sections.market = {
        content: `Snapshot quote 1X2 aggiornato al ${String(eventRetrievedAt).slice(0, 10)}; viene usato soltanto come confronto esterno e non come input del modello.`,
        signals: mainMarket.selections.map(selection => `${selection.name}: ${selection.odds.toFixed(2)}`),
        sources: [{ label: odds.provider, url: odds.sourceUrl }]
      };
      reading.updatedAt = [reading.updatedAt, String(eventRetrievedAt).slice(0, 10)].sort().at(-1);
    }
  }
}

if (new Set(readings.map(reading => reading.id)).size !== readings.length) throw new Error("ID lettura duplicati");
if (new Set(readings.map(reading => reading.matchId)).size !== readings.length) throw new Error("Piu letture collegate alla stessa partita");

for (const team of cupOpponents.teams) {
  if (!team.id || !team.name || !team.coach || !team.preferredFormation || !Array.isArray(team.roster) || !team.roster.length) {
    throw new Error(`Profilo avversario Coppa non completo: ${team.id || "senza ID"}`);
  }
}

if (scopedMatchday !== null) {
  const previous = storageReadJson(outputFile);
  const replacements = new Map(readings.map(r => [r.matchId, r]));
  readings = [...previous.map(r => replacements.get(r.matchId) || r), ...readings.filter(r => !previous.some(p => p.matchId === r.matchId))];
}
fs.writeFileSync(outputFile, `${JSON.stringify(readings, null, 2)}\n`);
if (scopedMatchday === null) fs.writeFileSync(cupOpponentsOutputFile, `${JSON.stringify(cupOpponents, null, 2)}\n`);
console.log(`OK letture generate: ${readings.length}`);
