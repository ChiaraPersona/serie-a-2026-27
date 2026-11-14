"use strict";
const fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib"), crypto = require("node:crypto");
const { reconcile } = require("./import-xgot-history.cjs");
const { TARGETS } = require("./acquire-xgot-seasons.cjs");
const ROOT = path.resolve(__dirname, "..");
const inputs = new Map();
function read(file) {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  inputs.set(file, crypto.createHash("sha256").update(bytes).digest("hex"));
  return JSON.parse(file.endsWith(".gz") ? zlib.gunzipSync(bytes) : bytes.toString("utf8"));
}
function save(file, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(value, null, 2) + "\n");
}
// Explicit ID crosswalk, verified against both archived calendars and scores.
// No transliteration, fuzzy names, edit distance or nearest-date joins.
const UEFA_IDS = {
  9823: "50037", 10156: "50164", 8633: "50051", 8564: "50058", 8650: "7889", 9768: "50149",
  8639: "75797", 10192: "50031", 8636: "50138", 8342: "50043", 7732: "2602798", 9857: "52969",
  9728: "52707", 10247: "50033", 10013: "50030", 9925: "50050", 6019: "52797", 9906: "50124",
  9829: "50023", 8634: "50080", 8178: "50109", 8524: "52816", 9825: "52280", 9772: "50147",
  8521: "2601306", 10014: "50111", 8592: "52748", 10205: "70691", 7978: "64125", 8455: "52914",
  8593: "50143", 7787: "52498", 8402: "59333", 8638: "2610", 10261: "59324", 9875: "50136",
  8391: "52709", 8637: "50067", 8037: "79970"
};
const SERIE_A_ALIASES = { "Hellas Verona": "Verona" };

function buildIdentities(datasets) {
  const uefa = read("data/normalized/uefa-europe-history-2023-26.json").matches.filter(m => m.competitionCode === "ucl");
  const uefaTeams = new Map(uefa.flatMap(m => [[m.homeTeam.id, m.homeTeam.name], [m.awayTeam.id, m.awayTeam.name]]));
  const serie = new Map(["2024-25", "2025-26"].map(season => [season,
    read(`data/normalized/referee-matches/${season}/serie-a.json`).matches]));
  const teamMap = new Map(), playerMap = new Map(), playerConflicts = [];
  const addPlayer = (providerId, canonicalId, evidence) => {
    if (!/^[1-9]\d*$/.test(String(providerId))) return;
    const key = String(providerId), previous = playerMap.get(key);
    if (previous && previous.playerId !== canonicalId) {
      playerConflicts.push({ providerPlayerId: key, previous, candidate: { playerId: canonicalId, evidence } });
      playerMap.set(key, { playerId: null, evidence: "conflicting-existing-identities" });
    } else playerMap.set(key, { playerId: canonicalId, evidence });
  };
  const shootingPath = "data/normalized/champions-player-shooting-2026-27.json";
  for (const t of read(shootingPath).teams) for (const p of t.players) if (p.providerIds?.fotmob) addPlayer(p.providerIds.fotmob, p.id, shootingPath);
  for (const file of fs.readdirSync(path.join(ROOT, "data/teams")).filter(f => f.endsWith(".json") && f !== "index.json")) {
    const source = `data/teams/${file}`;
    for (const p of read(source).squad || []) if (p.providerIds?.fotmob) addPlayer(p.providerIds.fotmob, p.id, source);
  }
  for (const { target, data } of datasets) for (const m of data.matches) for (const t of m.teams) {
    const key = `${target.competition}|${t.providerTeamId}`;
    if (teamMap.has(key)) continue;
    if (target.competition === "serie-a") {
      const name = SERIE_A_ALIASES[t.name] || t.name;
      const candidates = [...serie.values()].flat().flatMap(m => [m.homeTeam, m.awayTeam]).filter(p => p.name === name);
      const slugs = [...new Set(candidates.map(p => p.slug))];
      teamMap.set(key, { competition: target.competition, providerTeamId: t.providerTeamId, providerName: t.name,
        historicalTeamId: slugs.length === 1 ? slugs[0] : null, namespace: "serie-a-historical-slug",
        evidence: "exact-existing-team-label-or-explicit-alias" });
    } else {
      let id = UEFA_IDS[t.providerTeamId];
      if (!id) {
        const candidates = [...uefaTeams].filter(([id, name]) => name === t.name);
        if (candidates.length === 1) id = candidates[0][0];
      }
      if (id && !uefaTeams.has(id)) throw Error(`Unknown UEFA team ${id}`);
      teamMap.set(key, { competition: target.competition, providerTeamId: t.providerTeamId, providerName: t.name, historicalTeamId: id || null,
        namespace: "uefa", historicalName: uefaTeams.get(id) || null,
        evidence: UEFA_IDS[t.providerTeamId] ? "explicit-provider-uefa-id-crosswalk" : "exact-existing-team-label" });
    }
  }
  return { teamMap, playerMap, playerConflicts, serie, uefa };
}

function runReconciliation() {
  inputs.clear();
  const datasets = TARGETS.map(target => ({ target, data: read(`data/normalized/xgot-history-seasons/${target.competition}-${target.season.replace("/", "-")}.json`) }));
  const identity = buildIdentities(datasets);
  const approved = [], quarantine = [], allIdentity = [], playerIssues = [];
  for (const { target, data } of datasets) for (const m of data.matches) {
    const raw = read(m.source.rawPath), d = raw.payload, g = d.general;
    const reasons = [...reconcile(d).reasons];
    const sourceHash = inputs.get(m.source.rawPath);
    if (sourceHash !== m.source.sha256) throw Error(`Changed original archive ${m.source.rawPath}`);
    const historicalTeams = m.teams.map(t => identity.teamMap.get(`${m.competition}|${t.providerTeamId}`));
    const season = target.season.slice(0, 4) + "-" + target.season.slice(-2);
    const candidates = m.competition === "serie-a"
      ? identity.serie.get(season).filter(f => f.date.slice(0, 10) === m.date && f.homeTeam.slug === historicalTeams[0]?.historicalTeamId && f.awayTeam.slug === historicalTeams[1]?.historicalTeamId)
      : identity.uefa.filter(f => f.season === season && f.date === m.date && f.homeTeam.id === historicalTeams[0]?.historicalTeamId && f.awayTeam.id === historicalTeams[1]?.historicalTeamId);
    const fixture = candidates.length === 1 ? candidates[0] : null;
    const score = m.competition === "serie-a" ? fixture?.score : fixture?.score90;
    const rawScore = d.header?.teams?.map(t => t.score);
    if (!fixture) reasons.push("unresolved-or-ambiguous-historical-fixture");
    if (!score || !Number.isInteger(score.home) || !Number.isInteger(score.away)) reasons.push("missing-regulation-score");
    if (score && rawScore?.some((v, i) => Number(v) !== [score.home, score.away][i])) reasons.push("historical-score-mismatch-or-extra-time");
    const fixtureEvidence = { providerMatchId: m.providerMatchId, competition: m.competition, season,
      fixtureId: fixture?.id || null, fixtureNamespace: m.competition === "serie-a" ? "serie-a-historical" : "uefa",
      teams: historicalTeams, date: m.date, kickoffUtc: g.matchTimeUTCDate, score: score || null,
      regulationEligible: !reconcile(d).reasons.includes("unsupported-extra-time-or-period") && !!score &&
        !rawScore?.some((v, i) => Number(v) !== [score.home, score.away][i]) };
    allIdentity.push(fixtureEvidence);
    if (reasons.length) { quarantine.push({ ...fixtureEvidence, reasons, source: m.source }); continue; }
    const stats = (d.content?.stats?.Periods?.All?.stats || []).flatMap(s => s.stats || []);
    const teamXg = i => { const value = stats.find(s => s.key === "expected_goals")?.rawStats?.[i]?.value; return Number.isFinite(value) && value >= 0 ? value : null; };
    const players = [];
    for (const p of m.players) {
      const mapped = identity.playerMap.get(p.providerPlayerId);
      const events = m.shots.filter(s => !s.isOwnGoal && s.providerPlayerId === p.providerPlayerId && s.providerTeamId === p.providerTeamId);
      const summed = events.length ? (events.every(s => s.xgot !== null) ? events.reduce((sum, s) => sum + s.xgot, 0) : null)
        : p.xgot === 0 ? 0 : null;
      const consistent = p.xgot === null || summed !== null && Math.abs(p.xgot - summed) <= 0.005001;
      if (!consistent) playerIssues.push({ providerMatchId: m.providerMatchId, providerPlayerId: p.providerPlayerId,
        published: p.xgot, summed, reason: "player-published-shotmap-mismatch" });
      players.push({ providerPlayerId: p.providerPlayerId, providerTeamId: p.providerTeamId,
        playerId: mapped?.playerId || null, identityStatus: mapped?.playerId ? "existing-provider-id" : "unresolved",
        xgot: consistent ? summed : null, publishedXgot: p.xgot, minutes: p.minutes,
        observedShotEvents: events.length, verification: consistent ? "shotmap-reconciled" : "quarantined-player-value" });
    }
    approved.push({ ...fixtureEvidence, kickoffUtc: g.matchTimeUTCDate, score,
      source: m.source, availableAt: m.source.retrievedAt, scope: "regulation-time", predictiveUseApproved: false,
      teams: m.teams.map((t, i) => ({ ...t, historicalTeamId: historicalTeams[i].historicalTeamId, xg: teamXg(i) })), players });
  }
  const summary = { candidates: allIdentity.length, linkedFixtures: allIdentity.filter(m => m.fixtureId).length,
    acceptedMatches: approved.length, quarantinedMatches: quarantine.length,
    mappedPlayerObservations: approved.reduce((n, m) => n + m.players.filter(p => p.playerId).length, 0),
    unresolvedPlayerObservations: approved.reduce((n, m) => n + m.players.filter(p => !p.playerId).length, 0),
    quarantinedPlayerValues: playerIssues.length, existingIdentityConflicts: identity.playerConflicts.length,
    predictiveUseApproved: false };
  save("data/normalized/xgot-reconciled-history.json", { schemaVersion: 1, summary, matches: approved });
  save("data/analysis/xgot/reconciliation.json", { schemaVersion: 1, summary,
    teamIdentityRegistry: [...identity.teamMap.values()], fixtureIdentityRegistry: allIdentity,
    playerIdentityRegistry: [...identity.playerMap].map(([providerPlayerId, v]) => ({ providerPlayerId, ...v })),
    quarantine, playerIssues, playerIdentityConflicts: identity.playerConflicts,
    inputs: [...inputs].map(([path, sha256]) => ({ path, sha256 })) });
  console.log(JSON.stringify(summary));
  return { summary, matches: approved };
}
if (require.main === module) runReconciliation();
module.exports = { runReconciliation, read, save, ROOT };
