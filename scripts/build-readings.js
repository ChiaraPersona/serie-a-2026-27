const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "data", "sources", "readings");
const outputFile = path.join(root, "data", "normalized", "readings.json");
const matches = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "matches.json"), "utf8"));
const teams = JSON.parse(fs.readFileSync(path.join(root, "data", "teams", "index.json"), "utf8")).teams;
const injuries = JSON.parse(fs.readFileSync(path.join(root, "data", "sources", "fantacalcio-injuries-2026-27.json"), "utf8"));
const odds = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json"), "utf8"));
const matchIds = new Set(matches.map(match => match.id));
const matchById = new Map(matches.map(match => [match.id, match]));
const teamNameById = new Map(teams.map(team => [team.id, team.name]));
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
const readings = files.flatMap(file => {
  const source = JSON.parse(fs.readFileSync(path.join(sourceDir, file), "utf8"));
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
  if (!reading.sections.market.content) {
    const event = oddsByMatch.get(reading.matchId);
    const mainMarket = event?.markets.find(market => market.marketName === "1X2 ESITO FINALE" && market.status === "open");
    if (mainMarket) {
      reading.sections.market = {
        content: `Snapshot quote 1X2 aggiornato al ${String(odds.retrievedAt).slice(0, 10)}; viene usato soltanto come confronto esterno e non come input del modello.`,
        signals: mainMarket.selections.map(selection => `${selection.name}: ${selection.odds.toFixed(2)}`),
        sources: [{ label: odds.provider, url: odds.sourceUrl }]
      };
      reading.updatedAt = [reading.updatedAt, String(odds.retrievedAt).slice(0, 10)].sort().at(-1);
    }
  }
}

if (new Set(readings.map(reading => reading.id)).size !== readings.length) throw new Error("ID lettura duplicati");
if (new Set(readings.map(reading => reading.matchId)).size !== readings.length) throw new Error("Piu letture collegate alla stessa partita");

fs.writeFileSync(outputFile, `${JSON.stringify(readings, null, 2)}\n`);
console.log(`OK letture generate: ${readings.length}`);
