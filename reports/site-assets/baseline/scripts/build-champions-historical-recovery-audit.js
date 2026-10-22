"use strict";

const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-13";
const phase8Date = "2026-10-11";
const phase7Date = "2026-10-09";
const predictionPath = "data/normalized/champions-player-markets-md01-2026-27.json";
const rawRoot = path.join(root, "data/raw/champions-historical-recovery", auditDate);
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const readGzip = relative => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rawRoot, relative))));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
const sha256 = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const sha256File = relative => sha256(fs.readFileSync(path.join(root, relative)));
const finite = value => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

function decode(value = "") {
  const named = { amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">" };
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (full, name) => named[name.toLowerCase()] ?? full);
}

function clean(value = "") {
  return decode(String(value).replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return decode(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o").replace(/Ø/g, "O").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/ł/g, "l").replace(/Ł/g, "L").replace(/ı/g, "i").replace(/ß/g, "ss")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function teamEquivalent(a, b) {
  const x = normalize(a).replace(/\b(fc|cf|c f|fk|sk|vfb|rb)\b/g, "").replace(/\s+/g, " ").trim();
  const y = normalize(b).replace(/\b(fc|cf|c f|fk|sk|vfb|rb)\b/g, "").replace(/\s+/g, " ").trim();
  const aliases = new Map([
    ["real madrid", "real madrid"], ["real madrid c", "real madrid"],
    ["bayern munchen", "bayern munchen"], ["bayern m", "bayern munchen"],
    ["barcelona", "barcelona"], ["atletico", "atletico madrid"], ["atletico madrid", "atletico madrid"],
    ["lask linz", "lask"], ["lask", "lask"], ["bodo glimt", "bodo glimt"],
    ["dortmund", "borussia dortmund"], ["borussia dortmund", "borussia dortmund"],
    ["shakhtar", "shakhtar donetsk"], ["shakhtar donetsk", "shakhtar donetsk"],
    ["s bratislava", "slovan bratislava"], ["slovan bratislava", "slovan bratislava"],
    ["leipzig", "leipzig"], ["roma", "roma"], ["as roma", "roma"],
    ["paris saint germain", "paris saint germain"], ["paris", "paris saint germain"]
  ]);
  return (aliases.get(x) || x) === (aliases.get(y) || y);
}

function metric(rows, predictedKey, actualKey) {
  const cleanRows = rows.filter(row => finite(row[predictedKey]) !== null && finite(row[actualKey]) !== null);
  if (!cleanRows.length) return { n: 0, mae: null, rmse: null, bias: null };
  const errors = cleanRows.map(row => finite(row[predictedKey]) - finite(row[actualKey]));
  const round = value => Math.round(value * 1000) / 1000;
  return {
    n: cleanRows.length,
    mae: round(errors.reduce((sum, error) => sum + Math.abs(error), 0) / errors.length),
    rmse: round(Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length)),
    bias: round(errors.reduce((sum, error) => sum + error, 0) / errors.length)
  };
}

const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${phase7Date}.json`);
const phase8 = read(`data/analysis/champions/model-calibration-audit-${phase8Date}.json`);
const phase8Control = read(`data/analysis/champions/model-calibration-control-${phase8Date}.json`);
const identities = read(`data/analysis/champions/player-identity-recovery-${phase7Date}.json`);
const uefaAudit = read(`data/analysis/champions/uefa-squad-audit-${phase7Date}.json`);
const squads = read("data/normalized/champions-registered-squads-2026-27.json");
const calendar = read("data/normalized/champions-league-2026-27.json");
const teamSource = read("data/sources/champions-pilot-match-stats-2025-27.json");
const rawManifest = JSON.parse(fs.readFileSync(path.join(rawRoot, "manifest.json"), "utf8"));

function parseProfile(item) {
  const snapshot = readGzip(`uefa-profiles/${item.uefaPlayerId}.json.gz`);
  const title = clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(snapshot.body)?.[1] || "");
  const parts = title.split("|").map(value => value.trim()).filter(Boolean);
  const text = clean(snapshot.body);
  const dateOfBirth = /Date of birth\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text)?.[1] || null;
  const nationality = /Country\s+(.+?)\s+Date of birth/i.exec(text)?.[1]?.trim() || null;
  return {
    requestedPlayer: item.player,
    requestedTeam: item.team,
    internalPlayerId: item.playerId,
    uefaPlayerId: item.uefaPlayerId,
    profileName: parts[0] || null,
    profileClub: parts[1] || null,
    nationality,
    dateOfBirth,
    sourceUrl: snapshot.url,
    retrievedAt: snapshot.retrievedAt,
    nameMatch: normalize(parts[0]) === normalize(item.player),
    clubMatch: teamEquivalent(parts[1], item.team),
    idMatch: String(snapshot.url).includes(`/players/${item.uefaPlayerId}--`)
  };
}

const exactNameCases = identities.cases.filter(item => item.resolutionMethod === "uefa_exact_name");
const exactNameReview = exactNameCases.map(item => {
  const profile = parseProfile(item);
  const verified = profile.nameMatch && profile.clubMatch && profile.idMatch && profile.dateOfBirth && profile.nationality;
  return {
    ...profile,
    previousStatus: "exact-name-only",
    status: verified ? "resolved_verified" : "uncertain",
    confidence: verified ? "high" : "unresolved",
    resolutionMethod: verified ? "uefa_id_name_club_dob_nationality" : null,
    transferReview: "no conflicting dated transfer evidence in repository; identity resolution does not establish pre-kickoff registration timing"
  };
});

const mikaProfile = parseProfile({
  player: "Mika Medina", team: "Feyenoord", playerId: "mika-medina", uefaPlayerId: "250123956"
});
const mikaRegistryCounterpart = uefaAudit.cases.find(item => item.teamId === "feyenoord" && item.player === "Mika Mármol");
const mikaResolved = mikaProfile.clubMatch && mikaProfile.idMatch && normalize(mikaProfile.profileName) === "mika marmol"
  && mikaProfile.dateOfBirth === "02/7/2001" && normalize(mikaProfile.nationality) === "spain" && Boolean(mikaRegistryCounterpart);
const mikaReview = {
  requestedPlayer: "Mika Medina",
  internalPlayerId: "mika-medina",
  status: mikaResolved ? "resolved_verified_alias" : "uncertain",
  confidence: mikaResolved ? "high" : "unresolved",
  resolvedPlayer: mikaResolved ? "Mika Mármol Medina" : null,
  uefaPlayerId: mikaResolved ? "250123956" : null,
  providerPlayerId: mikaResolved ? mikaRegistryCounterpart.providerPlayerId : null,
  dateOfBirth: mikaProfile.dateOfBirth,
  nationality: mikaProfile.nationality,
  club: mikaProfile.profileClub,
  evidence: [
    { sourceUrl: mikaProfile.sourceUrl, retrievedAt: mikaProfile.retrievedAt, note: "Current UEFA profile: Mika Mármol, Feyenoord, Spain, 02/07/2001, UEFA ID 250123956." },
    { sourceUrl: "https://www.uefa.com/MultimediaFiles/Download/Publications/uefaorg/General/02/60/14/13/2601413_DOWNLOAD.pdf", note: "Official UEFA historical squad publication lists Mika Medina, ESP, 02.07.2001." },
    { sourceUrl: mikaRegistryCounterpart?.sourceUrl || null, note: "Current UEFA squad audit and domestic observations identify Mika Mármol at Feyenoord with provider ID 332573." }
  ],
  decision: mikaResolved
    ? "Verified truncated-surname alias; audit-only resolution. Production registry is not edited automatically."
    : "No identity assigned."
};

const verifiedDiscrepancies = uefaAudit.cases.filter(item => ["uefa_list_a_verified", "uefa_list_b_verified"].includes(item.uefaRegistrationStatus));
const discrepancyCases = verifiedDiscrepancies.map(item => {
  let classification;
  let confidence;
  let decision;
  if (item.player === "Joey Veerman") {
    classification = "transfer_then_uefa_list_a_registration";
    confidence = "high";
    decision = "Transfer chronology verified in Phase 8; internal 2026-09-07 registry snapshot is stale for the later Dortmund registration.";
  } else if (item.player === "Mika Mármol") {
    classification = "verified_alias_internal_identity_gap";
    confidence = mikaResolved ? "high" : "unresolved";
    decision = mikaResolved ? "Same player as internal Mika Medina; alias/identifier gap, not a second footballer." : "Alias remains unresolved.";
  } else if (item.uefaRegistrationStatus === "uefa_list_b_verified") {
    classification = "uefa_list_b_registration_after_or_missing_from_frozen_registry";
    confidence = "medium";
    decision = "Official List B status is verified, but UEFA page publication timing is unavailable; classify as temporal registration delta, not a proven internal error.";
  } else {
    classification = "uefa_list_a_registry_delta_timing_unresolved";
    confidence = "medium";
    decision = "Official current List A presence is verified; without a dated historical UEFA list, later registration and initial registry omission cannot be separated.";
  }
  return { ...item, classification, confidence, decision };
});

const discrepancyCounts = discrepancyCases.reduce((output, item) => {
  output[item.classification] = (output[item.classification] || 0) + 1;
  return output;
}, {});

const teamIdByName = new Map(squads.teams.map(team => [normalize(team.team), team.id]));
const teamAliases = new Map([
  ["as roma", "roma"], ["roma", "roma"], ["psg", "paris-saint-germain"],
  ["paris saint germain", "paris-saint-germain"], ["bayern munich", "bayern-munchen"],
  ["bayern munchen", "bayern-munchen"], ["bodo glimt", "bodo-glimt"], ["barcelona", "barcelona"]
]);
const teamId = name => teamIdByName.get(normalize(name)) || teamAliases.get(normalize(name)) || normalize(name).replace(/ /g, "-");
const squadById = new Map(squads.teams.map(team => [team.id, team]));

function candidatePlayers(fixture) {
  return [...fixture.shooters.totalShots, ...fixture.shooters.shotsOnTarget].reduce((map, player) => {
    const key = `${player.teamId}|${player.playerId}`;
    if (!map.has(key)) map.set(key, player);
    return map;
  }, new Map());
}

function rosterMatch(team, sourceName) {
  const roster = squadById.get(team)?.players || [];
  const needle = normalize(sourceName).replace(/^\d+\s+/, "");
  if (!needle) return null;
  const exact = roster.filter(player => normalize(player.name) === needle || normalize(player.id) === needle);
  if (exact.length === 1) return exact[0];
  const parts = needle.split(" ");
  const initial = parts[0]?.length === 1 ? parts[0] : null;
  const surname = parts.at(-1);
  const broad = roster.filter(player => {
    const words = normalize(player.name).split(" ");
    if (words.at(-1) !== surname && !normalize(player.name).endsWith(needle) && !needle.endsWith(words.at(-1))) return false;
    return !initial || words[0]?.startsWith(initial);
  });
  return broad.length === 1 ? broad[0] : null;
}

function parseSubstitutions(html) {
  const rows = [];
  const pattern = /<span[^>]*>\s*(\d{1,2})(?:\+(\d+))?'\s*<\/span>[\s\S]{0,2600}?<!-- Right arrow -->[\s\S]{0,2600}?<span>([^<]+)<\/span>\s*<span[^>]*>\(([^<]+)\)<\/span>/gi;
  for (const match of html.matchAll(pattern)) rows.push({ minute: Math.min(90, Number(match[1])), added: Number(match[2] || 0), entrant: clean(match[3]), outgoing: clean(match[4]) });
  return rows;
}

function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    try {
      const value = JSON.parse(decode(script[1]).trim());
      if (value?.["@type"] === "SportsEvent") return value;
    } catch { /* another JSON-LD block may be unrelated */ }
  }
  throw new Error("SportsEvent JSON-LD assente");
}

function propertyMap(object) {
  return new Map((object?.additionalProperty || []).map(item => [normalize(item.name), finite(item.value)]));
}

function parseStatPanel(html, panelId) {
  const marker = `id="stat-${panelId}-panel"`;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const next = html.indexOf('<div x-show="activeStatTab ===', start + marker.length);
  const panel = html.slice(start, next < 0 ? undefined : next);
  const rows = [];
  const pattern = /<div class="flex items-center justify-end gap-2([^"]*)">\s*<div[^>]*>([^<]+)<\/div>\s*<div[^>]*>(\d+)<\/div>\s*<\/div>/gi;
  for (const match of panel.matchAll(pattern)) rows.push({
    side: match[1].includes("flex-row-reverse") ? "away" : "home",
    sourceName: clean(match[2]),
    value: Number(match[3])
  });
  return rows;
}

function parseRecoveredMatch(fixture) {
  const snapshot = readGzip(`match-reports/${fixture.id}.json.gz`);
  const event = parseJsonLd(snapshot.body);
  const shotsPanel = parseStatPanel(snapshot.body, "shots");
  const sotPanel = parseStatPanel(snapshot.body, "shots_on_goal");
  const homeId = teamId(fixture.homeTeam), awayId = teamId(fixture.awayTeam);
  const sides = [
    { side: "home", teamId: homeId, team: fixture.homeTeam, eventTeam: event.homeTeam, lineup: fixture.probableFormation?.home },
    { side: "away", teamId: awayId, team: fixture.awayTeam, eventTeam: event.awayTeam, lineup: fixture.probableFormation?.away }
  ];
  const substitutions = parseSubstitutions(snapshot.body);
  const participants = [];
  const unresolved = [];

  for (const side of sides) {
    const starters = (side.lineup?.players || []).map(name => ({ sourceName: name, registry: rosterMatch(side.teamId, name) }));
    const active = new Map(starters.filter(item => item.registry).map(item => [item.registry.id, { ...item, minuteOn: 0, minuteOff: 90, starter: true }]));
    for (const item of starters.filter(item => !item.registry)) unresolved.push({ teamId: side.teamId, sourceName: item.sourceName, context: "starter" });

    for (const sub of substitutions) {
      const outgoing = rosterMatch(side.teamId, sub.outgoing);
      if (!outgoing || !active.has(outgoing.id)) continue;
      active.get(outgoing.id).minuteOff = sub.minute;
      const entrant = rosterMatch(side.teamId, sub.entrant);
      if (!entrant) {
        unresolved.push({ teamId: side.teamId, sourceName: sub.entrant, context: "substitute" });
        continue;
      }
      active.set(entrant.id, { sourceName: sub.entrant, registry: entrant, minuteOn: sub.minute, minuteOff: 90, starter: false });
    }

    const athleteStats = new Map();
    const athleteUnresolved = [];
    for (const athlete of side.eventTeam?.athlete || []) {
      const registry = rosterMatch(side.teamId, athlete.name);
      const properties = propertyMap(athlete);
      const sourcePlayerId = /\/player\/(\d+)/.exec(athlete.url || "")?.[1] || null;
      if (!registry) {
        athleteUnresolved.push({ player: athlete.name, sourcePlayerId, shots: properties.get("shots") || 0, shotsOnTarget: properties.get("shots on target sot") || 0 });
        continue;
      }
      athleteStats.set(registry.id, {
        sourcePlayerId,
        sourceName: clean(athlete.name),
        shots: properties.get("shots") || 0,
        shotsOnTarget: properties.get("shots on target sot") || 0
      });
    }
    const panelStats = new Map();
    const panelUnresolved = [];
    for (const item of shotsPanel.filter(row => row.side === side.side)) {
      const registry = rosterMatch(side.teamId, item.sourceName);
      if (!registry) panelUnresolved.push({ metric: "shots", sourceName: item.sourceName, value: item.value });
      else panelStats.set(registry.id, { ...(panelStats.get(registry.id) || { shots: 0, shotsOnTarget: 0 }), shots: item.value });
    }
    for (const item of sotPanel.filter(row => row.side === side.side)) {
      const registry = rosterMatch(side.teamId, item.sourceName);
      if (!registry) panelUnresolved.push({ metric: "shotsOnTarget", sourceName: item.sourceName, value: item.value });
      else panelStats.set(registry.id, { ...(panelStats.get(registry.id) || { shots: 0, shotsOnTarget: 0 }), shotsOnTarget: item.value });
    }
    const teamProperties = propertyMap(side.eventTeam);
    const expectedShots = teamProperties.get("shots total");
    const expectedSot = teamProperties.get("shots on target");
    const mappedShots = [...panelStats.values()].reduce((sum, player) => sum + player.shots, 0);
    const mappedSot = [...panelStats.values()].reduce((sum, player) => sum + player.shotsOnTarget, 0);
    const unresolvedShots = panelUnresolved.filter(item => item.metric === "shots").reduce((sum, player) => sum + player.value, 0);
    const unresolvedSot = panelUnresolved.filter(item => item.metric === "shotsOnTarget").reduce((sum, player) => sum + player.value, 0);
    const shotsExact = expectedShots !== null && mappedShots + unresolvedShots === expectedShots;
    const sotExact = expectedSot !== null && mappedSot + unresolvedSot === expectedSot;

    for (const activePlayer of active.values()) {
      const stat = panelStats.get(activePlayer.registry.id) || null;
      const sourceIdentity = athleteStats.get(activePlayer.registry.id) || null;
      participants.push({
        fixtureId: fixture.id,
        matchId: `playerstats:${fixture.id}`,
        team: side.team,
        teamId: side.teamId,
        player: activePlayer.registry.name,
        playerId: activePlayer.registry.id,
        uefaPlayerId: null,
        sourcePlayerId: sourceIdentity?.sourcePlayerId || null,
        starter: activePlayer.starter,
        minutes: Math.max(0, activePlayer.minuteOff - activePlayer.minuteOn),
        minuteMethod: "official-lineup-plus-playerstats-substitution-timeline",
        shots: shotsExact ? (stat?.shots || 0) : null,
        shotsOnTarget: sotExact ? (stat?.shotsOnTarget || 0) : null,
        sourceUrl: snapshot.url,
        sourceRetrievedAt: snapshot.retrievedAt,
        availabilityClass: "post_match_actual",
        identityConfidence: "team-roster-and-lineup-unique-match"
      });
    }
    side.reconciliation = { expectedShots, mappedShots, unresolvedShots, shotsExact, expectedSot, mappedSot, unresolvedSot, sotExact, panelUnresolved, athleteIdentityUnresolved: athleteUnresolved };
  }

  return {
    fixtureId: fixture.id,
    fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
    sourceUrl: snapshot.url,
    retrievedAt: snapshot.retrievedAt,
    substitutions,
    unresolved,
    reconciliation: sides.map(side => ({ teamId: side.teamId, team: side.team, ...side.reconciliation })),
    participants
  };
}

const fixtures = calendar.fixtures.filter(item => item.matchday === 1);
const recoveredFixtureIds = new Set(rawManifest.snapshots.filter(file => file.startsWith("match-reports/")).map(file => /([^/]+)\.json\.gz$/.exec(file)?.[1]));
const recoveredMatches = fixtures.filter(fixture => recoveredFixtureIds.has(fixture.id)).map(parseRecoveredMatch);

const existingActualByPair = new Map();
for (const team of phase6.teams) for (const match of team.matches.filter(item => item.competition === "uefa.champions")) {
  const key = String(match.matchId);
  if (!existingActualByPair.has(key)) existingActualByPair.set(key, []);
  existingActualByPair.get(key).push({ team: team.team, teamId: team.teamId, ...match });
}
const pairKey = ids => [...ids].sort().join("|");
const existingByPair = new Map([...existingActualByPair.entries()].map(([matchId, sides]) => [pairKey(sides.map(side => side.teamId)), { matchId, sides }]));

const existingMatches = fixtures.map(fixture => {
  const homeId = teamId(fixture.homeTeam), awayId = teamId(fixture.awayTeam);
  const actual = existingByPair.get(pairKey([homeId, awayId]));
  if (!actual) return null;
  return {
    fixtureId: fixture.id,
    fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
    sourceUrl: "ESPN raw snapshots indexed by Phase 6",
    retrievedAt: "2026-10-09T20:50:55.469Z",
    reconciliation: actual.sides.map(side => ({ teamId: side.teamId, team: side.team, shotsExact: side.reconciliation?.shots?.status === "exact", sotExact: side.reconciliation?.shotsOnTarget?.status === "exact" })),
    unresolved: [],
    participants: actual.sides.flatMap(side => side.players.filter(player => player.classification === "registered_active" && player.registeredPlayerId).map(player => ({
      fixtureId: fixture.id,
      matchId: actual.matchId,
      team: side.team,
      teamId: side.teamId,
      player: player.player,
      playerId: player.registeredPlayerId,
      uefaPlayerId: null,
      sourcePlayerId: player.providerPlayerId,
      starter: player.starter,
      minutes: finite(player.minutes),
      minuteMethod: "provider-match-stat",
      shots: finite(player.shots),
      shotsOnTarget: finite(player.shotsOnTarget),
      sourceUrl: player.sourceUrl || "ESPN",
      sourceRetrievedAt: "2026-10-09T20:50:55.469Z",
      availabilityClass: "post_match_actual",
      identityConfidence: "registered-player-id-and-provider-id"
    })))
  };
}).filter(Boolean);

const actualByFixture = new Map([...existingMatches, ...recoveredMatches].map(match => [match.fixtureId, match]));

const commitRows = git(["log", "--format=%H|%aI", "--", predictionPath]).split(/\r?\n/).filter(Boolean).map(line => {
  const [hash, committedAt] = line.split("|");
  const snapshot = JSON.parse(git(["show", `${hash}:${predictionPath}`]));
  let builderBlob = null;
  try { builderBlob = git(["rev-parse", `${hash}:scripts/build-champions-player-markets.js`]); } catch { /* historical file may not exist */ }
  return { hash, committedAt, generatedAt: snapshot.generatedAt, snapshot, builderBlob };
});

const evaluationRows = [];
const allActualRows = [];
const fixtureAudit = [];
for (const fixture of fixtures) {
  const kickoff = new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  const selected = commitRows.filter(row => new Date(row.committedAt) < kickoff && new Date(row.generatedAt) < kickoff)
    .sort((a, b) => new Date(b.committedAt) - new Date(a.committedAt))[0] || null;
  const prediction = selected?.snapshot.fixtures.find(item => item.fixtureId === fixture.id) || null;
  const predicted = prediction ? candidatePlayers(prediction) : new Map();
  const actual = actualByFixture.get(fixture.id) || null;
  const actualMap = new Map((actual?.participants || []).map(player => [`${player.teamId}|${player.playerId}`, player]));
  const fixtureRows = [];
  for (const player of predicted.values()) {
    const key = `${player.teamId}|${player.playerId}`;
    const observed = actualMap.get(key) || null;
    const complete = observed && [observed.minutes, observed.shots, observed.shotsOnTarget, player.projectedShots, player.projectedShotsOnTarget].every(value => finite(value) !== null);
    const row = {
      fixtureId: fixture.id,
      matchId: observed?.matchId || actual?.participants?.[0]?.matchId || null,
      fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
      date: fixture.date,
      kickoff: fixture.kickoff,
      team: player.team,
      teamId: player.teamId,
      player: player.name,
      playerId: player.playerId,
      stableObservationId: `${fixture.id}|${player.teamId}|${player.playerId}`,
      role: player.roleKey || normalize(player.role) || "unknown",
      predictionScope: "original-serialized-union-top5-shots-and-top5-sot",
      predictionStatus: selected ? "original_git_committed_pre_kickoff" : "missing",
      modelId: selected ? `champions-player-markets-md01@${selected.hash}` : null,
      modelBuilderBlob: selected?.builderBlob || null,
      predictionCommit: selected?.hash || null,
      predictionAvailableAt: selected?.committedAt || null,
      predictionGeneratedAt: selected?.generatedAt || null,
      predictedShots: finite(player.projectedShots),
      predictedSot: finite(player.projectedShotsOnTarget),
      actualMinutes: finite(observed?.minutes),
      actualShots: finite(observed?.shots),
      actualSot: finite(observed?.shotsOnTarget),
      actualSourceUrl: observed?.sourceUrl || actual?.sourceUrl || null,
      actualRetrievedAt: observed?.sourceRetrievedAt || actual?.retrievedAt || null,
      partition: complete ? "test" : "incomplete",
      chronologyStatus: selected ? "VALID_PREMATCH_FORECAST" : "NO_PREMATCH_FORECAST",
      evaluationStatus: complete ? "VALID" : observed ? "INCOMPLETE_ACTUAL" : "INCOMPLETE_NO_APPEARANCE",
      exclusionReason: complete ? null : observed ? "actual_minutes_shots_or_sot_missing" : "no_observed_appearance"
    };
    fixtureRows.push(row);
    evaluationRows.push(row);
  }
  for (const observed of actual?.participants || []) {
    const key = `${observed.teamId}|${observed.playerId}`;
    const forecast = predicted.get(key) || null;
    allActualRows.push({
      ...observed,
      stableObservationId: `${fixture.id}|${observed.teamId}|${observed.playerId}`,
      originalForecastAvailable: Boolean(forecast),
      originalForecastScope: forecast ? "serialized-top5-union" : "not-serialized-beyond-top5",
      predictedShots: forecast ? finite(forecast.projectedShots) : null,
      predictedSot: forecast ? finite(forecast.projectedShotsOnTarget) : null,
      partition: forecast ? "test-or-incomplete" : "actual-only-not-evaluable"
    });
  }
  fixtureAudit.push({
    fixtureId: fixture.id,
    fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
    date: fixture.date,
    kickoff: fixture.kickoff,
    predictionSnapshot: selected ? { commit: selected.hash, committedAt: selected.committedAt, generatedAt: selected.generatedAt, builderBlob: selected.builderBlob } : null,
    actualSource: actual ? { url: actual.sourceUrl, retrievedAt: actual.retrievedAt, participants: actual.participants.length } : null,
    candidateObservations: fixtureRows.length,
    validObservations: fixtureRows.filter(row => row.evaluationStatus === "VALID").length,
    incompleteObservations: fixtureRows.filter(row => row.evaluationStatus !== "VALID").length,
    status: fixtureRows.some(row => row.evaluationStatus === "VALID") ? "VALID" : actual ? "INCOMPLETE" : "UNUSABLE"
  });
}

const validRows = evaluationRows.filter(row => row.evaluationStatus === "VALID");
const incompleteRows = evaluationRows.filter(row => row.evaluationStatus !== "VALID");
const beyondTop5 = allActualRows.filter(row => !row.originalForecastAvailable);
const metrics = {
  shots: metric(validRows, "predictedShots", "actualShots"),
  shotsOnTarget: metric(validRows, "predictedSot", "actualSot"),
  brier: { status: "NOT_CALCULATED", reason: "Original serialized artifacts contain point forecasts, not verified event probabilities for these observations." },
  pairedComparisons: { status: "NOT_RUN", commonObservations: 0, reason: "No chronology-admissible B/C forecasts exist on the same observations." }
};

const protectedChanges = Object.values(phase8Control.protectedFiles).filter(item => sha256File(item.path) !== item.sha256).map(item => item.path);
const protectedRawChanges = phase8Control.protectedRawSnapshots.filter(item => sha256File(item.path) !== item.sha256).map(item => item.path);
const phase9RawHashes = rawManifest.snapshots.map(file => ({ path: `data/raw/champions-historical-recovery/${auditDate}/${file}`, sha256: sha256File(`data/raw/champions-historical-recovery/${auditDate}/${file}`) }));
const allRecoveredExact = recoveredMatches.every(match => match.reconciliation.every(side => side.shotsExact && side.sotExact));
const allProfilesResolved = exactNameReview.every(item => item.status === "resolved_verified");
const gate = protectedChanges.length || protectedRawChanges.length ? "BLOCKED" : "PARTIAL";

const dataset = {
  schemaVersion: 1,
  phase: "9",
  generatedAt: new Date().toISOString(),
  scope: "Chronology-safe Champions MD1 evaluation dataset; production model is frozen.",
  partitions: {
    training: { rows: [], status: "NOT_CREATED", reason: "No new fitting is authorized; historical 2025/26 inputs remain model provenance, not Phase 9 training rows." },
    calibration: { rows: [], status: "NOT_CREATED", reason: "No independent chronological calibration window exists." },
    test: { rows: validRows, status: validRows.length ? "DESCRIPTIVE_ONLY" : "EMPTY" },
    incomplete: { rows: incompleteRows },
    actualOnlyBeyondTop5: { rows: beyondTop5, status: "NOT_EVALUABLE_WITHOUT_ORIGINAL_FORECAST" }
  },
  summary: {
    fixtures: fixtureAudit.length,
    validFixtures: fixtureAudit.filter(item => item.status === "VALID").length,
    originalForecastCandidates: evaluationRows.length,
    validObservations: validRows.length,
    incompleteObservations: incompleteRows.length,
    actualPlayerObservations: allActualRows.length,
    actualOnlyBeyondTop5: beyondTop5.length,
    originalForecastsBeyondTop5: 0
  },
  fixtures: fixtureAudit
};

const audit = {
  schemaVersion: 1,
  phase: "9",
  auditDate,
  status: gate,
  scope: "Historical recovery, identity resolution and chronology-safe evaluation. No calibration or production activation.",
  identityResolution: {
    exactNameOnlyReviewed: exactNameReview.length,
    resolvedVerified: exactNameReview.filter(item => item.status === "resolved_verified").length,
    uncertain: exactNameReview.filter(item => item.status !== "resolved_verified").length,
    cases: exactNameReview,
    mikaMedina: mikaReview
  },
  uefaRegistryDiscrepancies: {
    total: discrepancyCases.length,
    countsByClassification: discrepancyCounts,
    confirmedRealErrors: 0,
    cases: discrepancyCases
  },
  historicalRecovery: {
    matchReportsRecovered: recoveredMatches.length,
    previousCompleteMatches: existingMatches.length,
    totalMatchesWithActuals: actualByFixture.size,
    recoveredReportsReconcileShotsAndSot: allRecoveredExact,
    matchDiagnostics: recoveredMatches.map(match => ({
      fixtureId: match.fixtureId,
      fixture: match.fixture,
      sourceUrl: match.sourceUrl,
      retrievedAt: match.retrievedAt,
      substitutions: match.substitutions.length,
      participants: match.participants.length,
      unresolvedLineupIdentities: match.unresolved,
      reconciliation: match.reconciliation
    })),
    rawSnapshots: phase9RawHashes,
    sourceTimingPolicy: "Forecasts must be generated and Git-committed strictly before kickoff. Match reports and actuals are post-match outcome evidence only and are never model inputs.",
    forecastInventory: {
      gitVersions: commitRows.length,
      path: predictionPath,
      allVersionsSerializeTopFiveOnly: commitRows.every(row => row.snapshot.fixtures.every(fixture => fixture.shooters.totalShots.length === 5 && fixture.shooters.shotsOnTarget.length === 5)),
      reconstructedForecastsUsed: false
    }
  },
  evaluationDataset: dataset.summary,
  metrics,
  sampleAssessment: {
    status: "INSUFFICIENT_FOR_CALIBRATION",
    reasons: [
      "Only one matchday is available as a chronology-valid test window.",
      "Original serialized player forecasts are restricted to the union of top-five shots and top-five SOT candidates.",
      "No independent training and calibration windows exist for candidates B/C.",
      "No verified original event probabilities exist for Brier scoring."
    ]
  },
  invariants: {
    phase8ProtectedFilesChanged: protectedChanges,
    phase8ProtectedRawChanged: protectedRawChanges,
    productionModelChanged: false,
    serieAV2Changed: false,
    md6Changed: false,
    calibrationActivated: false,
    commitPushDeployPerformed: false
  },
  gate: {
    value: gate,
    reasons: gate === "PARTIAL" ? [
      `${validRows.length} chronology-valid original forecast observations are evaluable across ${fixtureAudit.filter(item => item.status === "VALID").length}/18 MD1 fixtures.`,
      `${exactNameReview.filter(item => item.status === "resolved_verified").length}/37 exact-name-only cases and Mika Medina are resolved in the audit with independent UEFA identity fields.`,
      "The sample is still one matchday and top-five-only; no independent calibration or later test window exists.",
      "Brier and paired A/B/C comparisons remain blocked by missing original probabilities and missing common chronology-valid predictions."
    ] : ["A protected Phase 8 invariant changed; evaluation must fail closed."],
    nextMinimumPhase: "Freeze complete pre-match forecasts for every eligible player before MD2/MD3, including model/version/timestamp and original probabilities where the model genuinely emits them; after outcomes, form one calibration window and at least one later untouched test window."
  }
};

write(`data/analysis/champions/historical-recovery-audit-${auditDate}.json`, audit);
write(`data/analysis/champions/historical-evaluation-dataset-${auditDate}.json`, dataset);

const table = rows => rows.map(row => `| ${row.map(value => String(value ?? "N/D").replace(/\|/g, "\\|")).join(" | ")} |`).join("\n");
const fmt = value => value === null || value === undefined ? "N/D" : String(value).replace(".", ",");
const report = `# Champions League 2026/27 — Fase 9 historical recovery & identity resolution

Data audit: **${auditDate}**  
Gate finale: **${gate}**

## 1. Identità

- Casi \`exact-name-only\` riesaminati: **${exactNameReview.length}**.
- Risolti con UEFA ID + nome + club + data di nascita + nazionalità: **${audit.identityResolution.resolvedVerified}**.
- Ancora incerti tra i 37: **${audit.identityResolution.uncertain}**.
- Mika Medina: **${mikaReview.status}** → ${mikaReview.resolvedPlayer || "N/D"}; risoluzione soltanto nell'audit, nessuna modifica automatica al registro di produzione.

| squadra | identità richiesta | UEFA ID | data nascita | nazionalità | stato | confidenza |
|---|---|---:|---|---|---|---|
${table(exactNameReview.map(item => [item.requestedTeam, item.requestedPlayer, item.uefaPlayerId, item.dateOfBirth, item.nationality, item.status, item.confidence]))}

## 2. Discrepanze UEFA / registro interno

Totale: **${discrepancyCases.length}**. Errori reali confermati: **0**; l'assenza di un timestamp storico UEFA impedisce di trasformare i delta List A in errori certi.

| classificazione | casi |
|---|---:|
${table(Object.entries(discrepancyCounts))}

La voce Mika Mármol è una lacuna di alias/identificatori rispetto a Mika Medina; Joey Veerman è un trasferimento cronologicamente coerente. Le 26 List B sono delta di registrazione rispetto allo snapshot interno congelato del 7 settembre. Le restanti List A restano temporalmente ambigue tra registrazione successiva e omissione iniziale.

## 3. Recupero storico e cronologia

| misura | valore |
|---|---:|
| Referti MD1 nuovi | ${recoveredMatches.length} |
| Partite già complete in Fase 8 | ${existingMatches.length} |
| Partite con actual disponibili | ${actualByFixture.size}/18 |
| Referti nuovi con tiri/SOT riconciliati | ${recoveredMatches.filter(match => match.reconciliation.every(side => side.shotsExact && side.sotExact)).length}/${recoveredMatches.length} |
| Versioni Git del forecast originale | ${commitRows.length} |
| Ricostruzioni retroattive usate | 0 |

I forecast ammessi sono esclusivamente snapshot generati e committati prima del kickoff. I referti recuperati il ${auditDate} sono esiti post-partita e non vengono mai trattati come input prepartita. Le statistiche current-season raccolte dopo MD1 restano escluse dai baseline B/C storici.

## 4. Dataset di valutazione

| partizione | osservazioni | uso |
|---|---:|---|
| training | 0 | non creata; nessun refit autorizzato |
| calibration | 0 | finestra indipendente assente |
| test cronologicamente valido | ${validRows.length} | metriche descrittive baseline A |
| incompleto | ${incompleteRows.length} | escluso dalle metriche |
| actual oltre top-5 senza forecast originale | ${beyondTop5.length} | non valutabile |

Partite con almeno un'osservazione valida: **${fixtureAudit.filter(item => item.status === "VALID").length}/18**. Gli artefatti Git serializzano sempre soltanto top-5 tiri e top-5 SOT: copertura forecast originale oltre top-5 **0**. Sono stati conservati gli actual oltre top-5, ma non sono state inventate previsioni retroattive.

## 5. Metriche valide

| metrica | n | MAE | RMSE | bias |
|---|---:|---:|---:|---:|
| tiri | ${metrics.shots.n} | ${fmt(metrics.shots.mae)} | ${fmt(metrics.shots.rmse)} | ${fmt(metrics.shots.bias)} |
| SOT | ${metrics.shotsOnTarget.n} | ${fmt(metrics.shotsOnTarget.mae)} | ${fmt(metrics.shotsOnTarget.rmse)} | ${fmt(metrics.shotsOnTarget.bias)} |

Bias = predetto − osservato. Brier: **NON CALCOLATO**. Confronti paired A/B/C: **NON ESEGUITI**. Mancano probabilità originali verificabili e previsioni B/C cronologicamente ammissibili sulle stesse osservazioni.

## 6. Blocchi residui

1. Una sola giornata costituisce il test cronologico.
2. Nessun forecast originale oltre l'unione top-5 tiri/top-5 SOT è stato serializzato.
3. Nessuna finestra indipendente di training/calibrazione/test per B/C.
4. Nessuna probabilità evento originale verificabile per Brier.
5. Le cinque discrepanze List A non Veerman/non Mika non hanno un timestamp storico UEFA che separi registrazione tardiva da omissione del registro.

## 7. Protezioni

- File protetti Fase 8 mutati: **${protectedChanges.length}**.
- Raw protetti Fase 8 mutati: **${protectedRawChanges.length}**.
- Motore, formule, coefficienti, Serie A V2, MD6, HTML/UI: **invariati**.
- Commit, push, deploy: **non eseguiti**.

## 8. Gate finale

**${gate}**

La valutazione descrittiva è ora estesa alle osservazioni originali recuperabili, ma il gate non può essere READY per una calibrazione attendibile: resta una sola finestra test e il forecast originale è top-5-only.

Fase minima successiva proposta: **${audit.gate.nextMinimumPhase}**
`;

write(`output/reports/champions-historical-recovery-audit-${auditDate}.md`, report);
console.log(`Champions Phase 9: ${gate} · ${fixtureAudit.filter(item => item.status === "VALID").length}/18 partite · ${validRows.length} osservazioni valide · ${beyondTop5.length} actual oltre top-5`);
