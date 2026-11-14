"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { makeSnapshot, validateSnapshot, toKickoffUtc, sha256 } = require("./predictions/snapshot-core");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const argv = process.argv.slice(2);
function arg(name) { const index = argv.indexOf(name); return index < 0 ? null : argv[index + 1] ?? true; }
function fail(message) { console.error(message); process.exitCode = 1; }

const matchday = Number(arg("--matchday"));
if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) {
  fail("Usage: npm run snapshot:predictions -- --matchday <1-38> [--replace-prekickoff --reason <text>]");
} else {
  const season = "2026-27", competition = "serie-a", now = new Date();
  const matches = read("data/normalized/matches.json").filter(match => match.competition === competition && match.season === season && match.matchday === matchday);
  if (!matches.length) fail(`SNAPSHOT BLOCKER: no canonical fixtures found for MD${matchday}.`);
  else if (new Set(matches.map(match => match.id)).size !== matches.length) fail(`SNAPSHOT BLOCKER: duplicate canonical matchId in MD${matchday}.`);
  else {
    const knownTeams = new Set(read("data/teams/index.json").teams.map(team => team.id));
    const unresolved = [...new Set(matches.flatMap(match => [match.homeTeam, match.awayTeam]).filter(teamId => !knownTeams.has(teamId)))];
    if (unresolved.length) fail(`SNAPSHOT BLOCKER: unresolved canonical teams ${unresolved.join(", ")}.`);
    else {
    const kickoffIssues = matches.filter(match => {
      const kickoff = toKickoffUtc(match);
      return !kickoff || match.status === "finished" || match.status === "cancelled" || match.status === "abandoned" || (match.status !== "postponed" && kickoff <= now.getTime());
    });
    if (kickoffIssues.length && !arg("--retrospective-test")) fail(`SNAPSHOT BLOCKER: MD${matchday} contains started/finished fixtures or unknown kickoff times: ${kickoffIssues.map(match => `${match.id}=${match.status}/${match.date} ${match.kickoff || "N/D"}`).join(", ")}. No prospective snapshot was written.`);
    else if (kickoffIssues.length) fail("SNAPSHOT BLOCKER: retrospective snapshot generation is intentionally disabled until historical input reconstruction is proven.");
    else {
      const base = `data/predictions/snapshots/${season}/md-${String(matchday).padStart(2, "0")}.json`;
      const manifestPath = "data/predictions/snapshots/manifest.json";
      const manifest = fs.existsSync(path.join(root, manifestPath)) ? read(manifestPath) : { schemaVersion: 1, season, competition, snapshots: [] };
      const previousFile = fs.existsSync(path.join(root, base)) ? read(base) : { schemaVersion: 1, matchday, snapshots: [], history: [] };
      const previousById = new Map(previousFile.snapshots.map(snapshot => [snapshot.matchId, snapshot]));
      const existing = matches.filter(match => previousById.has(match.id));
      const replacing = Boolean(arg("--replace-prekickoff"));
      const reason = arg("--reason");
      if (existing.length && !replacing) fail(`ERROR: SNAPSHOT_ALREADY_EXISTS (${existing.map(match => match.id).join(", ")}).`);
      else if (existing.length && !reason) fail("ERROR: --replace-prekickoff requires --reason <text>.");
      else if (replacing && matches.some(match => toKickoffUtc(match) <= now.getTime() || match.status === "finished")) fail("ERROR: IMMUTABLE_SNAPSHOT_EXISTS cannot be replaced after kickoff.");
      else {
        const previewRelative = `data/generated/prediction-preview-md${String(matchday).padStart(2, "0")}-2026-27.json`;
        const previewPath = path.join(root, previewRelative);
        const previousPreview = fs.existsSync(previewPath) ? fs.readFileSync(previewPath) : null;
        const child = spawnSync(process.execPath, [path.join(__dirname, "build-predictions.js")], {
          cwd: root,
          env: { ...process.env, SERIE_A_PREDICTION_PREVIEW_MATCHDAY: String(matchday) },
          encoding: "utf8",
          stdio: "inherit"
        });
        if (child.error || child.status !== 0) fail(`SNAPSHOT BLOCKER: pre-match V2 prediction builder failed${child.error ? `: ${child.error.message}` : ` with exit ${child.status}`}.`);
        else {
          const preview = JSON.parse(fs.readFileSync(previewPath, "utf8"));
          const officialLineups = read("data/sources/official-lineups-2026-27.json");
          const teams = read("data/teams/index.json");
          const priorStandings = read("data/normalized/standings-2025-26.json");
          const predictions = new Map(preview.predictions.filter(item => item.playerMarketModelVersion === 2).map(item => [item.matchId, item]));
          const generatedAt = new Date().toISOString();
          const fresh = [];
          const errors = [];
          for (const match of matches) {
            const prediction = predictions.get(match.id);
            if (!prediction) { errors.push(`${match.id}: V2 forecast absent`); continue; }
            const snapshot = makeSnapshot({ prediction, match, generatedAt, officialLineups, teams, matches: read("data/normalized/matches.json"), priorStandings });
            errors.push(...validateSnapshot(snapshot).map(message => `${match.id}: ${message}`));
            fresh.push(snapshot);
          }
          if (fresh.length !== matches.length) errors.push(`fixture coverage ${fresh.length}/${matches.length}`);
          if (errors.length) fail(`SNAPSHOT BLOCKER: validation failed. ${errors.join("; ")}`);
          else {
            const kickoffAfterBuild = matches.filter(match => toKickoffUtc(match) <= Date.now());
            if (kickoffAfterBuild.length) fail(`SNAPSHOT BLOCKER: kickoff passed during generation for ${kickoffAfterBuild.map(match => match.id).join(", ")}.`);
            else {
              const history = [...(previousFile.history || [])];
              if (existing.length) for (const match of existing) {
                const previous = previousById.get(match.id);
                history.push({ snapshotId: previous.snapshotId, matchId: previous.matchId, generatedAt: previous.generatedAt, hash: previous.integrity.sha256, supersededAt: generatedAt, reason, payload: previous });
              }
              const nextFile = { schemaVersion: 1, season, competition, matchday, generatedAt, snapshotCount: fresh.length, history, snapshots: fresh };
              write(base, nextFile);
              const manifestByMatch = new Map(manifest.snapshots.map(row => [row.matchId, row]));
              for (const snapshot of fresh) manifestByMatch.set(snapshot.matchId, {
                snapshotId: snapshot.snapshotId,
                snapshotFile: base,
                matchday: snapshot.matchday,
                matchId: snapshot.matchId,
                generatedAt: snapshot.generatedAt,
                modelVersion: snapshot.modelVersion,
                engineVersion: snapshot.engineVersion,
                lineupState: snapshot.lineupState,
                hash: snapshot.integrity.sha256,
                evaluationStatus: "PENDING",
                generationClass: "PROSPECTIVE IMMUTABLE SNAPSHOT",
                warningCount: snapshot.warnings.length
              });
              manifest.snapshots = [...manifestByMatch.values()].sort((a, b) => a.matchday - b.matchday || a.matchId.localeCompare(b.matchId));
              manifest.updatedAt = generatedAt;
              manifest.replacements = history.map(item => ({ snapshotId: item.snapshotId, matchId: item.matchId, previousGeneratedAt: item.generatedAt, newGeneratedAt: item.supersededAt, previousHash: item.hash, reason: item.reason }));
              write(manifestPath, manifest);
              if (previousPreview) fs.writeFileSync(previewPath, previousPreview);
              else fs.rmSync(previewPath, { force: true });
              console.log(`OK: ${fresh.length} immutable prospective snapshots -> ${base}`);
              console.log(`Manifest: ${manifestPath}; hash SHA-256 per match; no publish/commit/deploy performed.`);
              for (const snapshot of fresh) for (const warning of snapshot.warnings) console.warn(`WARNING ${snapshot.matchId}: ${warning}`);
              console.log(`preview source checksum: ${sha256(preview)}; transient preview was removed/restored after snapshot validation.`);
            }
          }
        }
      }
    }
    }
  }
}
