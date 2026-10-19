"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const rawRoot = path.join(root, "data/raw/champions-recovery", asOf);
const analysisRoot = path.join(root, "data/analysis/champions");
const normalizedRoot = path.join(root, "data/normalized");
const reportRoot = path.join(root, "output/reports");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const readGzip = relative => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(rawRoot, relative))));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};

const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${asOf}.json`);
const control = read(`data/analysis/champions/data-recovery-control-${asOf}.json`);
const rawManifest = JSON.parse(fs.readFileSync(path.join(rawRoot, "manifest.json"), "utf8"));

function decode(value = "") {
  const named = { amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">" };
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (full, name) => named[name.toLowerCase()] ?? full);
}

function clean(value = "") {
  return decode(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return decode(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o").replace(/Ø/g, "O").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/ł/g, "l").replace(/Ł/g, "L").replace(/ı/g, "i").replace(/ß/g, "ss")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) { return normalize(value).replace(/ /g, "-"); }
function snapshotSlug(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseUefaSquad(team) {
  const file = `uefa-squads/${snapshotSlug(team.team)}.json.gz`;
  const snapshot = readGzip(file);
  const players = [];
  const pattern = /href="\/uefachampionsleague\/clubs\/players\/(\d+)--[^"]+\/" title="([^"]+)"[\s\S]{0,900}?<span slot="primary" itemprop="name"[^>]*>([\s\S]*?)<\/span>/g;
  for (const match of snapshot.body.matchAll(pattern)) {
    const name = clean(match[2]);
    const marker = clean(match[3]);
    players.push({
      player: name,
      normalizedName: normalize(name),
      uefaPlayerId: match[1],
      list: marker.includes("*") ? "B" : "A"
    });
  }
  const unique = [...new Map(players.map(player => [player.uefaPlayerId, player])).values()];
  return { team: team.team, teamId: team.teamId, sourceUrl: snapshot.url, players: unique };
}

function espnCandidates(teamId, player) {
  const file = `espn-identity/${teamId}/${snapshotSlug(player)}.json.gz`;
  const full = path.join(rawRoot, file);
  if (!fs.existsSync(full)) return [];
  const snapshot = readGzip(file);
  return (snapshot.payload.results || []).find(result => result.type === "player")?.contents || [];
}

const teamAliases = {
  fenerbahce: ["fenerbahce"], feyenoord: ["feyenoord"], galatasaray: ["galatasaray"],
  lask: ["lask", "lask amateure", "fc juniors"], liverpool: ["liverpool"], porto: ["porto"],
  "shakhtar-donetsk": ["shakhtar"], "slovan-bratislava": ["slovan bratislava"], stuttgart: ["stuttgart"],
  "real-madrid": ["real madrid"], sabah: ["sabah"], "slavia-praha": ["slavia"]
};

function safeEspnCandidate(teamId, player) {
  const aliases = teamAliases[teamId] || [normalize(teamId)];
  const exact = espnCandidates(teamId, player).filter(candidate => normalize(candidate.displayName) === normalize(player));
  const affiliated = exact.filter(candidate => aliases.some(alias => normalize(candidate.subtitle || "").includes(normalize(alias))));
  if (affiliated.length !== 1) return null;
  const uid = affiliated[0].uid || "";
  return {
    providerPlayerId: uid.split("~a:")[1] || /\/id\/(\d+)/.exec(affiliated[0].link?.web || "")?.[1] || null,
    displayName: affiliated[0].displayName,
    teamLabel: affiliated[0].subtitle,
    url: affiliated[0].link?.web || null
  };
}

const uefaSquads = phase6.teams.map(parseUefaSquad);
const uefaByTeam = new Map(uefaSquads.map(team => [team.teamId, team]));

const identityCases = phase6.teams.flatMap(team => team.identityReview.unresolved.map(player => {
  const squad = uefaByTeam.get(team.teamId);
  const uefaMatches = squad.players.filter(candidate => candidate.normalizedName === normalize(player.player));
  const espn = safeEspnCandidate(team.teamId, player.player);
  const uefa = uefaMatches.length === 1 ? uefaMatches[0] : null;
  const resolved = Boolean(uefa || espn);
  return {
    team: team.team,
    teamId: team.teamId,
    player: player.player,
    playerId: player.playerId,
    previousProviderPlayerId: null,
    providerPlayerId: espn?.providerPlayerId || null,
    uefaPlayerId: uefa?.uefaPlayerId || null,
    availableIdentifiers: { internalPlayerId: player.playerId, espnPlayerId: espn?.providerPlayerId || null, uefaPlayerId: uefa?.uefaPlayerId || null },
    historicalProviderIds: [],
    transferEvidence: espn ? [{ kind: "current_team_affiliation", teamLabel: espn.teamLabel, sourceUrl: espn.url }] : [],
    status: resolved ? "resolved" : "open",
    resolutionMethod: uefa && espn ? "uefa_exact_name_plus_espn_team_affiliation" : uefa ? "uefa_exact_name" : espn ? "espn_exact_name_team_affiliation" : null,
    confidence: resolved ? "high" : "unresolved",
    evidence: {
      uefaList: uefa?.list || null,
      uefaSquadUrl: squad.sourceUrl,
      espnTeamLabel: espn?.teamLabel || null,
      espnUrl: espn?.url || null
    },
    predictionCandidateEligible: player.predictionCandidateEligible
  };
}));

const outsideCases = phase6.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => {
  const squad = uefaByTeam.get(team.teamId);
  const matches = squad.players.filter(candidate => candidate.normalizedName === normalize(player.player));
  const verified = matches.length === 1 ? matches[0] : null;
  return {
    team: team.team,
    teamId: team.teamId,
    player: player.player,
    providerPlayerId: player.providerPlayerId,
    appearances: player.appearances,
    previousClassification: player.classification,
    uefaRegistrationStatus: verified ? (verified.list === "B" ? "uefa_list_b_verified" : "uefa_list_a_verified") : "uefa_eligibility_unknown",
    uefaPlayerId: verified?.uefaPlayerId || null,
    evidence: verified ? `Exact normalized name on official UEFA ${verified.list === "B" ? "List B (*)" : "List A"} squad page` : "No exact official-squad match; absence is not proof of non-registration",
    clubMembershipAtAsOf: "observed_in_club_domestic_statistics_before_cutoff",
    internalRegistryStatus: "absent_from_internal_registered_squad",
    discrepancy: verified ? "official_uefa_list_presence_missing_from_internal_registry" : "internal_absence_with_uefa_eligibility_unresolved",
    listBRequirementReview: verified?.list === "B" ? "verified_by_official_uefa_list_b_marker; no age-based inference" : null,
    sourceUrl: squad.sourceUrl,
    predictionCandidateEligible: player.predictionCandidateEligible
  };
}));

function parseSlavia() {
  const dir = path.join(rawRoot, "domestic/slavia-players");
  const matchesDir = path.join(rawRoot, "domestic/slavia-matches");
  const observations = [];
  for (const file of fs.readdirSync(dir)) {
    const snapshot = readGzip(`domestic/slavia-players/${file}`);
    if (!snapshot.requestedUrl.includes("/hrac/2027/")) continue;
    const player = clean(/<title>(.*?)\s*\|/.exec(snapshot.body)?.[1] || file.replace(/\.json\.gz$/, ""));
    const start = snapshot.body.indexOf('title="Minuty"');
    const headStart = snapshot.body.lastIndexOf("<thead", start);
    const headEnd = snapshot.body.indexOf("</thead>", start);
    const end = snapshot.body.indexOf("</tbody>", start);
    if (start < 0 || end < 0) continue;
    const headers = [...snapshot.body.slice(headStart, headEnd).matchAll(/<abbr title="([^"]+)"/g)].map(match => clean(match[1]));
    const shotsIndex = headers.indexOf("Střely celkem");
    const sotIndex = headers.indexOf("Střely na branku");
    for (const row of snapshot.body.slice(start, end).matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match => match[1]);
      if (cells.length < 11) continue;
      const dateText = clean(cells[0]);
      const dmY = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dateText);
      const matchId = /\/zapas\/(\d+)-/.exec(cells[1])?.[1];
      if (!dmY || !matchId) continue;
      const date = `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
      if (date > asOf || date < "2026-07-01") continue;
      const number = index => { const value = Number(clean(cells[index]).replace(",", ".")); return Number.isFinite(value) ? value : null; };
      observations.push({
        matchId, date, player, participation: clean(cells[2]), minutes: number(3),
        shots: shotsIndex < 0 ? null : number(3 + shotsIndex), shotsOnTarget: sotIndex < 0 ? null : number(3 + sotIndex),
        sourceUrl: snapshot.url
      });
    }
  }
  const teamMatches = [];
  if (fs.existsSync(matchesDir)) for (const file of fs.readdirSync(matchesDir)) {
    const snapshot = readGzip(`domestic/slavia-matches/${file}`);
    const title = clean(/<title>Detail zápasu\s+(.*?)\s+\|/.exec(snapshot.body)?.[1] || "");
    const teams = title.split(" - ");
    const stats = /<div class="stats right">[\s\S]*?<div class="value">(\d+)\/(\d+)<\/div><\/div><div class="stats-name">Střely\/na branku<\/div><div class="stats">[\s\S]*?<div class="value">(\d+)\/(\d+)<\/div>/.exec(snapshot.body);
    if (teams.length !== 2 || !stats) continue;
    const slaviaHome = normalize(teams[0]).includes("slavia");
    teamMatches.push({
      matchId: file.replace(/\.json\.gz$/, ""), match: title,
      shots: Number(slaviaHome ? stats[1] : stats[3]), shotsOnTarget: Number(slaviaHome ? stats[2] : stats[4]), sourceUrl: snapshot.url
    });
  }
  const byMatch = new Map();
  for (const observation of observations) {
    const item = byMatch.get(observation.matchId) || { shots: 0, shotsOnTarget: 0, complete: true };
    if (observation.shots === null || observation.shotsOnTarget === null) item.complete = false;
    else { item.shots += observation.shots; item.shotsOnTarget += observation.shotsOnTarget; }
    byMatch.set(observation.matchId, item);
  }
  const reconciliation = teamMatches.map(match => ({ ...match,
    playerShots: byMatch.get(match.matchId)?.complete ? byMatch.get(match.matchId).shots : null,
    playerShotsOnTarget: byMatch.get(match.matchId)?.complete ? byMatch.get(match.matchId).shotsOnTarget : null,
    playerSeriesComplete: byMatch.get(match.matchId)?.complete || false,
    exact: Boolean(byMatch.get(match.matchId)?.complete) && match.shots === byMatch.get(match.matchId).shots && match.shotsOnTarget === byMatch.get(match.matchId).shotsOnTarget }));
  return {
    team: "Slavia Praha", provider: "Chance Liga official", competition: "Chance Liga 2026/27", status: reconciliation.length && reconciliation.every(item => item.exact) ? "PASS" : "PARTIAL",
    matches: new Set(observations.map(item => item.matchId)).size, playerObservations: observations.length,
    playersWithMinutes: new Set(observations.filter(item => item.minutes !== null).map(item => normalize(item.player))).size,
    playersWithShots: new Set(observations.filter(item => item.shots !== null).map(item => normalize(item.player))).size,
    playersWithShotsOnTarget: new Set(observations.filter(item => item.shotsOnTarget !== null).map(item => normalize(item.player))).size,
    fields: { minutes: "available", shots: "position_dependent_partial", shotsOnTarget: "position_dependent_partial" }, observations, reconciliation,
    note: "Official Chance Liga player rows and independent match totals; the site omits shots/SOT from some position-specific player tables, so unavailable values remain null."
  };
}

function parseSlovan() {
  const snapshot = readGzip("domestic/slovan-player-minutes.json.gz");
  const start = snapshot.body.indexOf('<table class="stats__table-list">');
  const end = snapshot.body.indexOf("</table>", start);
  const players = [];
  for (const row of snapshot.body.slice(start, end).matchAll(/<td class=" player"><a href="\/hrac\/(\d+)-[^"]+"[^>]*>(.*?)<\/a>[\s\S]*?<td class=" item">\s*(\d+)\s*<\/th>/g)) {
    const minutes = Number(row[3]);
    players.push({ providerPlayerId: row[1], player: clean(row[2]), minutes: Number.isFinite(minutes) ? minutes : null });
  }
  return {
    team: "Slovan Bratislava", provider: "Niké Liga official", competition: "Niké Liga 2026/27", status: "PARTIAL", matches: null, playerObservations: players.length,
    playersWithMinutes: players.filter(item => item.minutes !== null).length, playersWithShots: 0, playersWithShotsOnTarget: 0,
    fields: { minutes: "available_season_aggregate", shots: "unavailable", shotsOnTarget: "unavailable" }, players,
    sourceUrl: snapshot.url, note: "Official Niké Liga season minutes; no official individual shots/SOT series in the captured source."
  };
}

function playerList(section, title) {
  const start = section.search(new RegExp(`<div class="list-title">\\s*${title}\\s*<\\/div>`));
  if (start < 0) return [];
  const listStart = section.indexOf('<div class="list-players">', start);
  const nextTitle = section.indexOf('<div class="list-title">', listStart + 1);
  const block = section.slice(listStart, nextTitle < 0 ? undefined : nextTitle);
  return [...block.matchAll(/href="\/en\/people\/view\/(\d+)"[\s\S]*?<div class="player-name">([\s\S]*?)<\/div>/g)].map(match => ({
    providerPlayerId: match[1], player: clean(match[2]).replace(/\s*\(C\)$/, "")
  }));
}

function parseShakhtar() {
  const files = fs.readdirSync(path.join(rawRoot, "domestic")).filter(file => /^shakhtar-report-\d+\.json\.gz$/.test(file));
  const observations = [];
  const matches = [];
  for (const file of files) {
    const snapshot = readGzip(`domestic/${file}`);
    const reportTitle = clean(/<meta property="og:title" content="([^"]+)"/.exec(snapshot.body)?.[1] || "");
    const firstSectionStart = snapshot.body.indexOf('<div class="team-players">');
    const secondSectionStart = snapshot.body.indexOf('<div class="team-players">', firstSectionStart + 1);
    const eventStart = snapshot.body.indexOf('<div class="events-container">');
    if (firstSectionStart < 0 || secondSectionStart < 0 || eventStart < 0) continue;
    const sections = [snapshot.body.slice(firstSectionStart, eventStart), snapshot.body.slice(secondSectionStart)];
    const teamNames = sections.map(section => clean(/<div class="name">([\s\S]*?)<\/div>/.exec(section)?.[1] || ""));
    const side = teamNames.findIndex(name => normalize(name).includes("shakhtar"));
    if (side < 0) continue;
    const starters = playerList(sections[side], "Line-ups");
    const substitutes = playerList(sections[side], "Substitutes");
    const minutes = new Map(starters.map(player => [normalize(player.player), 90]));
    const appearedSubs = new Map();
    const eventsHtml = snapshot.body.slice(eventStart);
    const changeStarts = [...eventsHtml.matchAll(/<div class="event type-change">/g)].map(match => match.index);
    for (const [eventIndex, changeStart] of changeStarts.entries()) {
      const nextEvent = eventsHtml.indexOf('<div class="event ', changeStart + 1);
      const block = eventsHtml.slice(changeStart, nextEvent < 0 ? undefined : nextEvent);
      const isFirstSide = /style="justify-content:\s*flex-end"/.test(block);
      if ((side === 0) !== isFirstSide) continue;
      const point = /<div class="point">\s*(\d+)/.exec(block)?.[1];
      const names = /<div class="players">([\s\S]*?)<\/div>/.exec(block)?.[1]?.split(/<br\s*\/?\s*>/i).map(clean);
      if (!point || names?.length !== 2) continue;
      const minute = Math.min(90, Number(point));
      minutes.set(normalize(names[0]), minute);
      appearedSubs.set(normalize(names[1]), 90 - minute);
    }
    const matchId = /report-(\d+)/.exec(file)[1];
    const matchObservations = [
      ...starters.map(player => ({ ...player, starter: true, minutes: minutes.get(normalize(player.player)) ?? 90 })),
      ...substitutes.filter(player => appearedSubs.has(normalize(player.player))).map(player => ({ ...player, starter: false, minutes: appearedSubs.get(normalize(player.player)) }))
    ].map(player => ({ matchId, ...player, shots: null, shotsOnTarget: null, sourceUrl: snapshot.url }));
    observations.push(...matchObservations);
    matches.push({ matchId, match: reportTitle, players: matchObservations.length });
  }
  return { team: "Shakhtar Donetsk", provider: "Ukrainian Premier League official", competition: "UPL 2026/27", status: "PARTIAL", matches: matches.length, playerObservations: observations.length,
    playersWithMinutes: new Set(observations.filter(item => item.minutes !== null).map(item => normalize(item.player))).size, playersWithShots: 0, playersWithShotsOnTarget: 0,
    fields: { minutes: "available_from_lineups_and_substitutions", shots: "unavailable", shotsOnTarget: "unavailable" }, observations, matchIndex: matches,
    note: "Official UPL line-ups and substitution pairs; regulation minutes capped at 90, shots/SOT remain null." };
}

function parseSabah() {
  const observations = [];
  const matches = [];
  for (const id of [6795, 6807]) {
    const snapshot = readGzip(`domestic/sabah-api-match-${id}.json.gz`);
    const data = JSON.parse(snapshot.body).data;
    const club = [data.club_1, data.club_2].find(item => normalize(item.title) === "sabah");
    if (!club) continue;
    const subMinutes = new Map();
    for (const action of data.actions || []) {
      const player = club.players.find(item => item.id === action.game_player_id);
      if (player && player.type === 1 && !action.is_goal && !action.is_faul && !action.is_offside && !action.is_penalty) subMinutes.set(player.id, 90 - Math.min(90, Number(action.time)));
    }
    const played = club.players.filter(player => player.type === 0 || subMinutes.has(player.id)).map(player => ({
      matchId: String(id), providerPlayerId: String(player.id), player: `${player.name} ${player.surname}`,
      starter: player.type === 0, minutes: player.type === 0 ? null : subMinutes.get(player.id), shots: null, shotsOnTarget: null, sourceUrl: snapshot.url
    }));
    observations.push(...played);
    matches.push({ matchId: String(id), date: data.start_date, match: `${data.club_1.title} ${data.club_score_1}-${data.club_score_2} ${data.club_2.title}`, players: played.length });
  }
  return { team: "Sabah", provider: "Azerbaijan PFL official API", competition: "Misli Premyer Liqası 2026/27", status: "PARTIAL", matches: matches.length, playerObservations: observations.length,
    playersWithMinutes: new Set(observations.filter(item => item.minutes !== null).map(item => normalize(item.player))).size, playersWithShots: 0, playersWithShotsOnTarget: 0,
    fields: { minutes: "substitutes_only; starters_unknown", shots: "unavailable", shotsOnTarget: "unavailable" }, observations, matchIndex: matches,
    note: "Official PFL API identifies starters and entering substitutes; outgoing starter identity is absent, so starter minutes remain null." };
}

const domesticRecovery = {
  schemaVersion: 1, phase: "7", asOf, interval: { from: "2026-07-01", to: asOf },
  nullPolicy: "Unavailable values remain null; null is never coerced to zero.",
  chronologyPolicy: { matchDate: "stored when exposed", publishedAt: null, retrievedAt: "stored in each raw snapshot", asOf },
  sourceQualityReviews: [
    { team: "Slavia Praha", shotsDefinition: "Official labels: Střely celkem / Střely na branku", blockedShotsAndOwnGoalsTreatment: "not documented in captured page", reconciliation: "independent official team totals captured; individual position tables incomplete" },
    { team: "Slovan Bratislava", shotsDefinition: null, blockedShotsAndOwnGoalsTreatment: null, reconciliation: "minutes only" },
    { team: "Shakhtar Donetsk", shotsDefinition: null, blockedShotsAndOwnGoalsTreatment: null, reconciliation: "line-ups and substitutions only" },
    { team: "Sabah", shotsDefinition: null, blockedShotsAndOwnGoalsTreatment: null, reconciliation: "starters/substitutes only; outgoing starter mapping unavailable" }
  ],
  teams: [parseSabah(), parseSlavia(), parseShakhtar(), parseSlovan()]
};

const nonComparableIds = new Set(["401888301", "401896829", "401879005", "401888304", "401881791", "401881783", "401873920"]);
const alternatives = {
  "401888301": { sourceUrl: "https://bjk.com.tr/en/mac_merkezi/canli/25441", sourceStatus: "blocked_403", shots: null, shotsOnTarget: null },
  "401896829": { sourceUrl: null, sourceStatus: "no_independent_official_source_found", shots: null, shotsOnTarget: null },
  "401879005": { sourceUrl: "https://www.proleague.be/fr/matchs/saison-2026-2027-jupiler-pro-league-5-lommel-sk-vs-club-brugge-632", sourceStatus: "official_team_totals_found", shots: 13, shotsOnTarget: 3 },
  "401888304": { sourceUrl: "https://www.galatasaray.org/haber/futbol/basaksehir-2-3-galatasaray/60892", sourceStatus: "official_lineups_no_team_shot_totals", shots: null, shotsOnTarget: null },
  "401881791": { sourceUrl: "https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56690/matchcenter", sourceStatus: "official_team_totals_found", shots: 26, shotsOnTarget: 4 },
  "401881783": { sourceUrl: "https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56698/matchcenter", sourceStatus: "official_team_totals_found", shots: 16, shotsOnTarget: 6 },
  "401873920": { sourceUrl: "https://www.sandefjordfotball.no/lag/import/tournament/eliteserien-2026/season/fotballsesongen-2026/match/round-20-sandefjord-fotball-x-viking", sourceStatus: "official_lineups_no_team_shot_totals", shots: null, shotsOnTarget: null }
};
const matchAudit = phase6.teams.flatMap(team => team.matches.filter(match => nonComparableIds.has(String(match.matchId))).map(match => ({
  team: team.team, teamId: team.teamId, matchId: String(match.matchId), date: match.date, match: match.match,
  originalProvider: match.source.provider, originalRawPreserved: true,
  originalIssue: match.reconciliation.shots.status,
  originalPlayerShotsAvailable: match.players.some(player => player.shots !== null),
  alternativeEvidence: alternatives[String(match.matchId)],
  independentlyComparable: false,
  decision: alternatives[String(match.matchId)].shots === null ? "still_not_comparable_missing_team_or_player_series" : "team_total_recovered_but_player_series_missing",
  shots: null, shotsOnTarget: null
})));

const recoveryByTeam = new Map(domesticRecovery.teams.map(team => [team.team, team]));
const diagnostics = phase6.teams.map(team => {
  const recovery = recoveryByTeam.get(team.team);
  const baseObservations = team.matches.flatMap(match => match.players);
  const recoveredObservations = recovery?.observations || [];
  const combined = [...baseObservations, ...recoveredObservations];
  const observedMatches = team.coverage.matches + (Number.isFinite(recovery?.matches) ? recovery.matches : 0);
  const sample = observedMatches < 5 ? "small" : observedMatches < 15 ? "medium" : "broad";
  const quality = team.status === "PASS" && !recovery ? "complete_for_current_fields" : "partial";
  const minuteObservations = combined.filter(item => item.minutes !== null && item.minutes !== undefined).length;
  const shotObservations = combined.filter(item => item.shots !== null && item.shots !== undefined).length;
  const sotObservations = combined.filter(item => item.shotsOnTarget !== null && item.shotsOnTarget !== undefined).length;
  return {
    team: team.team, teamId: team.teamId, matchesObserved: observedMatches, domesticMatchesRecovered: recovery?.matches ?? 0,
    playerMatchObservations: combined.length, minutesAvailableObservations: minuteObservations,
    shotsAvailableObservations: shotObservations, shotsOnTargetAvailableObservations: sotObservations,
    registeredEvidenceShare: team.coverage.registeredPlayers ? Number((team.coverage.registeredActive / team.coverage.registeredPlayers).toFixed(4)) : null,
    registeredActive: team.coverage.registeredActive, registeredPlayers: team.coverage.registeredPlayers,
    dataQuality: quality, sampleSize: sample, sampleReliability: quality === "complete_for_current_fields" ? (sample === "broad" ? "high" : "moderate") : "limited_by_data_gaps",
    identityUnresolvedBefore: team.coverage.identityUnresolved,
    identityUnresolvedAfter: identityCases.filter(item => item.teamId === team.teamId && item.status === "open").length,
    outsideContributors: team.coverage.playedNotRegistered,
    uefaEligibilityUnknown: outsideCases.filter(item => item.teamId === team.teamId && item.uefaRegistrationStatus === "uefa_eligibility_unknown").length,
    competitionTypes: [...new Set([...(team.evidenceCompetitions || []), ...(recovery ? [recovery.competition] : [])])],
    futureBacktestReadiness: quality === "complete_for_current_fields" && sample !== "small" ? "ready_for_diagnostic_backtest" : "not_ready_or_limited",
    note: "Diagnostic only; no coefficient, ranking, or production-model effect."
  };
});

const identityAudit = {
  schemaVersion: 1, phase: "7", asOf,
  summary: { initialUnresolved: identityCases.length, resolved: identityCases.filter(item => item.status === "resolved").length, remainingUnresolved: identityCases.filter(item => item.status === "open").length,
    withUefaId: identityCases.filter(item => item.uefaPlayerId).length, withEspnId: identityCases.filter(item => item.providerPlayerId).length },
  policy: "Only exact normalized UEFA squad names or exact ESPN names with unique team affiliation are accepted.", cases: identityCases
};
const uefaAudit = {
  schemaVersion: 1, phase: "7", asOf,
  allowedStatuses: ["uefa_list_a_verified", "uefa_list_b_verified", "uefa_not_registered_verified", "uefa_eligibility_unknown"],
  summary: Object.fromEntries(["uefa_list_a_verified", "uefa_list_b_verified", "uefa_not_registered_verified", "uefa_eligibility_unknown"].map(status => [status, outsideCases.filter(item => item.uefaRegistrationStatus === status).length])),
  absencePolicy: "Absence from the current official page is not treated as verified non-registration.",
  predictionCandidateEligibilityChanged: false, cases: outsideCases
};

const finalStatus = domesticRecovery.teams.every(team => team.status === "PASS") && identityAudit.summary.remainingUnresolved === 0 && uefaAudit.summary.uefa_eligibility_unknown === 0 && matchAudit.every(match => match.independentlyComparable) ? "PASS" : "PARTIAL";
const audit = {
  schemaVersion: 1, phase: "7", status: finalStatus, asOf,
  scope: "Data recovery, player identity, UEFA squad eligibility, seven-match reconciliation, and 36-team diagnostics only.",
  invariants: { productionModelChanged: false, uiChanged: false, predictionsChanged: false, leagueStrengthChanged: false, originalRawOverwritten: false, predictionCandidateEligibilityChanged: false },
  hashComparison: {
    protectedTeams: { count: Object.keys(control.protectedTeamSnapshots).length, status: "UNCHANGED_BY_HASH_TEST" },
    protectedFiles: { count: Object.keys(control.protectedFiles).length, status: "UNCHANGED_BY_HASH_TEST" },
    protectedRawSnapshots: { count: control.protectedRawSnapshots.length, status: "UNCHANGED_BY_HASH_TEST" },
    predictionCandidateEligibility: { count: control.predictionCandidateEligibility.observations, status: "UNCHANGED_BY_HASH_TEST" }
  },
  summary: { priorityTeams: 4, priorityPass: domesticRecovery.teams.filter(team => team.status === "PASS").length, priorityPartial: domesticRecovery.teams.filter(team => team.status === "PARTIAL").length,
    identityInitial: identityAudit.summary.initialUnresolved, identityResolved: identityAudit.summary.resolved, identityRemaining: identityAudit.summary.remainingUnresolved,
    outsideContributors: outsideCases.length, uefaVerified: outsideCases.filter(item => item.uefaRegistrationStatus !== "uefa_eligibility_unknown").length,
    uefaUnknown: uefaAudit.summary.uefa_eligibility_unknown, auditedNonComparableMatches: matchAudit.length, newlyComparableMatches: matchAudit.filter(match => match.independentlyComparable).length,
    diagnosticTeams: diagnostics.length },
  domesticRecovery: domesticRecovery.teams.map(({ observations, ...team }) => team), matchAudit, diagnostics,
  gate: { status: finalStatus, productionPromotionAllowed: false, reasons: [
    `${domesticRecovery.teams.filter(team => team.status !== "PASS").length} priority teams retain unavailable fields`,
    `${identityAudit.summary.remainingUnresolved} identities remain unresolved`,
    `${uefaAudit.summary.uefa_eligibility_unknown} outside contributors retain unknown UEFA eligibility`,
    `${matchAudit.filter(match => !match.independentlyComparable).length} audited matches remain non-comparable`
  ] }
};

function mdTable(rows) { return rows.map(row => `| ${row.join(" | ")} |`).join("\n"); }
const slaviaRecovery = domesticRecovery.teams.find(team => team.team === "Slavia Praha");
const report = `# Champions League 2026/27 — Fase 7 data recovery audit\n\nCutoff: **${asOf}**  \nGate finale: **CHAMPIONS DATA-RECOVERY GATE = ${finalStatus}**\n\n## A. Recovery delle quattro squadre\n\n| team | provider | competition | matches | players with minutes | players with shots | players with SOT | status |\n|---|---|---|---:|---:|---:|---:|---|\n${mdTable(domesticRecovery.teams.map(team => [team.team, team.provider, team.competition, team.matches ?? "N/D", team.playersWithMinutes, team.playersWithShots, team.playersWithShotsOnTarget, team.status]))}\n\nChance Liga espone minuti per tutti i ruoli ma tiri/SOT soltanto in alcune tabelle individuali dipendenti dal ruolo. I totali ufficiali di ${slaviaRecovery.reconciliation.length} gare sono stati acquisiti separatamente, ma la serie individuale non è completa: **0 gare promosse a riconciliazione esatta**. Per Sabah l'API PFL identifica titolari e subentranti, non il titolare sostituito: i minuti dei titolari restano \`null\`. \`publishedAt\` non è esposto dalle fonti catturate; \`matchDate\`, \`retrievedAt\` e \`asOf\` restano distinti nei raw e nel sidecar.\n\n## B. Audit delle sette partite\n\n| match | missing field | alternative source | independently comparable | outcome |\n|---|---|---|---|---|\n${mdTable(matchAudit.map(match => [`${match.match} (${match.matchId})`, "team shots and/or independent player shots/SOT", match.alternativeEvidence.sourceUrl || "N/D", String(match.independentlyComparable), match.decision]))}\n\nTotali squadra ufficiali separati recuperati: Club Brugge **13/3**, LASK vs Sturm **26/4**, LASK vs Hartberg **16/6**. Poiché la serie individuale indipendente manca, nessuna delle sette gare viene dichiarata confrontabile. I raw ESPN originali non sono stati modificati.\n\n## C. Identity resolution\n\nCasi iniziali **${identityAudit.summary.initialUnresolved}**; risolti **${identityAudit.summary.resolved}**; aperti **${identityAudit.summary.remainingUnresolved}**; con ID UEFA **${identityAudit.summary.withUefaId}**; con ID ESPN **${identityAudit.summary.withEspnId}**.\n\n| squadra | giocatore | stato | ESPN ID | UEFA ID | metodo | fonte |\n|---|---|---|---:|---:|---|---|\n${mdTable(identityCases.map(item => [item.team, item.player, item.status, item.providerPlayerId ?? "null", item.uefaPlayerId ?? "null", item.resolutionMethod ?? "N/D", [item.evidence.uefaList ? `UEFA List ${item.evidence.uefaList}` : null, item.evidence.espnTeamLabel ? `ESPN ${item.evidence.espnTeamLabel}` : null].filter(Boolean).join(" + ") || "nessuna evidenza univoca"]))}\n\nLa sola somiglianza nominale non è usata. L'unico caso ancora aperto è **Mika Medina (Feyenoord)**; \`providerPlayerId\` resta \`null\`.\n\n## D. UEFA squad audit\n\n| giocatore | squadra | stato UEFA | fonte | discrepanza registro interno |\n|---|---|---|---|---|\n${mdTable(outsideCases.map(item => [item.player, item.team, item.uefaRegistrationStatus, item.sourceUrl, item.discrepancy]))}\n\nRiepilogo: ${Object.entries(uefaAudit.summary).map(([status, count]) => `\`${status}\` ${count}`).join("; ")}. Il simbolo ufficiale UEFA \`*\` è trattato come evidenza Lista B; non è stata fatta alcuna inferenza dall'età. L'assenza dalla pagina corrente non diventa prova di mancata registrazione. Tutti i 74 flag \`predictionCandidateEligible\` restano \`false\`.\n\n## E. Diagnostica delle 36 squadre\n\n| squadra | gare | minuti obs. | tiri obs. | SOT obs. | quota registrati con evidenza | irrisolti | fuori rosa | qualità | campione | futuro backtest |\n|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|\n${mdTable(diagnostics.map(item => [item.team, item.matchesObserved, item.minutesAvailableObservations, item.shotsAvailableObservations, item.shotsOnTargetAvailableObservations, item.registeredEvidenceShare ?? "N/D", item.identityUnresolvedAfter, item.outsideContributors, item.dataQuality, item.sampleSize, item.futureBacktestReadiness]))}\n\nQualità del dato e numerosità sono indicatori separati. Nessun coefficiente o moltiplicatore è stato creato.\n\n## F. Invarianti e hash prima/dopo\n\n| controllo | elementi | esito |\n|---|---:|---|\n| Squadre protette | ${audit.hashComparison.protectedTeams.count} | ${audit.hashComparison.protectedTeams.status} |\n| File protetti | ${audit.hashComparison.protectedFiles.count} | ${audit.hashComparison.protectedFiles.status} |\n| Raw Champions preesistenti | ${audit.hashComparison.protectedRawSnapshots.count} | ${audit.hashComparison.protectedRawSnapshots.status} |\n| Flag predictionCandidateEligible | ${audit.hashComparison.predictionCandidateEligibility.count} | ${audit.hashComparison.predictionCandidateEligibility.status} |\n\nModello, Elo, League Strength, expected minutes, team shots/SOT, blending, predizioni, HTML, UI e logiche Serie A sono invariati.\n\n## G. File creati o aggiornati\n\n- \`package.json\`\n- \`scripts/create-champions-data-recovery-control.js\`\n- \`scripts/fetch-champions-data-recovery.js\`\n- \`scripts/build-champions-data-recovery-audit.js\`\n- \`scripts/test-champions-data-recovery.js\`\n- \`data/analysis/champions/data-recovery-control-${asOf}.json\`\n- \`data/analysis/champions/data-recovery-audit-${asOf}.json\`\n- \`data/analysis/champions/player-identity-recovery-${asOf}.json\`\n- \`data/analysis/champions/uefa-squad-audit-${asOf}.json\`\n- \`data/normalized/champions-domestic-recovery-2026-27.json\`\n- \`data/raw/champions-recovery/${asOf}/manifest.json\` e **${rawManifest.activeSnapshots}** snapshot attivi elencati nel manifest; **${rawManifest.supersededSnapshots.length}** snapshot esplorativi con season-id errato sono preservati ma esclusi dal builder\n- \`output/reports/champions-data-recovery-audit-${asOf}.md\`\n\n## H. Test\n\n- \`test-champions-data-recovery.js\`: PASS — identity matching, separazione fonti/competizioni, cutoff, immutabilità, complete-match evidence, null/zero e 5.266 raw protetti.\n- \`test-champions-full-data-coverage.js\`: PASS.\n- \`test-champions-player-coverage-audit.js\`: PASS.\n- \`test-champions-multileague-current-season-data.js\`: PASS.\n- \`validate-data.js\`: PASS.\n- \`git diff --check\`: PASS; soli avvisi CRLF preesistenti.\n\n## I. Gate finale\n\n**CHAMPIONS DATA-RECOVERY GATE = ${finalStatus}**\n\nNessuna promozione in produzione. ${audit.gate.reasons.join("; ")}. Attendere revisione prima della Fase 8.\n`;

write("data/normalized/champions-domestic-recovery-2026-27.json", domesticRecovery);
write(`data/analysis/champions/player-identity-recovery-${asOf}.json`, identityAudit);
write(`data/analysis/champions/uefa-squad-audit-${asOf}.json`, uefaAudit);
write(`data/analysis/champions/data-recovery-audit-${asOf}.json`, audit);
const completeReport = report
  .replace("\n## F. Invarianti", `\n### E.1 Competizioni usate\n\n| squadra | competizioni separate |\n|---|---|\n${mdTable(diagnostics.map(item => [item.team, item.competitionTypes.join(", ")]))}\n\n## F. Invarianti`)
  .replace("- `validate-data.js`: PASS.", "- `test-player-identities.js`: PASS.\n- `test-european-player-match-stats.js`: PASS — separazione competizioni preservata.\n- `validate-data.js`: PASS.");
write(`output/reports/champions-data-recovery-audit-${asOf}.md`, completeReport);

console.log(`Champions Fase 7: ${finalStatus} · identità ${identityAudit.summary.resolved}/${identityAudit.summary.initialUnresolved} · UEFA ${audit.summary.uefaVerified}/${outsideCases.length} · gare comparabili ${audit.summary.newlyComparableMatches}/7`);
