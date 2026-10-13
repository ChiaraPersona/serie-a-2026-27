"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { scaleShotProjections } = require("./champions/player-volume-utils");

const root = path.resolve(__dirname, "..");
const fixturesArg = process.argv.indexOf("--fixtures");
const targetFixtureIds = new Set(fixturesArg >= 0 ? String(process.argv[fixturesArg + 1] || "").split(",").map(value => value.trim()).filter(Boolean) : []);
const baselineFromHead = process.argv.includes("--baseline-head");
const paths = {
  calendar: "data/normalized/champions-league-2026-27.json",
  predictions: "data/normalized/champions-pilot-predictions-md02-2026-27.json",
  squads: "data/normalized/champions-registered-squads-2026-27.json",
  playerStats: "data/normalized/champions-player-stats-2025-26.json",
  uefaSquadAudit: "data/analysis/champions/uefa-squad-audit-2026-10-09.json",
  identityOverlay: "data/sources/champions-player-identity-overlay-md02-2026-27.json",
  odds: "data/normalized/odds/sisal/champions-league.json",
  probableSource: "data/sources/champions-probable-formations-md02-2026-27.json",
  officialSource: "data/sources/champions-official-formations-md02-2026-27.json",
  output: "data/normalized/champions-md02-integration-2026-27.json",
  report: "output/reports/champions-md02-phase12-integration-2026-10-13.md"
};
const absolute = relative => path.join(root, relative);
const read = relative => JSON.parse(fs.readFileSync(absolute(relative), "utf8"));
const hashFile = relative => crypto.createHash("sha256").update(fs.readFileSync(absolute(relative))).digest("hex").toUpperCase();
const write = (relative, value) => {
  fs.mkdirSync(path.dirname(absolute(relative)), { recursive: true });
  fs.writeFileSync(absolute(relative), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalize = value => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/ı/g, "i").replace(/ł/g, "l").replace(/đ/g, "d").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, " ").trim();
const tokens = value => normalize(value).split(" ").filter(Boolean);

const calendar = read(paths.calendar);
const predictions = read(paths.predictions);
const squads = read(paths.squads);
const playerStats = read(paths.playerStats);
const uefaSquadAudit = read(paths.uefaSquadAudit);
const identityOverlay = read(paths.identityOverlay);
const odds = read(paths.odds);
const probableSource = read(paths.probableSource);
const officialSource = read(paths.officialSource);

const inputHashes = Object.fromEntries(Object.entries(paths)
  .filter(([key]) => !["output", "report"].includes(key))
  .map(([key, relative]) => [key, { path: relative, sha256: hashFile(relative) }]));

const md02 = calendar.fixtures.filter(fixture => fixture.matchday === 2);
if (md02.length !== 18) throw new Error(`Calendario MD2 incompleto: ${md02.length}/18`);
if (predictions.matchday !== 2 || predictions.fixtures.length !== 18) throw new Error("Pronostici squadra MD2 assenti o incompleti");
if (odds.summary?.events !== 18 || odds.summary?.matchedEvents !== 18) throw new Error("Snapshot Sisal MD2 non valido: copertura eventi diversa da 18/18");
if (probableSource.fixtures?.length !== 18) throw new Error("Fonte probabili UEFA MD2 incompleta");

const squadByTeam = new Map(squads.teams.map(team => [team.team, team]));
const statsByTeam = new Map(playerStats.teams.map(team => [team.team, team]));
const predictionByFixture = new Map(predictions.fixtures.map(fixture => [fixture.fixtureId, fixture]));
const oddsByFixture = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const overlayByTeam = new Map();
const overlayStableIds = new Set();
for (const identity of identityOverlay.players) {
  const key = `${identity.team}:${identity.canonicalPlayerId}`;
  if (overlayStableIds.has(identity.stablePlayerId) || overlayStableIds.has(key)) throw new Error(`Identità overlay duplicata: ${identity.stablePlayerId}`);
  overlayStableIds.add(identity.stablePlayerId);
  overlayStableIds.add(key);
  const rows = overlayByTeam.get(identity.team) || [];
  rows.push({
    id: identity.canonicalPlayerId,
    name: identity.canonicalName,
    aliases: identity.aliases,
    providerIds: identity.providerIds,
    stablePlayerId: identity.stablePlayerId,
    identityOverlay: true,
    identityEvidence: identity.evidence
  });
  overlayByTeam.set(identity.team, rows);
}

const rolePrior = {
  goalkeeper: { shots: 0.01, shotsOnTarget: 0, cards: 0.04, foulsCommitted: 0.04, goals: 0, assists: 0 },
  defender: { shots: 0.65, shotsOnTarget: 0.18, cards: 0.22, foulsCommitted: 0.95, goals: 0.04, assists: 0.05 },
  midfielder: { shots: 1.35, shotsOnTarget: 0.42, cards: 0.18, foulsCommitted: 1.15, goals: 0.13, assists: 0.12 },
  forward: { shots: 2.35, shotsOnTarget: 0.86, cards: 0.1, foulsCommitted: 0.82, goals: 0.34, assists: 0.13 }
};

function inferRole(formation, index) {
  if (index === 0) return "goalkeeper";
  const lines = String(formation || "4-4-2").split("-").map(Number).filter(Number.isFinite);
  const defenders = lines[0] || 4;
  const forwards = lines.at(-1) || 2;
  if (index <= defenders) return "defender";
  if (index > 10 - forwards) return "forward";
  return "midfielder";
}

function teamPlayers(team) {
  const statistical = statsByTeam.get(team)?.players || [];
  const registered = squadByTeam.get(team)?.players || [];
  const byId = new Map(statistical.map(player => [player.id, player]));
  for (const player of registered) if (!byId.has(player.id)) byId.set(player.id, player);
  for (const player of overlayByTeam.get(team) || []) if (!byId.has(player.id)) byId.set(player.id, player);
  return [...byId.values()];
}

function resolveCanonical(team, suppliedName) {
  const players = teamPlayers(team);
  const wanted = normalize(suppliedName);
  const wantedTokens = tokens(suppliedName);
  const verifiedAliases = {
    "Feyenoord:marmol": "mika-medina",
    "Roma:n dicka": "evan-ndicka",
    "Roma:wesley franca": "wesley",
    "Borussia Dortmund:chukwumeka": "carney-chukwuemeka"
  };
  const aliasId = verifiedAliases[`${team}:${wanted}`];
  const alias = aliasId ? players.find(player => player.id === aliasId) : null;
  if (alias) return { player: alias, method: "verified-alias" };
  const overlayAlias = players.filter(player => player.identityOverlay && [player.name, ...(player.aliases || [])].some(aliasName => normalize(aliasName) === wanted));
  if (overlayAlias.length === 1) return { player: overlayAlias[0], method: "verified-identity-overlay" };
  const exact = players.filter(player => normalize(player.name) === wanted || normalize(player.id) === wanted);
  if (exact.length === 1) return { player: exact[0], method: "exact" };
  const fullTokens = players.filter(player => wantedTokens.length > 1 && wantedTokens.every(token => tokens(player.name).includes(token)));
  if (fullTokens.length === 1) return { player: fullTokens[0], method: "all-tokens" };
  const surnameFirst = players.filter(player => {
    const candidate = tokens(player.name);
    return wantedTokens.length > 1 && candidate.at(-1) === wantedTokens[0] && candidate[0]?.startsWith(wantedTokens.slice(1).join(""));
  });
  if (surnameFirst.length === 1) return { player: surnameFirst[0], method: "surname-first-initial" };
  const surname = wantedTokens.at(-1);
  const surnameMatches = players.filter(player => tokens(player.name).at(-1) === surname);
  if (surnameMatches.length === 1) return { player: surnameMatches[0], method: "unique-surname" };
  if (wantedTokens.length === 1) {
    const anyUnique = players.filter(player => tokens(player.name).includes(wantedTokens[0]));
    if (anyUnique.length === 1) return { player: anyUnique[0], method: "unique-name-token" };
  }
  return { player: null, method: "unresolved" };
}

function externalIdentityEvidence(team, suppliedName) {
  const wanted = tokens(suppliedName);
  const matches = uefaSquadAudit.cases.filter(item => {
    if (item.team !== team) return false;
    const candidate = tokens(item.player);
    return normalize(item.player) === normalize(suppliedName) ||
      (wanted.length === 1 && candidate.includes(wanted[0])) ||
      (wanted.length > 1 && wanted.every(token => candidate.includes(token)));
  });
  if (matches.length !== 1) return null;
  const item = matches[0];
  return {
    canonicalPlayerId: null,
    fullName: item.player,
    providerPlayerId: item.providerPlayerId || null,
    uefaPlayerId: item.uefaPlayerId || null,
    uefaRegistrationStatus: item.uefaRegistrationStatus,
    internalRegistryStatus: item.internalRegistryStatus,
    evidence: item.evidence,
    sourceUrl: item.sourceUrl,
    predictionCandidateEligible: item.predictionCandidateEligible
  };
}

function availabilityEntry(team, type, raw) {
  const suppliedName = String(raw).replace(/\s*\([^)]*\)\s*$/, "").trim();
  const reason = String(raw).match(/\(([^)]*)\)\s*$/)?.[1] || null;
  const resolved = resolveCanonical(team, suppliedName);
  const status = type === "doubt" ? "doubt" : /squalificat/i.test(reason || "") ? "suspended" : "unavailable";
  return {
    suppliedName,
    canonicalPlayerId: resolved.player?.id || null,
    canonicalName: resolved.player?.name || null,
    mappingMethod: resolved.method,
    externalIdentityEvidence: resolved.player ? null : externalIdentityEvidence(team, suppliedName),
    status,
    reason,
    sourceText: raw
  };
}

function playerRate(player, role) {
  const totals = player?.previousSeason?.totals || {};
  const per90 = totals.per90 || {};
  const minutes = Number(totals.minutes || 0);
  const reliability = clamp(minutes / (minutes + 900), 0, 0.82);
  const prior = rolePrior[role] || rolePrior.midfielder;
  const rate = key => round((Number.isFinite(per90[key]) ? per90[key] : prior[key]) * reliability + prior[key] * (1 - reliability), 3);
  return {
    minutes,
    appearances: totals.appearances ?? null,
    starts: totals.starts ?? null,
    reliability: round(reliability, 4),
    per90: {
      shots: rate("shots"), shotsOnTarget: rate("shotsOnTarget"), cards: rate("cards"),
      foulsCommitted: rate("foulsCommitted"), goals: rate("goals"), assists: rate("assists")
    },
    dataStatus: player && minutes >= 700 ? "verified-history" : player ? "limited-history" : "role-baseline"
  };
}

function marketFlags(market) {
  const label = `${market.marketName || ""} ${market.variantName || ""}`;
  const replacementIncluded = /DUO|INC\.?\s*T\.?S\.?|SOSTITUT|\bSOST\b/i.test(label);
  const woodworkIncluded = market.marketCode === "28506" || /PAL[OI]|TRAVERS[AE]/i.test(label);
  const periodScope = ["28673", "28674"].includes(market.marketCode) || /PRIMO TEMPO|1° TEMPO/i.test(label)
    ? "first-half"
    : ["28609", "28610"].includes(market.marketCode) || /ENTRAMBI I TEMPI/i.test(label) ? "both-halves" : "full-match";
  let forecastCompatibility = "NOT_MODELLED";
  if (market.marketCode === "28506") forecastCompatibility = "REFERENCE_ONLY_DUO_REPLACEMENT_AND_WOODWORK_NOT_MODELLED";
  else if (market.marketCode === "28507") forecastCompatibility = "REFERENCE_ONLY_DUO_REPLACEMENT_NOT_MODELLED";
  else if (["31665", "31666"].includes(market.marketCode)) forecastCompatibility = "REFERENCE_ONLY_MULTI_PLAYER_DUO_NOT_MODELLED";
  else if (periodScope === "first-half") forecastCompatibility = "BLOCKED_FIRST_HALF_SPLIT_NOT_MODELLED";
  else if (periodScope === "both-halves") forecastCompatibility = "BLOCKED_BOTH_HALVES_CONTRACT_NOT_MODELLED";
  else if (woodworkIncluded) forecastCompatibility = "REFERENCE_ONLY_REPLACEMENT_AND_WOODWORK_NOT_MODELLED";
  else if (replacementIncluded) forecastCompatibility = "REFERENCE_ONLY_REPLACEMENT_NOT_MODELLED";
  return { replacementIncluded, woodworkIncluded, periodScope, forecastCompatibility };
}

function scorePlayerLabel(player, variantName) {
  const playerTokens = tokens(player.name);
  const labelTokens = tokens(variantName);
  if (!playerTokens.length || !labelTokens.length) return 0;
  const surname = playerTokens.at(-1);
  if (!labelTokens.includes(surname)) return 0;
  let score = 20;
  for (const token of playerTokens.slice(0, -1)) if (token.length > 2 && labelTokens.includes(token)) score += 5;
  const initial = playerTokens[0]?.[0];
  if (initial && labelTokens.includes(initial)) score += 3;
  if (playerTokens.every(token => labelTokens.includes(token))) score += 20;
  return score;
}

function bestCanonicalForMarket(players, market) {
  const ranked = players.map(player => ({ player, score: scorePlayerLabel(player, market.variantName) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name, "it"));
  if (!ranked.length || (ranked[1] && ranked[1].score === ranked[0].score)) return null;
  return ranked[0].player;
}

function providerIdentityMap(event, fixturePlayers) {
  const votes = new Map();
  const result = new Map();
  for (const player of fixturePlayers) {
    const providerId = player.providerIds?.sisal;
    if (!providerId) continue;
    const existing = result.get(providerId);
    if (existing && existing !== player.id) throw new Error(`Collisione Sisal ${providerId}: ${existing}/${player.id}`);
    result.set(providerId, player.id);
  }
  for (const market of event.markets.filter(item => item.marketScope === "player" && item.providerPlayerIds?.length === 1)) {
    const candidate = bestCanonicalForMarket(fixturePlayers, market);
    if (!candidate) continue;
    const providerId = market.providerPlayerIds[0];
    const counts = votes.get(providerId) || new Map();
    counts.set(candidate.id, (counts.get(candidate.id) || 0) + 1);
    votes.set(providerId, counts);
  }
  for (const [providerId, counts] of votes) {
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (!ranked[1] || ranked[0][1] > ranked[1][1]) result.set(providerId, ranked[0][0]);
  }
  return result;
}

function decorateMarket(event, market, providerMap) {
  const flags = marketFlags(market);
  const canonicalPlayerIds = market.providerPlayerIds.map(id => providerMap.get(id) || null);
  const linked = canonicalPlayerIds.every(Boolean);
  const modifiers = {
    threshold: market.threshold,
    variantName: market.variantName,
    periodScope: flags.periodScope,
    replacementIncluded: flags.replacementIncluded,
    woodworkIncluded: flags.woodworkIncluded
  };
  return {
    providerMarketId: market.providerMarketId,
    marketCode: market.marketCode,
    marketName: market.marketName,
    variantName: market.variantName,
    threshold: market.threshold,
    status: market.status,
    updatedAt: market.updatedAt,
    marketScope: market.marketScope,
    providerPlayerIds: market.providerPlayerIds,
    canonicalPlayerIds,
    identityStatus: linked ? "resolved" : "partial-or-unresolved",
    mathematicalEvaluability: "NOT_EVALUABLE_WITH_CURRENT_MODEL",
    quoteAvailability: market.status === "open" ? "MARKET_OPEN" : "MARKET_NOT_OPEN",
    modifiers,
    ...flags,
    selections: market.selections.map(selection => ({
      ...selection,
      providerUsable: selection.status === "open" && Number(selection.odds) > 1,
      quoteAvailability: selection.status === "open" && Number(selection.odds) > 1 ? "AVAILABLE_AT_SNAPSHOT" : "UNAVAILABLE_AT_SNAPSHOT",
      interfaceSelectable: selection.status === "open" && Number(selection.odds) > 1 && Boolean(event.providerEventId && market.providerMarketId && selection.providerSelectionId),
      selectionId: `sisal:${event.providerEventId}:${market.providerMarketId}:${selection.providerSelectionId}`,
      modelProbability: null,
      fairOdds: null,
      expectedValue: null,
      probabilityStatus: flags.forecastCompatibility
    }))
  };
}

function buildLineup(fixture, prediction, side, availability) {
  const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
  const formation = fixture.probableFormation[side];
  const lineupStatus = fixture.probableFormation.status === "official" ? "official" : "probable";
  const unavailableIds = new Set(availability.filter(item => ["unavailable", "suspended"].includes(item.status)).map(item => item.canonicalPlayerId).filter(Boolean));
  const players = formation.players.map((suppliedName, index) => {
    const resolved = resolveCanonical(team, suppliedName);
    const role = resolved.player?.position || inferRole(formation.formation, index);
    const history = playerRate(resolved.player, role);
    const availabilityConflict = Boolean(resolved.player?.id && unavailableIds.has(resolved.player.id));
    return {
      suppliedName,
      canonicalPlayerId: resolved.player?.id || null,
      canonicalName: resolved.player?.name || null,
      mappingMethod: resolved.method,
      mappingStatus: resolved.player ? "resolved" : "unresolved",
      externalIdentityEvidence: resolved.player ? null : externalIdentityEvidence(team, suppliedName),
      team,
      side,
      lineupIndex: index,
      role,
      ...(lineupStatus === "official" ? { lineupStatus } : {}),
      expectedMinutes: availabilityConflict ? null : role === "goalkeeper" ? 90 : 84.6,
      expectedMinutesPolicy: availabilityConflict ? "BLOCKED_AVAILABILITY_CONFLICT" : role === "goalkeeper" ? lineupStatus === "official" ? "existing-model-official-goalkeeper-90" : "existing-model-goalkeeper-90" : lineupStatus === "official" ? "existing-model-official-starter-exposure-0.94x90" : "existing-model-starter-exposure-0.94x90",
      availabilityConflict,
      projectedShots: null,
      projectedShotsOnTarget: null,
      ...history
    };
  });
  const eligible = players.filter(player => !player.availabilityConflict);
  const teamProjection = prediction.teamProjections.find(item => item.venue === side);
  const total = scaleShotProjections(eligible.map(player => ({ ...player, roleKey: player.role })), "shots", teamProjection?.shotsTotal?.central);
  const target = scaleShotProjections(eligible.map(player => ({ ...player, roleKey: player.role })), "shotsOnTarget", teamProjection?.shotsOnTarget?.central);
  total.forEach((item, index) => {
    const original = players.find(player => player.lineupIndex === item.player.lineupIndex);
    original.projectedShots = item.projection;
    original.shotsReconciliationFactor = round(item.reconciliationFactor, 4);
    original.projectedShotsOnTarget = target[index]?.projection ?? null;
    original.shotsOnTargetReconciliationFactor = target[index] ? round(target[index].reconciliationFactor, 4) : null;
  });
  const bench = (formation.bench || []).map(suppliedName => {
    const resolved = resolveCanonical(team, suppliedName);
    return {
      suppliedName,
      canonicalPlayerId: resolved.player?.id || null,
      canonicalName: resolved.player?.name || null,
      mappingMethod: resolved.method,
      mappingStatus: resolved.player ? "resolved" : "unresolved"
    };
  });
  return {
    team,
    formation: formation.formation,
    ...(lineupStatus === "official" ? { status: lineupStatus, source: fixture.probableFormation.source } : {}),
    players,
    ...(formation.bench ? { bench } : {}),
    ...(formation.coach ? { coach: formation.coach } : {})
  };
}

const fixtures = md02.map(fixture => {
  const prediction = predictionByFixture.get(fixture.id);
  const event = oddsByFixture.get(fixture.id);
  if (!prediction || !event) throw new Error(`Input MD2 mancante per ${fixture.id}`);
  const availability = [];
  const hasOfficialAvailability = fixture.probableFormation.status === "official" && ["home", "away"]
    .some(side => fixture.probableFormation[side]?.availability);
  const availabilityFormation = hasOfficialAvailability
    ? fixture.probableFormation
    : fixture.probableFormation.editorialProjection || fixture.probableFormation;
  for (const side of ["home", "away"]) {
    const team = side === "home" ? fixture.homeTeam : fixture.awayTeam;
    for (const raw of availabilityFormation[side].availability?.unavailable || []) availability.push({ team, side, ...availabilityEntry(team, "unavailable", raw) });
    for (const raw of availabilityFormation[side].availability?.doubts || []) availability.push({ team, side, ...availabilityEntry(team, "doubt", raw) });
  }
  const home = buildLineup(fixture, prediction, "home", availability.filter(item => item.side === "home"));
  const away = buildLineup(fixture, prediction, "away", availability.filter(item => item.side === "away"));
  const editorialFixture = fixture.probableFormation.editorialProjection ? { ...fixture, probableFormation: fixture.probableFormation.editorialProjection } : null;
  const editorialLineups = editorialFixture ? {
    home: buildLineup(editorialFixture, prediction, "home", availability.filter(item => item.side === "home")),
    away: buildLineup(editorialFixture, prediction, "away", availability.filter(item => item.side === "away"))
  } : null;
  const eventPlayers = [...teamPlayers(fixture.homeTeam), ...teamPlayers(fixture.awayTeam)];
  const providerMap = providerIdentityMap(event, eventPlayers);
  const playerMarkets = event.markets.filter(market => market.marketScope === "player").map(market => decorateMarket(event, market, providerMap));
  const providerIds = new Set(playerMarkets.flatMap(market => market.providerPlayerIds));
  const selectionRows = playerMarkets.flatMap(market => market.selections.map(selection => ({ market, selection })));
  const providerUsable = selectionRows.filter(row => row.selection.providerUsable);
  const linkedProviderUsable = providerUsable.filter(row => row.market.identityStatus === "resolved");
  return {
    fixtureId: fixture.id,
    syncKey: fixture.id,
    date: fixture.date,
    kickoff: fixture.kickoff,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    probableFormationSource: fixture.probableFormation.source,
    lineupConfidence: fixture.probableFormation.lineupConfidence,
    availability,
    lineups: { home, away },
    ...(fixture.probableFormation.status === "official" ? { lineupStatus: "official", editorialLineups } : {}),
    teamPrediction: prediction,
    oddsEvent: {
      providerEventId: event.providerEventId,
      canonicalMatchId: event.canonicalMatchId,
      retrievedAt: odds.retrievedAt,
      playerMarkets,
      coverage: {
        playerMarkets: playerMarkets.length,
        providerPlayerIds: providerIds.size,
        resolvedProviderPlayerIds: [...providerIds].filter(id => providerMap.has(id)).length,
        selections: selectionRows.length,
        providerUsableSelections: providerUsable.length,
        interfaceSelectableSelections: selectionRows.filter(row => row.selection.interfaceSelectable).length,
        linkedProviderUsableSelections: linkedProviderUsable.length,
        modelComparableSelections: 0
      }
    },
    generationSync: {
      reading: { status: "prepared", fixtureId: fixture.id },
      schedina: { status: "prepared-with-strict-market-gate", fixtureId: fixture.id },
      playerProbabilityPolicy: "fail-closed-null-for-incompatible-provider-contracts"
    }
  };
});

const lineupPlayers = fixtures.flatMap(fixture => [fixture.lineups.home, fixture.lineups.away]).flatMap(team => team.players);
const availabilityRows = fixtures.flatMap(fixture => fixture.availability);
const marketRows = fixtures.flatMap(fixture => fixture.oddsEvent.playerMarkets);
const selectionRows = marketRows.flatMap(market => market.selections.map(selection => ({ market, selection })));
const providerIds = new Set(marketRows.flatMap(market => market.providerPlayerIds));
const resolvedProviderIds = new Set(marketRows.flatMap(market => market.providerPlayerIds.map((id, index) => market.canonicalPlayerIds[index] ? id : null)).filter(Boolean));
const compatibility = Object.fromEntries([...new Set(marketRows.map(market => market.forecastCompatibility))].sort().map(status => [status, {
  markets: marketRows.filter(market => market.forecastCompatibility === status).length,
  selections: selectionRows.filter(row => row.market.forecastCompatibility === status).length
}]));
const rawRelative = odds.rawFile?.replace(/\\/g, "/") || null;
const rawHash = rawRelative && fs.existsSync(absolute(rawRelative)) ? hashFile(rawRelative) : null;

const output = {
  schemaVersion: "1.1.0",
  phase: 12,
  competition: "UEFA Champions League",
  season: "2026-27",
  matchday: 2,
  generatedAt: new Date().toISOString(),
  status: lineupPlayers.every(player => player.canonicalPlayerId) ? "READY_WITH_STRICT_PLAYER_MARKET_GATE" : "PARTIAL_IDENTITY_BLOCKS",
  modelVersion: {
    team: predictions.status,
    playerVolumes: "champions-player-volume-existing-v1",
    expectedMinutes: "starter-0.94x90; goalkeeper-90; official XI overrides editorial XI only for supplied fixtures",
    mathematicalChange: false
  },
  sources: {
    probableFormations: { ...probableSource.source, updatedAt: probableSource.updatedAt, input: inputHashes.probableSource },
    officialFormations: { ...officialSource.source, updatedAt: officialSource.updatedAt, fixtures: officialSource.fixtures.length, input: inputHashes.officialSource },
    odds: {
      provider: "Sisal",
      retrievedAt: odds.retrievedAt,
      normalized: inputHashes.odds,
      raw: rawRelative ? { path: rawRelative, sha256: rawHash } : null,
      immutableInput: true,
      summary: odds.summary
    },
    canonicalSquads: { snapshotDate: squads.snapshotDate, input: inputHashes.squads },
    historicalPlayerStats: { generatedAt: playerStats.generatedAt, input: inputHashes.playerStats },
    uefaSquadAudit: { asOf: uefaSquadAudit.asOf, input: inputHashes.uefaSquadAudit },
    identityOverlay: { updatedAt: identityOverlay.updatedAt, input: inputHashes.identityOverlay },
    teamPredictions: { generatedAt: predictions.generatedAt, input: inputHashes.predictions },
    calendar: { generatedAt: calendar.generatedAt, input: inputHashes.calendar }
  },
  policies: {
    canonicalIdentity: "exact, verified identity-overlay, all-tokens or unique-surname only; ambiguous identities remain null",
    availability: "UEFA unavailable, suspended and doubt states are stored; no uncalibrated minute reduction is applied to doubts",
    expectedMinutes: "The existing 0.94 starter exposure is applied to official starters when available and otherwise to probable starters; goalkeepers receive 90 minutes. Omitted players receive no invented substitute minutes",
    oddsIntegrity: "Original market and selection identifiers, odds, oddsRaw, status, threshold and modifiers are copied without mutation",
    substituteMarkets: "Replacement-inclusive markets are reference-only. Event probability, fair odds and EV remain null",
    woodwork: "Markets explicitly mentioning posts/crossbars, including 28506 and 28090, are not compared with the individual shots-on-target model",
    periodMarkets: "First-half and both-halves markets remain selectable at provider odds but are not mathematically evaluated because the current model is full-match only",
    frozenSnapshots: "No frozen snapshot is created or overwritten by this builder",
    serieA: "No Serie A input or output is read or written by this builder"
  },
  coverage: {
    fixtures: fixtures.length,
    probableLineups: fixtures.filter(fixture => fixture.lineups.home.players.length === 11 && fixture.lineups.away.players.length === 11).length,
    officialLineups: fixtures.filter(fixture => fixture.lineupStatus === "official").length,
    probableStarters: lineupPlayers.length,
    canonicalStartersResolved: lineupPlayers.filter(player => player.canonicalPlayerId).length,
    canonicalStartersUnresolved: lineupPlayers.filter(player => !player.canonicalPlayerId).length,
    unresolvedStartersWithExternalIdentityEvidence: lineupPlayers.filter(player => !player.canonicalPlayerId && player.externalIdentityEvidence).length,
    availability: {
      total: availabilityRows.length,
      unavailable: availabilityRows.filter(item => item.status === "unavailable").length,
      suspended: availabilityRows.filter(item => item.status === "suspended").length,
      doubts: availabilityRows.filter(item => item.status === "doubt").length,
      canonicalResolved: availabilityRows.filter(item => item.canonicalPlayerId).length,
      canonicalUnresolved: availabilityRows.filter(item => !item.canonicalPlayerId).length,
      unresolvedWithExternalIdentityEvidence: availabilityRows.filter(item => !item.canonicalPlayerId && item.externalIdentityEvidence).length,
      lineupConflicts: lineupPlayers.filter(player => player.availabilityConflict).length
    },
    odds: {
      events: odds.summary.events,
      matchedEvents: odds.summary.matchedEvents,
      allMarketsInAuthoritativeSnapshot: odds.summary.markets,
      allSelectionsInAuthoritativeSnapshot: odds.summary.selections,
      playerMarkets: marketRows.length,
      playerSelections: selectionRows.length,
      providerPlayerIds: providerIds.size,
      resolvedProviderPlayerIds: resolvedProviderIds.size,
      providerUsableSelections: selectionRows.filter(row => row.selection.providerUsable).length,
      linkedProviderUsableSelections: selectionRows.filter(row => row.selection.providerUsable && row.market.identityStatus === "resolved").length,
      interfaceSelectableSelections: selectionRows.filter(row => row.selection.interfaceSelectable).length,
      mathematicallyEvaluableSelections: selectionRows.filter(row => row.market.mathematicalEvaluability === "EVALUABLE").length,
      modelComparablePlayerSelections: 0,
      usedForPlayerProbabilityOrEv: 0,
      compatibility
    }
  },
  generationReadiness: {
    reading: "READY_FOR_MD2_BUILD",
    schedina: "READY_FOR_VALID_PROVIDER_QUOTES_WITH_NULL_MODEL_METRICS",
    commonJoinKey: "fixtureId",
    synchronizedFixtures: fixtures.length,
    blockers: [
      ...(lineupPlayers.some(player => !player.canonicalPlayerId) ? ["Unresolved probable-starter canonical identities"] : []),
      ...(availabilityRows.some(player => !player.canonicalPlayerId) ? ["Unresolved availability-list canonical identities"] : []),
      "No Sisal player market has an exact contract match with the current full-match individual model: replacement, woodwork or period semantics differ",
      "Player probabilities and EV are intentionally null until a compatible calibrated contract exists"
    ]
  },
  fixtures
};

const unresolvedStarters = lineupPlayers.filter(player => !player.canonicalPlayerId);
const unresolvedAvailability = availabilityRows.filter(player => !player.canonicalPlayerId);
const volumeBlockedFixtures = predictions.fixtures.filter(fixture => !fixture.dataQuality?.detailedVolumesAvailable);
const report = [
  "# Integrazione Fase 12 — UEFA MD2 + quote Sisal",
  "",
  `Generato: ${output.generatedAt}`,
  "",
  "## Esito",
  "",
  `- Copertura partite: **${output.coverage.fixtures}/18**; XI complete: **${output.coverage.probableLineups}/18**; formazioni ufficiali applicate: **${output.coverage.officialLineups}/18**.`,
  `- Titolari correnti: **${output.coverage.canonicalStartersResolved}/${output.coverage.probableStarters}** associati a ID canonico; **${output.coverage.canonicalStartersUnresolved}** non risolti.`,
  `- Overlay identità MD2: **${identityOverlay.players.length}** record additivi verificati; nessuna rosa UEFA congelata è stata riscritta.`,
  `- Pronostici squadra: **${predictions.coverage.detailedVolumeFixtures}/18** con volumi dettagliati; risultato/goal e relative quote disponibili **18/18**.`,
  `- Disponibilità UEFA: **${output.coverage.availability.unavailable} indisponibili**, **${output.coverage.availability.suspended} squalificati**, **${output.coverage.availability.doubts} in dubbio**; ${output.coverage.availability.canonicalResolved}/${output.coverage.availability.total} associati.`,
  `- Quote: snapshot Sisal **${output.coverage.odds.matchedEvents}/18** eventi; **${output.coverage.odds.playerMarkets}** mercati giocatore e **${output.coverage.odds.playerSelections}** selezioni indicizzate.`,
  `- Selezioni aperte con quota > 1 e selezionabili nell'interfaccia: **${output.coverage.odds.interfaceSelectableSelections}**; anche con identità canonica giocatore completa: **${output.coverage.odds.linkedProviderUsableSelections}**.`,
  `- Selezioni giocatore matematicamente valutabili: **${output.coverage.odds.mathematicallyEvaluableSelections}**. Probabilità ed EV restano N/D senza impedire l'uso della quota provider valida.`,
  "",
  "## Identità recuperate",
  "",
  ...identityOverlay.players.map(identity => `- ${identity.team}: **${identity.canonicalName}** → \`${identity.stablePlayerId}\`${identity.providerIds.uefa ? ` · UEFA ${identity.providerIds.uefa}` : " · UEFA ID N/D"}${identity.providerIds.sisal ? ` · Sisal ${identity.providerIds.sisal}` : ""}.`),
  "- Viking: **Haugen** resta nullo perché la fonte UEFA non indica l'iniziale e nello stesso evento esistono Herman Haugen e Kristoffer Haugen con ID Sisal distinti.",
  "",
  "## Copertura per partita",
  "",
  "| Partita | Titolari ID | Disponibilità | Mercati giocatore | Quote selezionabili | Stato |",
  "|---|---:|---:|---:|---:|---|",
  ...fixtures.map(fixture => {
    const starters = [...fixture.lineups.home.players, ...fixture.lineups.away.players];
    const resolved = starters.filter(player => player.canonicalPlayerId).length;
    const blocked = starters.length - resolved;
    return `| ${fixture.homeTeam}–${fixture.awayTeam} | ${resolved}/22 | ${fixture.availability.length} | ${fixture.oddsEvent.coverage.playerMarkets} | ${fixture.oddsEvent.coverage.interfaceSelectableSelections} | ${blocked ? `PARZIALE (${blocked} ID)` : "OK"} |`;
  }),
  "",
  "## Minuti e modello",
  "",
  "L'esposizione esistente del modello è applicata ai probabili titolari UEFA: 84,6 minuti ai giocatori di movimento (0,94 × 90) e 90 ai portieri. Nessuna riduzione arbitraria è applicata ai giocatori in dubbio. I volumi squadra e la riconciliazione matematica restano invariati.",
  "",
  "## Partita senza volumi dettagliati",
  "",
  ...volumeBlockedFixtures.map(fixture => `- **${fixture.homeTeam}–${fixture.awayTeam}** (${fixture.fixtureId}): solo pronostico risultato/gol. Sabah dispone di un solo incontro completo nel fallback UEFA, nessuna gara interna e un solo campione esterno; non supera la soglia esistente di 6 gare complessive e almeno 2 casa/2 trasferta. Slavia Praha è coperta, ma il gate richiede entrambi i profili.`),
  "",
  "## Compatibilità mercati Sisal",
  "",
  ...Object.entries(compatibility).map(([status, count]) => `- ${status}: ${count.markets} mercati, ${count.selections} selezioni.`),
  "",
  "I mercati 28507 includono il sostituto; i 28506 e gli altri contratti che lo dichiarano (per esempio 28090) includono anche pali/traverse. I mercati del primo tempo e quelli che richiedono esito in entrambi i tempi non sono confrontabili con il modello individuale full-match. Quote, quoteRaw, soglie, ID, stato e modificatori originali restano invariati nell'artefatto e nello snapshot autorevole.",
  "",
  "## Blocchi",
  "",
  ...(unresolvedStarters.length ? unresolvedStarters.map(player => `- Titolare non risolto: ${player.team} — ${player.suppliedName}.`) : ["- Nessun blocco di identità tra i probabili titolari."]),
  ...(unresolvedAvailability.length ? unresolvedAvailability.map(player => `- Disponibilità non risolta: ${player.team} — ${player.suppliedName} (${player.status}).`) : ["- Nessun blocco di identità nelle liste disponibilità."]),
  "- Le probabilità evento e gli EV dei mercati giocatore restano N/D/null per incompatibilità contrattuale.",
  "",
  "## Sincronizzazione e integrità",
  "",
  "Lettura e schedina condividono `fixtureId`, `providerEventId`, `providerMarketId`, `providerSelectionId` e `selectionId` per tutte le 18 gare. Una quota valida è selezionabile anche con probabilità/EV N/D; la compatibilità matematica resta un campo separato e non viene aggirata. Nessuno snapshot congelato è stato creato o sovrascritto; il builder non legge né scrive dati Serie A.",
  "",
  `- Probabili UEFA SHA-256: \`${inputHashes.probableSource.sha256}\``,
  `- Quote Sisal normalizzate SHA-256: \`${inputHashes.odds.sha256}\``,
  `- Quote Sisal raw SHA-256: \`${rawHash || "N/D"}\``,
  `- Timestamp quote: \`${odds.retrievedAt}\``,
  ""
].join("\n");

let finalOutput = output;
if (targetFixtureIds.size) {
  const previousOutput = baselineFromHead
    ? JSON.parse(execFileSync("git", ["show", `HEAD:${paths.output}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }))
    : read(paths.output);
  const generatedById = new Map(output.fixtures.map(fixture => [fixture.fixtureId, fixture]));
  for (const fixtureId of targetFixtureIds) {
    if (!generatedById.has(fixtureId) || !previousOutput.fixtures.some(fixture => fixture.fixtureId === fixtureId)) throw new Error(`${fixtureId}: target selettivo non valido`);
  }
  finalOutput = {
    ...output,
    fixtures: previousOutput.fixtures.map(fixture => targetFixtureIds.has(fixture.fixtureId) ? generatedById.get(fixture.fixtureId) : fixture)
  };
}
write(paths.output, finalOutput);
write(paths.report, report);
console.log(`OK Fase 12 MD2: ${fixtures.length}/18 gare · titolari ${output.coverage.canonicalStartersResolved}/${lineupPlayers.length} · quote selezionabili ${output.coverage.odds.interfaceSelectableSelections} · probabilità giocatore 0`);

