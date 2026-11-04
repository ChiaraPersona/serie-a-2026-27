"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { replay, domesticForm, round } = require("./champions/strength-comparison.cjs");
const { buildLeagueStrengthDataset } = require("./champions/league-strength.js");
const root = path.resolve(__dirname, "..");
const arg = process.argv.indexOf("--as-of");
const asOf = arg < 0 ? null : process.argv[arg + 1];
if (!asOf) throw new Error("Use --as-of YYYY-MM-DD (current day excluded)");
const sources = [];
function read(file) {
  const bytes = fs.readFileSync(path.join(root, file));
  sources.push({ path: file, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  return JSON.parse(bytes.toString("utf8"));
}
const model = read("data/normalized/uefa-1x2-model-2026-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const teamMap = read("data/sources/champions-team-history-map-2026-27.json");
const pilot = read("data/sources/champions-pilot-match-stats-2025-27.json");
const strength = read("data/normalized/champions-team-strength-2026-27.json");
const history = read("data/normalized/uefa-europe-history-2023-26.json");
// Require every replayed score to agree with the owning matchday archive.
const verified = new Map();
for (let day = 1; day <= 4; day++) {
  const archive = read(`data/sources/champions-results-md${String(day).padStart(2, "0")}-2026-27.json`);
  for (const fixture of archive.fixtures) {
    if (verified.has(fixture.fixtureId)) throw new Error(`Duplicate archived result: ${fixture.fixtureId}`);
    verified.set(fixture.fixtureId, fixture);
  }
}
for (const fixture of calendar.fixtures.filter(f => f.status === "finished" && f.date < asOf && f.date > model.historyThrough)) {
  const archived = verified.get(fixture.id);
  if (archived?.status !== "finished" || archived.score?.home !== fixture.score?.home || archived.score?.away !== fixture.score?.away) throw new Error(`Score archive mismatch: ${fixture.id}`);
}
const leagueData = buildLeagueStrengthDataset({ history, model, championsStrength: strength, championsTeamMap: teamMap, asOf });
const result = replay({ model, fixtures: calendar.fixtures, teamMap, asOf });
const teams = teamMap.teams.map(mapping => {
  const id = String(mapping.uefaTeamId);
  const profile = strength.teams.find(t => t.team === mapping.team);
  const domestic = pilot.teams.find(t => t.name === mapping.team);
  if (!domestic || !profile) throw new Error(`Canonical profile missing: ${mapping.team}`);
  const league = leagueData.leagues.find(l => l.association === profile.association);
  return { team: mapping.team, teamId: domestic.id, uefaTeamId: id, frozenElo: result.frozen.get(id) ?? null, updatedElo: round(result.ratings.get(id) ?? 1500), ratingOrigin: result.frozen.has(id) ? "historical_direct" : "neutral_prior_1500", eloChange: result.frozen.has(id) ? round(result.ratings.get(id) - result.frozen.get(id)) : null, currentEuropeanMatches: result.counts.get(id) || 0, association: profile.association, leagueContext: { frozenMedianElo: league?.leagueStrength ?? null, ratedClubs: league?.clubsRated ?? 0, reliability: league?.reliability ?? "insufficient", status: "context_only_not_added_to_club_rating" }, domesticForm: domesticForm({ team: domestic, pilot, model, frozen: result.frozen, teamMap, asOf }), reliability: { status: "not_calibrated_for_current_season", currentChampionsMatches: result.counts.get(id) || 0, historicalRatingAvailable: result.frozen.has(id) } };
}).sort((a, b) => b.updatedElo - a.updatedElo || a.team.localeCompare(b.team));
const output = { schemaVersion: 1, asOf, status: "internal_diagnostic_only", activation: false, parameters: model.parameters, sources, coverage: { teams: teams.length, completedChampionsMatches: result.rows.length, europeanResultsThrough: result.rows.at(-1)?.date ?? null, otherEuropeanCompetitionsUpdated: false, domesticStatsAsOf: pilot.asOf, domesticTeamsWithObservations: teams.filter(t => t.domesticForm.matches).length }, methodology: { elo: "Existing frozen Elo parameters and probability/update formulas; batches by date; current day excluded. Current-season update covers archived Champions results only, not Europa/Conference.", domestic: "Last eight archived current-season domestic games. Points minus frozen-Elo expected points; only exact provider-ID or explicit canonicalTeamId to canonical UEFA-ID matches. ESPN IDs never reused for other providers. Full adjustment N/D unless all opponents covered; subset explicitly separate. No league-to-probability conversion.", shots: "Raw domestic shot difference only; not opponent-adjusted, not used in rating. xG unavailable.", validation: "Retrospective chronological replay of archived results, not a prospectively frozen forecast. Original result acquisition timestamps were not enforced. No domestic/shot composite fitted or validated.", reliability: "Sample counts and historical-rating availability only; no calibrated confidence score.", league: "Frozen European-qualifier association median, not whole domestic league strength." }, validation: { ...result.metrics, byDate: [...new Set(result.rows.map(r => r.date))].map(date => { const rows = result.rows.filter(r => r.date === date); const average = key => Object.fromEntries(["logLoss", "brier"].map(k => [k, round(rows.reduce((s, r) => s + r[key][k], 0) / rows.length)])); return { date, matches: rows.length, frozen: average("frozen"), updated: average("updated") }; }), promotion: "blocked_pending_prospective_validation_and_domestic_opponent_coverage" }, teams, evaluationMatches: result.rows };
const dir = path.join(root, "data/analysis/champions");
output.coverage.domesticObservationsInWindows = teams.reduce((sum, t) => sum + t.domesticForm.matches, 0);
output.coverage.domesticDirectOpponentRatings = teams.reduce((sum, t) => sum + (t.domesticForm.directOpponentCoverage || 0), 0);
output.coverage.teamsWithoutDomesticObservations = teams.filter(t => !t.domesticForm.matches).map(t => t.team);
output.validation.observedImprovement = result.metrics.updated != null && result.metrics.updated.logLoss < result.metrics.frozen.logLoss && result.metrics.updated.brier < result.metrics.frozen.brier;
output.validation.statisticalSignificance = "not_established";
output.validation.conclusion = output.validation.observedImprovement ? "Numerical improvement only; no activation justified." : "No improvement on both metrics in this archived sample; do not activate.";
fs.mkdirSync(dir, { recursive: true });
const file = `data/analysis/champions/strength-comparison-${asOf}.json`;
fs.writeFileSync(path.join(root, file), JSON.stringify(output, null, 2) + "\n");
const fmt = value => value == null ? "N/D" : String(value);
const lines = ["# Confronto interno forza Champions", "", `Cutoff esclusivo: ${asOf}. Solo ricerca, nessuna attivazione operativa.`, "", `36 squadre; ${result.rows.length} risultati Champions archiviati. Altre coppe non aggiornate.`, "", "## Confronto cronologico", "", "Ogni partita è prevista prima dell'aggiornamento; le gare dello stesso giorno usano lo stesso stato iniziale. Replay retrospettivo, non validazione prospettica. Log-loss e Brier più bassi sono migliori.", "", `Congelato: ${JSON.stringify(result.metrics.frozen)}. Aggiornato: ${JSON.stringify(result.metrics.updated)}.`, "", "## Squadre", "", "Forma = punti/gara domestici nelle ultime otto osservazioni archiviate. Residuo completo N/D se manca anche un solo avversario con rating diretto; sottoinsiemi nel JSON. Tiri e forma non entrano nell'Elo.", "", "| Squadra | Elo storico | Elo aggiornato | Gare CL | Gare domestiche | Punti/gara | Avversari con Elo | Residuo completo |", "|---|---:|---:|---:|---:|---:|---:|---:|", ...teams.map(t => `| ${t.team} | ${fmt(t.frozenElo)} | ${t.updatedElo} | ${t.currentEuropeanMatches} | ${t.domesticForm.matches} | ${fmt(t.domesticForm.pointsPerMatch)} | ${fmt(t.domesticForm.directOpponentCoverage)} | ${fmt(t.domesticForm.adjustedPointsPerMatchResidual)} |`), "", "## Limiti e riproduzione", "", ...Object.values(output.methodology).map(text => `- ${text}`), "", "Non promuovere il confronto a pronostico: nessuna prova di miglioramento del contributo domestico o dei tiri. Nessuna probabilità DUO o modifica di quote/selezioni.", "", `Comando: node scripts/build-champions-strength-comparison.cjs --as-of ${asOf}`, "", `Evidenza completa e hash input: [JSON](../../${file}).`, "", "Fonti canoniche interne:", ...sources.map(s => `- \`${s.path}\` (SHA-256 nel JSON).`), ""];
fs.writeFileSync(path.join(root, `docs/reports/champions-strength-comparison-${asOf}.md`), lines.join("\n"));
fs.appendFileSync(path.join(root, `docs/reports/champions-strength-comparison-${asOf}.md`), `\nEsito: ${output.validation.conclusion} Significatività statistica non stabilita.\n`);
fs.appendFileSync(path.join(root, `docs/reports/champions-strength-comparison-${asOf}.md`), `\nCopertura avversari domestici con rating diretto: ${output.coverage.domesticDirectOpponentRatings}/${output.coverage.domesticObservationsInWindows} osservazioni nelle finestre. Mapping limitato alle identità canoniche disponibili, senza inferenze sui nomi. Forma domestica assente: ${output.coverage.teamsWithoutDomesticObservations.join(", ")}.\n`);
console.log(JSON.stringify({ file, coverage: output.coverage, validation: result.metrics }));
