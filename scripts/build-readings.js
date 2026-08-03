const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "data", "sources", "readings");
const outputFile = path.join(root, "data", "normalized", "readings.json");
const matches = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "matches.json"), "utf8"));
const matchIds = new Set(matches.map(match => match.id));
const moduleIds = ["context", "form", "availability", "tactics", "referee", "market", "synthesis"];

const files = fs.readdirSync(sourceDir)
  .filter(file => file.endsWith(".json") && !file.startsWith("_"))
  .sort();
const emptySections = () => Object.fromEntries(moduleIds.map(moduleId => [moduleId, { content: null, signals: [], sources: [] }]));
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
}

if (new Set(readings.map(reading => reading.id)).size !== readings.length) throw new Error("ID lettura duplicati");
if (new Set(readings.map(reading => reading.matchId)).size !== readings.length) throw new Error("Piu letture collegate alla stessa partita");

fs.writeFileSync(outputFile, `${JSON.stringify(readings, null, 2)}\n`);
console.log(`OK letture generate: ${readings.length}`);
