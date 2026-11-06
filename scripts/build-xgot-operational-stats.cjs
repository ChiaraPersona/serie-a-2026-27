"use strict";
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
const finite = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
function build() {
  const inputDigest=crypto.createHash('sha256').update(fs.readFileSync(__filename)).update(fs.readFileSync(path.join(ROOT,'data/normalized/xgot-team-research-v2.json'))).update(fs.readFileSync(path.join(ROOT,'data/analysis/xgot/reconciliation.json'))).update(fs.readFileSync(path.join(ROOT,'data/predictions/xgot-prospective/identity-registry.json'))).digest('hex');
  const outputFile=path.join(ROOT,'data/generated/xgot-statistics.json');
  if(fs.existsSync(outputFile)){const previous=JSON.parse(fs.readFileSync(outputFile,'utf8'));if(previous.inputDigest===inputDigest)return previous;}
  const history = read("data/normalized/xgot-team-research-v2.json").matches;
  const identities = read("data/predictions/xgot-prospective/identity-registry.json").mappings;
  const teamsByProvider = new Map(Object.entries(identities).map(([id, provider]) => [provider, id]));
  const playersByProvider = new Map(read("data/analysis/xgot/reconciliation.json").playerIdentityRegistry.filter(p => p.playerId).map(p => [p.providerPlayerId, p.playerId]));
  const out = { schemaVersion: 2, inputDigest, coverageNotice: "Campione di gare coperte; xGOT osservato, distinto dai gol attesi. Valori mancanti N/D.", teams: {}, players: {}, teamMatches: {}, playerMatches: {} };
  const add = (directory, id, period, value, minutes, date) => {
    if (!finite(value)) return;
    directory[id] ||= {};
    directory[id][period] ||= { xgot: 0, matches: 0, minutes: 0, from: date, to: date };
    const row = directory[id][period]; row.xgot += value; row.matches++; row.minutes += minutes;
    row.from = row.from < date ? row.from : date; row.to = row.to > date ? row.to : date;
  };
  for (const m of history) {
    const period = m.season.replace(/^(\d{4})-(\d{2})$/, (_, y, end) => `${y}/${end}`);
    if (!["2025/26", "2026/27"].includes(period)) continue;
    for (const [i, t] of m.teams.entries()) {
      const teamId = teamsByProvider.get(t.providerTeamId);
      if (!teamId) continue;
      add(out.teams, teamId, period, t.xgot, 90, m.date);
      out.teamMatches[teamId] ||= [];
      out.teamMatches[teamId].push({ date: m.date, xgot: t.xgot, against: m.teams[1 - i].xgot,
        competition: m.competition, fixtureId: m.fixtureId, evidenceGrade: m.evidenceGrade });
    }
    if (m.evidenceGrade !== "shot-reconciled") continue;
    const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, m.source.rawPath)))).payload;
    const events = raw.content?.shotmap?.shots || [];
    for (const p of Object.values(raw.content?.playerStats || {})) {
      const playerId = playersByProvider.get(String(p.id)); if (!playerId) continue;
      const fields = (p.stats || []).flatMap(g => Object.values(g.stats || {}));
      const minutes = fields.find(s => s.key === "minutes_played")?.stat?.value;
      const xgot = fields.find(s => ["expected_goals_on_target", "expected_goals_on_target_variant", "expected_goalsontarget"].includes(s.key))?.stat?.value;
      if (!(minutes > 0) || !finite(xgot)) continue;
      const shots = events.filter(s => String(s.playerId) === String(p.id) && !s.isOwnGoal);
      if (shots.some(s => !finite(s.expectedGoalsOnTarget))) continue;
      const sum = shots.reduce((n, s) => n + s.expectedGoalsOnTarget, 0);
      if (Math.abs(xgot - sum) > 0.005001) continue;
      add(out.players, playerId, period, sum, minutes, m.date);
      (out.playerMatches[playerId]||=[]).push({date:m.date,period,xgot:sum,minutes});
    }
  }
  for (const directory of [out.teams, out.players]) for (const periods of Object.values(directory)) {
    const rows = Object.values(periods);
    if (rows.length) periods.total = { xgot: rows.reduce((n, r) => n + r.xgot, 0), matches: rows.reduce((n, r) => n + r.matches, 0),
      minutes: rows.reduce((n, r) => n + r.minutes, 0), from: rows.map(r => r.from).sort()[0], to: rows.map(r => r.to).sort().at(-1) };
    for (const r of Object.values(periods)) r.per90 = r.minutes > 0 ? r.xgot * 90 / r.minutes : null;
  }
  fs.writeFileSync(path.join(ROOT, "data/generated/xgot-statistics.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify({ xgotTeams: Object.keys(out.teams).length, xgotPlayers: Object.keys(out.players).length }));
  return out;
}
if (require.main === module) build();
module.exports = { build };
