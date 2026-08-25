const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "sources", "team-style-profiles-2025-26.json");
const outputPath = path.join(root, "data", "normalized", "team-style-profiles.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const teams = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "teams.json"), "utf8"));
const teamIds = new Set(teams.map(team => team.id));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const round = (value, digits = 2) => value === null || value === undefined ? null : Number(Number(value).toFixed(digits));
const signalId = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "");
const withIds = items => items.map(item => ({ ...item, id: signalId(item.label) }));

assert(source.schemaVersion === 1, "Versione dataset stili non valida");
assert(source.season === "2025-26" && source.targetSeason === "2026-27", "Stagioni profili tattici non valide");
assert(source.provider?.name === "WhoScored", "Provider profili tattici non valido");
assert(Array.isArray(source.profiles) && source.profiles.length === 20, `Profili tattici: ${source.profiles?.length || 0}, attesi 20`);
assert(new Set(source.profiles.map(profile => profile.teamId)).size === 20, "ID profilo tattico duplicato");
assert(source.profiles.every(profile => teamIds.has(profile.teamId)), "Un profilo tattico non appartiene alle 20 squadre 2026/27");

const profiles = source.profiles.map(profile => {
  const summary = profile.summary || {};
  const goalTypes = (profile.goalTypes || []).filter(item => item.type && item.type !== "ND");
  const coverage = {
    summary: Object.values(summary).some(value => value !== null && value !== undefined),
    characteristics: Boolean(profile.strengths?.length || profile.weaknesses?.length),
    playingStyle: Boolean(profile.playingStyle?.length),
    formation: Boolean(profile.formation?.code),
    goalTypes: goalTypes.length > 0,
    leaders: Boolean(profile.leaders?.goals?.length || profile.leaders?.assists?.length || profile.leaders?.rating?.length)
  };
  const appearances = summary.appearances;
  const goalTypesTotal = goalTypes.reduce((total, item) => total + (item.goals || 0), 0);

  assert(["Serie A", "Serie B"].includes(profile.competition), `Competizione non valida: ${profile.teamId}`);
  assert(Number.isInteger(appearances) && appearances > 0, `Presenze non valide: ${profile.teamId}`);
  assert(Number.isFinite(summary.goals) && summary.goals >= 0, `Gol non validi: ${profile.teamId}`);
  assert(summary.shotsPerGame === null || Number.isFinite(summary.shotsPerGame) && summary.shotsPerGame >= 0, `Tiri non validi: ${profile.teamId}`);
  assert(summary.possessionPct === null || summary.possessionPct >= 0 && summary.possessionPct <= 100, `Possesso non valido: ${profile.teamId}`);
  assert(summary.passSuccessPct === null || summary.passSuccessPct >= 0 && summary.passSuccessPct <= 100, `Precisione passaggi non valida: ${profile.teamId}`);
  assert(profile.source?.provider === "WhoScored" && /^https:\/\/it\.whoscored\.com\//.test(profile.source.url), `Fonte WhoScored non valida: ${profile.teamId}`);
  if (coverage.goalTypes) assert(goalTypesTotal === summary.goals, `Tipi di gol non riconciliati: ${profile.teamId}`);
  if (coverage.formation) {
    assert(profile.formation.appearances > 0 && profile.formation.appearances <= appearances, `Campione modulo non valido: ${profile.teamId}`);
    assert(profile.formation.wins + profile.formation.draws + profile.formation.losses === profile.formation.appearances, `Esiti modulo non coerenti: ${profile.teamId}`);
  }

  const dataQuality = appearances < 20
    ? "limited-sample"
    : coverage.characteristics && coverage.goalTypes && coverage.formation
      ? "complete"
      : "statistical-only";
  const notes = [];
  if (profile.competition === "Serie B") notes.push("Profilo storico 2025/26 della competizione di provenienza; non confrontare direttamente i valori grezzi con la Serie A.");
  if (appearances < 20) notes.push("Campione parziale esposto da WhoScored.");
  if (profile.characteristicsSeason && profile.characteristicsSeason !== profile.season) notes.push(`Punti di forza, debolezze e stile aggiornati dalla pagina Serie A ${profile.characteristicsSeason}; campione iniziale da interpretare con cautela.`);
  if (!coverage.characteristics) notes.push("WhoScored non espone caratteristiche, stile e formazione nella pagina disponibile.");

  return {
    ...profile,
    strengths: withIds(profile.strengths || []),
    weaknesses: withIds(profile.weaknesses || []),
    playingStyle: withIds(profile.playingStyle || []),
    goalTypes,
    coverage,
    dataQuality,
    notes,
    derived: {
      goalsPerGame: round(summary.goals / appearances),
      estimatedShotConversionPct: summary.shotsPerGame ? round(summary.goals / (appearances * summary.shotsPerGame) * 100, 1) : null,
      yellowCardsPerGame: summary.yellowCards === null ? null : round(summary.yellowCards / appearances),
      formationUsagePct: coverage.formation ? round(profile.formation.appearances / appearances * 100, 1) : null
    },
    modelInputs: {
      numeric: {
        goalsPerGame: round(summary.goals / appearances),
        shotsPerGame: summary.shotsPerGame,
        possessionPct: summary.possessionPct,
        passSuccessPct: summary.passSuccessPct,
        aerialWonPerGame: summary.aerialWonPerGame,
        yellowCardsPerGame: summary.yellowCards === null ? null : round(summary.yellowCards / appearances),
        estimatedShotConversionPct: summary.shotsPerGame ? round(summary.goals / (appearances * summary.shotsPerGame) * 100, 1) : null
      },
      categorical: {
        formation: profile.formation?.code || null,
        strengths: (profile.strengths || []).map(item => signalId(item.label)),
        weaknesses: (profile.weaknesses || []).map(item => signalId(item.label)),
        playingStyle: (profile.playingStyle || []).map(item => signalId(item.label))
      }
    }
  };
});

const output = {
  schemaVersion: source.schemaVersion,
  season: source.season,
  targetSeason: source.targetSeason,
  retrievedAt: source.retrievedAt,
  provider: source.provider,
  usage: source.usage,
  coverage: {
    teams: profiles.length,
    complete: profiles.filter(profile => profile.dataQuality === "complete").length,
    statisticalOnly: profiles.filter(profile => profile.dataQuality === "statistical-only").length,
    limitedSample: profiles.filter(profile => profile.dataQuality === "limited-sample").length,
    serieA: profiles.filter(profile => profile.competition === "Serie A").length,
    serieB: profiles.filter(profile => profile.competition === "Serie B").length
  },
  profiles
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK profili tattici generati: ${profiles.length}/20 (${output.coverage.complete} completi, ${output.coverage.statisticalOnly} solo statistici, ${output.coverage.limitedSample} campione limitato)`);
