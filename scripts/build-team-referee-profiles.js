const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => JSON.parse(fs.readFileSync(path.join(root, ...parts), "utf8"));
const source = read("data", "sources", "team-referee-profiles-2025-26.json");
const teams = read("data", "normalized", "teams.json");
const referees = read("data", "normalized", "referees.json");
const espn = read("data", "generated", "referee-stats", "2025-26", "aggregates.json");
const styles = read("data", "normalized", "team-style-profiles.json");
const outputPath = path.join(root, "data", "normalized", "team-referee-profiles.json");

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const round = (value, digits = 2) => value == null ? null : Number(Number(value).toFixed(digits));
const aliases = { "alberto-arena": "alberto-ruben-arena" };
const canonicalSlug = slug => aliases[slug] || slug;
const teamIds = new Set(teams.map(team => team.id));
const currentReferees = new Set(referees.map(referee => referee.slug));
const stylesByTeam = new Map(styles.profiles.map(profile => [profile.teamId, profile]));
const espnByPair = new Map(espn.refereeTeams
  .filter(row => row.competition === "serie-a" && row.stage === "regular-season")
  .map(row => [`${row.teamId}:${row.refereeSlug}`, row]));

assert(source.schemaVersion === 1, "Versione dataset arbitro-squadra non valida");
assert(source.source?.provider === "WhoScored", "Provider arbitro-squadra non valido");
assert(source.source?.season === "2025-26", "Stagione arbitro-squadra non valida");
assert(Array.isArray(source.teams) && source.teams.length === 20, `Squadre arbitro-squadra: ${source.teams?.length || 0}, attese 20`);
assert(new Set(source.teams.map(team => team.teamId)).size === 20, "ID squadra duplicato nel dataset arbitro-squadra");
assert(source.teams.every(team => teamIds.has(team.teamId)), "Squadra arbitro-squadra fuori dal campionato 2026/27");

const profiles = source.teams.map(profile => {
  assert(/^https:\/\/it\.whoscored\.com\//.test(profile.sourceUrl), `URL WhoScored non valido: ${profile.teamId}`);
  assert(["available", "not_available"].includes(profile.availability), `Disponibilità non valida: ${profile.teamId}`);
  const style = stylesByTeam.get(profile.teamId);
  const rows = (profile.rows || []).map(row => {
    const refereeSlug = canonicalSlug(row.refereeSlug);
    const espnRow = espnByPair.get(`${profile.teamId}:${refereeSlug}`) || null;
    const sample = row.appearances < 5 ? "insufficient" : row.appearances < 10 ? "moderate" : "significant";
    return {
      ...row,
      refereeSlug,
      currentCan2026_27: currentReferees.has(refereeSlug),
      sample,
      espnComparison: espnRow ? {
        matches: espnRow.matches,
        yellowCards: espnRow.yellowCards,
        foulsPerMatch: espnRow.foulsPerMatch,
        penaltiesAgainst: espnRow.penaltiesAgainst,
        matchDifference: row.appearances - espnRow.matches,
        yellowCardDifference: row.yellowCards - espnRow.yellowCards,
        foulPerMatchDifference: round(row.foulsAwardedAgainstPerAppearance - espnRow.foulsPerMatch),
        penaltyAgainstDifference: round(row.penaltiesAwardedAgainstPerAppearance * row.appearances - espnRow.penaltiesAgainst)
      } : null
    };
  });
  const visibleAppearances = rows.reduce((sum, row) => sum + row.appearances, 0);
  const visibleYellowCards = rows.reduce((sum, row) => sum + row.yellowCards, 0);
  const visibleRedCards = rows.reduce((sum, row) => sum + row.redCards, 0);
  const seasonAppearances = profile.totals?.appearances ?? style?.summary?.appearances ?? null;
  const coverageMode = !rows.length ? "not_available" : visibleAppearances === seasonAppearances ? "complete" : "top-20";
  if (rows.length) {
    assert(rows.length <= 20, `WhoScored espone oltre 20 righe: ${profile.teamId}`);
    assert(visibleAppearances <= seasonAppearances, `Presenze visibili oltre il totale: ${profile.teamId}`);
    assert(visibleYellowCards <= style.summary.yellowCards, `Gialli visibili oltre il totale squadra: ${profile.teamId}`);
    if (profile.totals) {
      assert(profile.totals.appearances === style.summary.appearances, `Presenze totali non riconciliate: ${profile.teamId}`);
      assert(profile.totals.yellowCards === style.summary.yellowCards, `Gialli totali non riconciliati: ${profile.teamId}`);
      assert(profile.totals.redCards === style.summary.redCards, `Rossi totali non riconciliati: ${profile.teamId}`);
    }
  }
  return {
    teamId: profile.teamId,
    teamName: profile.teamName,
    season: profile.season,
    competition: profile.competition,
    availability: profile.availability,
    sourceUrl: profile.sourceUrl,
    retrievedAt: profile.retrievedAt,
    filters: profile.filters,
    results: profile.results,
    coverage: {
      mode: coverageMode,
      visibleReferees: rows.length,
      visibleAppearances,
      seasonAppearances,
      visibleAppearancePct: seasonAppearances ? round(visibleAppearances / seasonAppearances * 100, 1) : 0
    },
    visibleTotals: { appearances: visibleAppearances, yellowCards: visibleYellowCards, redCards: visibleRedCards },
    providerTotals: profile.totals,
    teamOverviewTotals: style ? {
      appearances: style.summary.appearances,
      yellowCards: style.summary.yellowCards,
      redCards: style.summary.redCards,
      sourceUrl: style.source.url
    } : null,
    rows
  };
});

const comparisons = profiles.flatMap(profile => profile.rows.map(row => row.espnComparison).filter(Boolean));
const output = {
  schemaVersion: 1,
  season: "2025-26",
  targetSeason: "2026-27",
  retrievedAt: source.source.retrievedAt,
  provider: source.source,
  providerColumns: source.providerColumns,
  methodology: {
    warning: "Le differenze descrivono dati e campioni, non favoritismi o causalità.",
    sourceSeparation: "WhoScored resta separato da ESPN; il confronto non sovrascrive nessuna fonte.",
    sampleBands: { "0-4": "campione insufficiente", "5-9": "indicazione moderata", "10+": "confronto più significativo" },
    top20Limit: "La pagina WhoScored espone al massimo 20 arbitri. coverage.mode=top-20 segnala un campione visibile incompleto."
  },
  coverage: {
    teams: profiles.length,
    available: profiles.filter(profile => profile.availability === "available").length,
    notAvailable: profiles.filter(profile => profile.availability !== "available").length,
    completeTables: profiles.filter(profile => profile.coverage.mode === "complete").length,
    top20Tables: profiles.filter(profile => profile.coverage.mode === "top-20").length,
    refereeRows: profiles.reduce((sum, profile) => sum + profile.rows.length, 0),
    linkedToEspn: comparisons.length,
    exactMatchSamples: comparisons.filter(item => item.matchDifference === 0 && item.yellowCardDifference === 0).length
  },
  profiles
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK arbitro-squadra WhoScored: ${output.coverage.available}/20 squadre, ${output.coverage.refereeRows} righe, ${output.coverage.linkedToEspn} confronti ESPN`);
