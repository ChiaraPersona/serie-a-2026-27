const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/coppa-italia-2026-27.json");
const outputPath = path.join(root, "data/normalized/coppa-italia-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const stageById = new Map(source.stages.map(stage => [stage.id, stage]));
const month = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function shortDate(value) {
  const [year, monthNumber, day] = value.split("-").map(Number);
  return `${day} ${month[monthNumber - 1]} ${year}`;
}

function scheduleLabel(match) {
  const stage = stageById.get(match.stage);
  if (match.date) return `${shortDate(match.date)}${match.kickoff ? ` · ${match.kickoff}` : ""}${match.tv ? ` · ${match.tv}` : ""}`;
  if (stage.legs) return stage.legs.map(leg => `${leg.label} ${shortDate(leg.date)}`).join(" · ");
  if (stage.dateWindow?.length) return stage.dateWindow.map(shortDate).join(" · ");
  return "Data da definire";
}

const matches = source.matches.map(match => ({
  ...match,
  competition: source.competition,
  season: source.season,
  status: "scheduled",
  dateStatus: match.date ? "confirmed" : "stage-window",
  scheduleLabel: scheduleLabel(match),
  sources: [source.source]
}));

const counts = Object.fromEntries(source.stages.map(stage => [
  stage.id,
  matches.filter(match => match.stage === stage.id).length
]));

const output = {
  competition: source.competition,
  season: source.season,
  updatedAt: source.updatedAt,
  source: source.source,
  stages: source.stages,
  counts,
  matches
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Coppa Italia ${source.season}: ${matches.length} incontri e percorsi, ${source.stages.length} turni.`);
