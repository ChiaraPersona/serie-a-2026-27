"use strict";
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib"), crypto = require("node:crypto");
const { ROOT, save } = require("../../xgot-validation.cjs");
const { reconcile, TOLERANCE } = require("../../import-xgot-history.cjs");
const numeric = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
const fields = p => (p.stats || []).flatMap(g => Object.values(g.stats || {}));
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
function aggregateEvidence(d) {
  const stats = (d.content?.stats?.Periods?.All?.stats || []).flatMap(g => g.stats || []);
  const metric = (key, side) => {
    const values = stats.filter(s => s.key === key).map(s => s.rawStats?.[side]?.value).filter(v => v !== undefined && v !== null);
    return values.length && values.every(numeric) && new Set(values).size === 1 ? values[0] : null;
  };
  const strict = reconcile(d);
  const periods = d.content?.shotmap?.shots?.map(s => s.period) || [];
  const regulation = !periods.some(p => !["FirstHalf", "SecondHalf"].includes(p));
  const teams = (d.header?.teams || []).map((t, side) => {
    const opposingTeam = d.header.teams[1 - side];
    const keepers = Object.values(d.content?.playerStats || {}).filter(p => p.isGoalkeeper === true &&
      String(p.teamId) === String(opposingTeam.id) && fields(p).find(s => s.key === "minutes_played")?.stat?.value > 0);
    const faced = keepers.length === 1 ? fields(keepers[0]).find(s => s.key === "expected_goals_on_target_faced")?.stat?.value : null;
    const xgot = metric("expected_goals_on_target", side), shots = metric("total_shots", side), sot = metric("ShotsOnTarget", side);
    const shotSum = strict.teams[side]?.summedXgot ?? null;
    return { providerTeamId: String(t.id), xgot, shots, shotsOnTarget: sot, xg: metric("expected_goals", side),
      opposingKeeperId: keepers.length === 1 ? String(keepers[0].id) : null, opposingKeeperXgotFaced: numeric(faced) ? faced : null,
      opposingPlayingKeepers: keepers.length, corroborated: numeric(xgot) && numeric(faced) && Math.abs(xgot - faced) <= TOLERANCE,
      basicCountsValid: Number.isInteger(shots) && Number.isInteger(sot) && sot <= shots && numeric(xgot) && xgot <= sot,
      shotSum, aggregateMinusShotSum: shotSum === null || xgot === null ? null : xgot - shotSum };
  });
  const strictAccepted = strict.reasons.length === 0;
  const aggregateAccepted = regulation && teams.length === 2 && teams.every(t => t.basicCountsValid && t.corroborated);
  return { regulation, strictAccepted, aggregateAccepted,
    evidenceGrade: strictAccepted ? "shot-reconciled" : aggregateAccepted ? "aggregate-keeper-corroborated" : "quarantined",
    reasons: strict.reasons, teams };
}
function run() {
  const original = read("data/analysis/xgot/reconciliation.json");
  const canonical = new Map(original.fixtureIdentityRegistry.map(m => [m.providerMatchId, m]));
  const quarantined = new Set(original.quarantine.map(m => m.providerMatchId));
  const sourceMatches = [];
  for (const dir of ["data/normalized/xgot-history-seasons", "data/normalized/xgot-extended-seasons"]) {
    if (!fs.existsSync(path.join(ROOT, dir))) continue;
    for (const file of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith(".json"))) sourceMatches.push(...read(`${dir}/${file}`).matches);
  }
  const local = "data/raw/champions-season-shots/2026-10-20/fotmob/matches";
  const leagues = { 42: "champions-league", 55: "serie-a", 47: "premier-league", 87: "la-liga", 54: "bundesliga",
    53: "ligue-1", 61: "liga-portugal", 57: "eredivisie", 40: "belgian-pro-league" };
  const seen = new Set(sourceMatches.map(m => m.providerMatchId));
  for (const file of fs.readdirSync(path.join(ROOT, local))) {
    if (!file.endsWith(".json.gz")) continue;
    const rawPath = `${local}/${file}`, bytes = fs.readFileSync(path.join(ROOT, rawPath));
    const raw = JSON.parse(zlib.gunzipSync(bytes)), g = raw.payload?.general;
    const competition = leagues[g?.parentLeagueId || g?.leagueId], id = String(g?.matchId);
    if (!competition || !g.finished || seen.has(id)) continue;
    seen.add(id);
    sourceMatches.push({ providerMatchId: id, competition, season: "2026/2027", date: g.matchTimeUTCDate.slice(0, 10),
      source: { url: raw.url, retrievedAt: raw.retrievedAt, rawPath, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), modelVersion: null } });
  }
  const observations = [], audit = [];
  for (const m of sourceMatches) {
    const bytes = fs.readFileSync(path.join(ROOT, m.source.rawPath));
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== m.source.sha256) throw Error(`Archive hash changed ${m.providerMatchId}`);
    const raw = JSON.parse(zlib.gunzipSync(bytes)), d = raw.payload, evidence = aggregateEvidence(d), id = canonical.get(m.providerMatchId);
    const score = id?.score || { home: d.header.teams[0].score, away: d.header.teams[1].score };
    const scoreValid = [score.home, score.away].every(v => Number.isInteger(v) && v >= 0) &&
      (!id || id.regulationEligible);
    if (!scoreValid || !evidence.regulation) evidence.evidenceGrade = "quarantined";
    const diagnostic = { providerMatchId: m.providerMatchId, competition: m.competition, season: m.season,
      wasOriginalQuarantined: quarantined.has(m.providerMatchId), ...evidence, source: m.source };
    audit.push(diagnostic);
    if (evidence.evidenceGrade === "quarantined") continue;
    observations.push({ providerMatchId: m.providerMatchId, fixtureId: id?.fixtureId || null,
      fixtureNamespace: id?.fixtureNamespace || "unresolved-provider-only", competition: m.competition,
      season: m.season.slice(0, 4) + "-" + m.season.slice(-2), date: m.date, kickoffUtc: d.general.matchTimeUTCDate,
      score, evidenceGrade: evidence.evidenceGrade, predictiveUseApproved: false,
      teams: evidence.teams.map(t => ({ providerTeamId: t.providerTeamId, xgot: t.xgot, xg: t.xg,
        shots: t.shots, shotsOnTarget: t.shotsOnTarget })), source: m.source, availableAt: m.source.retrievedAt });
  }
  observations.sort((a, b) => a.date.localeCompare(b.date) || a.providerMatchId.localeCompare(b.providerMatchId));
  const summary = { inspectedMatches: audit.length, originalQuarantined: original.quarantine.length,
    originalQuarantinedCorroboratedAtAggregateOnly: audit.filter(m => m.wasOriginalQuarantined && m.evidenceGrade === "aggregate-keeper-corroborated").length,
    originalQuarantinedStillExcluded: audit.filter(m => m.wasOriginalQuarantined && m.evidenceGrade === "quarantined").length,
    shotReconciled: observations.filter(m => m.evidenceGrade === "shot-reconciled").length,
    aggregateOnly: observations.filter(m => m.evidenceGrade === "aggregate-keeper-corroborated").length,
    quarantined: audit.filter(m => m.evidenceGrade === "quarantined").length,
    predictiveUseApproved: false };
  save("data/analysis/xgot/diagnosis-v2.json", { schemaVersion: 2, summary,
    interpretation: "Aggregate and keeper agreement corroborates a provider total only. It neither reconciles shot/player values nor proves a model-version explanation or independent verification.", matches: audit });
  save("data/normalized/xgot-team-research-v2.json", { schemaVersion: 2, summary,
    policy: "Research only; retain evidence grades. Aggregate-only rows must never feed player/DUO forecasts.", matches: observations });
  console.log(JSON.stringify(summary));
  return { summary, matches: observations };
}
if (require.main === module) run();
module.exports = { aggregateEvidence, run };
