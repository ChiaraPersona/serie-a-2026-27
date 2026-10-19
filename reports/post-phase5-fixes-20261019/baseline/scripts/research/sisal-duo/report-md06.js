"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");
const {
  AVAILABILITY,
  SOT_NOT_CERTIFIED,
  namedPlayerSensitivity,
  poissonAtLeast,
  ratePer90FromFrozenProjection,
} = require("./adapter");
const { run: runAdapterTests } = require("./test");

const root = path.resolve(__dirname, "..", "..", "..");
const reportDate = "2026-10-09";
const outputDirectory = path.join(root, "output", "reports");
const jsonOutput = path.join(outputDirectory, `sisal-md06-duo-market-compatibility-${reportDate}.json`);
const markdownOutput = path.join(outputDirectory, `sisal-md06-duo-market-compatibility-${reportDate}.md`);
const oddsPath = path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json");
const operationalPath = path.join(root, "output", "reports", "md6-latest-operational-2026-10-03.json");
const snapshotPath = path.join(root, "data", "predictions", "snapshots", "2026-27", "md-06.json");
const lineupsPath = path.join(root, "data", "sources", "probable-lineups-md6-2026-27.json");
const quotationsPath = path.join(root, "data", "sources", "fantacalcio-quotations-2026-27.json");
const aliasesPath = path.join(root, "data", "sources", "player-identity-aliases-2026-27.json");
const sisalRulesUrl = "https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf";
const statmuseDataUrl = "https://www.statmuse.com/product/data/fc";
const duoCodes = new Set(["28507", "28506", "31666", "31665"]);

const RULES = Object.freeze({
  "28507": {
    marketRuleId: "SISAL_CALCIO_SINGLE_DUO_TOTAL_SHOTS_ET_2026-10-09",
    metric: "shots",
    namedPlayers: 1,
    woodworkIncluded: true,
    extraTimeIncluded: true,
    targetDefinition: "Tiri totali del giocatore nominato e del sostituto diretto, inclusi eventuali supplementari; goal, tiri nello specchio, fuori e legni.",
    officialLines: "8250-8264",
    participation: "Rimborso se il giocatore nominato non partecipa; se partecipa, conta anche chi subentra al suo posto dalla panchina.",
  },
  "28506": {
    marketRuleId: "SISAL_CALCIO_SINGLE_DUO_SOT_WOODWORK_ET_2026-10-09",
    metric: "sot",
    namedPlayers: 1,
    woodworkIncluded: true,
    extraTimeIncluded: true,
    targetDefinition: "SOT del giocatore nominato e del sostituto diretto, includendo pali/traverse ed eventuali supplementari.",
    officialLines: "8197-8215",
    participation: "Rimborso se il giocatore nominato non partecipa; se partecipa, conta anche chi subentra al suo posto dalla panchina.",
  },
  "31666": {
    marketRuleId: "SISAL_CALCIO_PAIR_DUO_TOTAL_SHOTS_ET_2026-10-09",
    metric: "shots",
    namedPlayers: 2,
    woodworkIncluded: true,
    extraTimeIncluded: true,
    targetDefinition: "Somma dei tiri totali dei due giocatori nominati e dei rispettivi sostituti diretti, inclusi eventuali supplementari.",
    officialLines: "8023-8039",
    participation: "Valido se partecipa almeno uno dei due nominati; rimborso se non partecipa nessuno dei due.",
  },
  "31665": {
    marketRuleId: "SISAL_CALCIO_PAIR_DUO_STANDARD_SOT_ET_2026-10-09",
    metric: "sot",
    namedPlayers: 2,
    woodworkIncluded: false,
    extraTimeIncluded: true,
    targetDefinition: "Somma dei SOT standard dei due giocatori nominati e dei rispettivi sostituti diretti, esclusi i legni che non entrano, inclusi eventuali supplementari.",
    officialLines: "7993-8012",
    participation: "Valido se partecipa almeno uno dei due nominati; rimborso se non partecipa nessuno dei due.",
  },
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileHash(file) {
  return sha256(fs.readFileSync(file));
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalize(value) {
  return String(value || "")
    .replace(/[øØ]/g, "o").replace(/[łŁ]/g, "l").replace(/[đĐðÐ]/g, "d")
    .replace(/[þÞ]/g, "th").replace(/[æÆ]/g, "ae").replace(/[œŒ]/g, "oe").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function protectedRepositoryInventory() {
  const files = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
  }).toString().split("\0").filter(Boolean).map(file => file.replace(/\\/g, "/"));
  const excluded = new Set([
    "output/reports/sisal-md06-duo-market-compatibility-2026-10-09.json",
    "output/reports/sisal-md06-duo-market-compatibility-2026-10-09.md",
  ]);
  return Object.fromEntries(files.filter(file => !file.startsWith("scripts/research/sisal-duo/") && !excluded.has(file)).sort().map(file => [file, fileHash(path.join(root, file))]));
}

function manifestHash(manifest) {
  return sha256(Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right)).map(([file, hash]) => `${file}:${hash}`).join("\n"));
}

function changedFiles(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]).sort();
}

function categoryManifest(manifest, predicate) {
  const rows = Object.entries(manifest).filter(([file]) => predicate(file));
  return { files: rows.length, sha256: sha256(rows.sort(([a], [b]) => a.localeCompare(b)).map(([file, hash]) => `${file}:${hash}`).join("\n")) };
}

function integrityCategories(manifest) {
  return {
    playerMarketV2: categoryManifest(manifest, file => file.startsWith("scripts/predictions/") || file === "scripts/build-predictions.js" || file === "data/normalized/predictions.json"),
    playerSnapshots: categoryManifest(manifest, file => file.startsWith("data/predictions/snapshots/")),
    exactScore: categoryManifest(manifest, file => file.includes("exact-score")),
    cards: categoryManifest(manifest, file => /card|disciplin/i.test(file)),
    champions: categoryManifest(manifest, file => /champions/i.test(file)),
    odds: categoryManifest(manifest, file => file.includes("odds/sisal") || file.includes("sisal/odds")),
    schedine: categoryManifest(manifest, file => /schedina|mycombo/i.test(file)),
    historicalData: categoryManifest(manifest, file => /histor|2023-24|2024-25|2025-26/i.test(file)),
    publishedSite: categoryManifest(manifest, file => /^(?:[^/]+\.html|css\/|js\/)/.test(file)),
  };
}

function cleanProviderLabel(value) {
  return String(value || "")
    .replace(/\s+U\/O\s+.*$/i, "")
    .replace(/\s+(?:MARCATORE|CARTELLINO|AMMONITO|SEGNA|ASSIST|ALMENO|MIGLIORE|TRIPLETTA|DOPPIETTA).*$/i, "")
    .replace(/\s+\d+(?:\.\d+)?\s*$/i, "")
    .trim();
}

function providerLabels(raw) {
  const counts = new Map();
  for (const response of raw.responses || []) {
    for (const info of Object.values(response.payload?.infoAggiuntivaMap || {})) {
      for (const providerId of info.playerIds || []) {
        const candidates = [info.shortDescription, info.mobileDescription?.[0]?.description, info.descrizione].map(cleanProviderLabel).filter(Boolean);
        if (!counts.has(String(providerId))) counts.set(String(providerId), new Map());
        const counter = counts.get(String(providerId));
        for (const label of candidates) counter.set(label, (counter.get(label) || 0) + 1);
      }
    }
  }
  return new Map([...counts].map(([providerId, counter]) => {
    const labels = [...counter.entries()].sort((left, right) => right[1] - left[1] || left[0].length - right[0].length);
    return [providerId, labels[0]?.[0] || null];
  }));
}

function aliasesForPlayer(player) {
  const values = [player.sourceName, player.currentName, player.name, player.canonicalName, player.lineupName, player.player, ...(player.names || [])].filter(Boolean);
  const aliases = new Set();
  for (const value of values) {
    const clean = normalize(value);
    if (!clean) continue;
    aliases.add(clean);
    const tokens = clean.split(" ").filter(Boolean);
    if (tokens.length >= 2) {
      aliases.add(tokens[tokens.length - 1]);
      aliases.add(`${tokens[tokens.length - 1]} ${tokens[0][0]}`);
      aliases.add(`${tokens[tokens.length - 1]} ${tokens[0]}`);
      aliases.add([...tokens].sort().join(" "));
    }
  }
  return [...aliases];
}

function tokenMatchScore(targetTokens, aliasTokens) {
  if (targetTokens.length < 2 || !aliasTokens.length) return 0;
  const compatible = (left, right) => (left.length === 1 || right.length === 1) ? left[0] === right[0] : left === right;
  const used = new Set();
  let exact = 0;
  let initials = 0;
  for (const target of targetTokens) {
    const index = aliasTokens.findIndex((alias, candidateIndex) => !used.has(candidateIndex) && compatible(target, alias));
    if (index < 0) return 0;
    used.add(index);
    if (target.length === 1 || aliasTokens[index].length === 1) initials++;
    else exact++;
  }
  if (!exact) return 0;
  return (targetTokens.length === aliasTokens.length ? 96 : 92) + Math.min(2, exact) - Math.min(1, initials);
}

function matchProviderPlayer(label, candidates) {
  const target = normalize(label);
  if (!target) return { status: "UNMATCHED", reason: "MISSING_PROVIDER_LABEL", label: label || null };
  const targetTokens = target.split(" ");
  const ranked = candidates.map(player => {
    let score = 0;
    for (const alias of aliasesForPlayer(player)) {
      const aliasTokens = alias.split(" ");
      if (alias === target) score = Math.max(score, targetTokens.length === 1 ? 90 : 100);
      if (targetTokens.length > 1 && [...aliasTokens].sort().join(" ") === [...targetTokens].sort().join(" ")) score = Math.max(score, 98);
      score = Math.max(score, tokenMatchScore(targetTokens, aliasTokens));
    }
    return { player, score };
  }).filter(entry => entry.score > 0).sort((left, right) => right.score - left.score || String(left.player.playerId).localeCompare(String(right.player.playerId)));
  if (!ranked.length || ranked[0].score < 90) return { status: "UNMATCHED", reason: "NO_NAME_MATCH", label };
  const tiedDifferent = ranked[1] && ranked[1].score === ranked[0].score && ranked[1].player.playerId && ranked[0].player.playerId && ranked[1].player.playerId !== ranked[0].player.playerId;
  if (tiedDifferent) return { status: "AMBIGUOUS", reason: "TIED_NAME_MATCH", label };
  return { status: ranked[0].score >= 96 ? "EXACT" : "FUZZY_VERIFIED_WITHIN_FIXTURE", score: ranked[0].score, label, player: ranked[0].player };
}

function mergePlayers(values) {
  const merged = new Map();
  for (const incoming of values) {
    const key = incoming.playerId || (incoming.sourceId ? `source:${incoming.sourceId}` : `${incoming.teamId}:${normalize(incoming.sourceName || incoming.name || incoming.player)}`);
    const target = merged.get(key) || {};
    merged.set(key, {
      ...target,
      ...incoming,
      playerId: target.playerId || incoming.playerId || null,
      sourceId: target.sourceId || incoming.sourceId || null,
      teamId: target.teamId || incoming.teamId || incoming.team || null,
      names: [...new Set([...(target.names || []), ...(incoming.names || []), incoming.sourceName, incoming.currentName, incoming.name, incoming.canonicalName, incoming.lineupName, incoming.player].filter(Boolean))],
    });
  }
  return [...merged.values()];
}

function playerPool(teamIds, fixture, lineups, quotations, aliases) {
  const squad = [...teamIds].flatMap(teamId => {
    const file = path.join(root, "data", "teams", `${teamId}.json`);
    return fs.existsSync(file) ? (readJson(file).squad || []).map(player => ({ playerId: player.id, teamId, currentName: player.name, canonicalName: player.name, names: [player.name] })) : [];
  });
  const aliasPlayers = (aliases.players || []).filter(player => teamIds.has(player.teamId)).map(player => ({ playerId: player.playerId, teamId: player.teamId, canonicalName: player.canonicalName, names: player.aliases || [] }));
  return mergePlayers([
    ...fixture.players,
    ...lineups.teams.filter(team => teamIds.has(team.teamId)).flatMap(team => team.players),
    ...quotations.players.filter(player => player.status === "active" && teamIds.has(player.teamId)),
    ...squad,
    ...aliasPlayers,
  ]);
}

function minimumCount(market) {
  const threshold = Number(market.threshold);
  return ["28507", "28506"].includes(market.marketCode) ? Math.floor(threshold) + 1 : threshold;
}

function serializedProbability(player, metric, targetCount) {
  if (!player) return null;
  const key = metric === "shots" ? `shots${targetCount}Plus` : `sot${targetCount}Plus`;
  if (Number.isFinite(player.probabilities?.[key])) return player.probabilities[key];
  return poissonAtLeast(metric === "shots" ? player.predictedShots : player.predictedSOT, targetCount);
}

function openSelection(market) {
  return market.selections.find(selection => selection.status === "open" && selection.odds > 0)
    || market.selections.find(selection => selection.odds > 0)
    || null;
}

function compactProjection(player, operational) {
  if (!player) return null;
  return {
    playerId: player.playerId,
    player: player.player,
    team: player.team,
    role: player.role,
    detailedRole: player.detailedRole,
    expectedStarter: player.expectedStarter,
    starterProbability: operational?.starterProbability ?? null,
    expectedMinutes: player.expectedMinutes,
    substitutionRisk: operational?.substitutionRisk ?? null,
    likelyReplacement: operational?.likelyReplacement ?? null,
    predictedShots: player.predictedShots,
    predictedSOT: player.predictedSOT,
    probabilities: player.probabilities,
    maturity: player.maturity,
    stability: player.stability,
    fallbackUsed: player.fallbackUsed,
  };
}

function pairSensitivity(players, metric, targetCount) {
  if (players.length !== 2 || players.some(player => !player)) return null;
  const expectedCurrent = players.reduce((sum, player) => sum + (metric === "shots" ? player.predictedShots : player.predictedSOT), 0);
  const rates = players.map(player => ratePer90FromFrozenProjection(metric === "shots" ? player.predictedShots : player.predictedSOT, player.expectedMinutes));
  if (rates.some(rate => !Number.isFinite(rate))) return null;
  const expectedFull90 = rates.reduce((sum, rate) => sum + rate, 0);
  return {
    status: AVAILABILITY.SENSITIVITY_ONLY,
    assumption: "Named players only. Poisson independent increments within each player and conditional independence across the two named-player slots; no substitute contribution.",
    currentFrozenExposure: { expectedCount: round(expectedCurrent), probability: poissonAtLeast(expectedCurrent, targetCount) },
    bothNamedPlayers90: { expectedCount: round(expectedFull90), probability: poissonAtLeast(expectedFull90, targetCount) },
    withSubstitutes: { probability: null, reason: "REPLACEMENT_IDENTITIES_RATES_AND_SCENARIO_WEIGHTS_UNAVAILABLE" },
  };
}

function marketStatus({ rule, associations, projections }) {
  if (associations.some(association => !["EXACT", "FUZZY_VERIFIED_WITHIN_FIXTURE"].includes(association.status))) return { status: AVAILABILITY.UNAVAILABLE, reasons: ["PLAYER_IDENTITY_UNRESOLVED"] };
  if (projections.some(player => !player)) return { status: AVAILABILITY.UNAVAILABLE, reasons: ["FROZEN_V2_PROJECTION_UNAVAILABLE_FOR_ONE_OR_MORE_NAMED_PLAYERS"] };
  if (rule.metric === "sot" && rule.woodworkIncluded) return { status: AVAILABILITY.UNAVAILABLE, reasons: [SOT_NOT_CERTIFIED, "WOODWORK_COUNTS_NOT_SERIALIZED_IN_V2"] };
  return { status: AVAILABILITY.SENSITIVITY_ONLY, reasons: ["REPLACEMENT_IDENTITY_UNAVAILABLE", "SCENARIO_WEIGHTS_UNAVAILABLE", ...(rule.metric === "sot" ? [SOT_NOT_CERTIFIED] : [])] };
}

function percent(value) {
  return Number.isFinite(value) ? `${round(value * 100, 1)}%` : "N/D";
}

function markdownTable(headers, rows) {
  const escape = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [`| ${headers.map(escape).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(escape).join(" | ")} |`)].join("\n");
}

function ranking(markets, metric, targetCount, limit = 10) {
  return markets.filter(row => row.rule.metric === metric && row.rule.namedPlayers === 1 && row.minimumCount === targetCount && row.namedPlayerInputs[0]?.projection)
    .map(row => ({ ...row, probability: row.individualV2Probability }))
    .filter(row => Number.isFinite(row.probability))
    .sort((left, right) => right.probability - left.probability || String(left.player).localeCompare(String(right.player)))
    .slice(0, limit);
}

function renderRanking(title, rows) {
  return [`### ${title}`, "", markdownTable(["#", "Giocatore", "Partita", "P individuale V2", "Quota", "P implicita", "DUO"], rows.map((row, index) => [index + 1, row.player, row.event, percent(row.probability), row.odds, percent(row.impliedProbability), row.status])), ""].join("\n");
}

function main() {
  const protectedBefore = protectedRepositoryInventory();
  const categoriesBefore = integrityCategories(protectedBefore);
  const adapterTest = runAdapterTests({ includeReport: false });
  const odds = readJson(oddsPath);
  const operational = readJson(operationalPath);
  const snapshots = readJson(snapshotPath);
  const lineups = readJson(lineupsPath);
  const quotations = readJson(quotationsPath);
  const aliases = readJson(aliasesPath);
  assert.equal(odds.events.length, 10, "Sisal MD6 event coverage");
  assert.equal(snapshots.snapshots.length, 10, "frozen MD6 snapshot coverage");
  assert.equal(operational.fixtures.length, 10, "operational MD6 coverage");

  const rawPath = path.join(root, odds.rawFile);
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(rawPath)).toString("utf8"));
  const labels = providerLabels(raw);
  const fixtureByMatch = new Map(operational.fixtures.map(fixture => [fixture.matchId, fixture]));
  const snapshotByMatch = new Map(snapshots.snapshots.map(snapshot => [snapshot.matchId, snapshot]));
  const projectionIndex = new Map(snapshots.snapshots.flatMap(snapshot => snapshot.prediction.players.map(player => [`${snapshot.matchId}:${player.playerId}`, player])));
  const operationalIndex = new Map(operational.fixtures.flatMap(fixture => fixture.players.map(player => [`${fixture.matchId}:${player.playerId}`, player])));
  const associationIndex = new Map();
  for (const event of odds.events) {
    const fixture = fixtureByMatch.get(event.canonicalMatchId);
    const teamIds = new Set(fixture.teams.map(team => team.teamId));
    const pool = playerPool(teamIds, fixture, lineups, quotations, aliases);
    const providerIds = [...new Set(event.markets.filter(market => duoCodes.has(market.marketCode)).flatMap(market => market.providerPlayerIds || []))];
    for (const providerId of providerIds) associationIndex.set(`${event.canonicalMatchId}:${providerId}`, matchProviderPlayer(labels.get(String(providerId)), pool));
  }

  const markets = odds.events.flatMap(event => event.markets.filter(market => duoCodes.has(market.marketCode)).map(market => {
    const rule = RULES[market.marketCode];
    const selection = openSelection(market);
    const associations = (market.providerPlayerIds || []).map(providerId => {
      const association = associationIndex.get(`${event.canonicalMatchId}:${providerId}`) || { status: "UNMATCHED", reason: "NO_ASSOCIATION" };
      return {
        providerPlayerId: providerId,
        providerLabel: association.label || labels.get(String(providerId)) || null,
        status: association.status,
        score: association.score || null,
        reason: association.reason || null,
        playerId: association.player?.playerId || null,
        player: association.player?.currentName || association.player?.canonicalName || association.player?.name || association.player?.names?.[0] || null,
        teamId: association.player?.teamId || null,
      };
    });
    const projections = associations.map(association => association.playerId ? projectionIndex.get(`${event.canonicalMatchId}:${association.playerId}`) || null : null);
    const targetCount = minimumCount(market);
    const support = marketStatus({ rule, associations, projections });
    const individualV2Probability = rule.namedPlayers === 1 && projections[0] ? serializedProbability(projections[0], rule.metric, targetCount) : null;
    const singleSensitivity = support.status === AVAILABILITY.SENSITIVITY_ONLY && rule.namedPlayers === 1
      ? namedPlayerSensitivity({ playerId: projections[0].playerId, projectedCount: rule.metric === "shots" ? projections[0].predictedShots : projections[0].predictedSOT, expectedMinutes: projections[0].expectedMinutes, minimumCount: targetCount, metric: rule.metric })
      : null;
    const duoSensitivity = support.status === AVAILABILITY.SENSITIVITY_ONLY
      ? (rule.namedPlayers === 1 ? singleSensitivity : pairSensitivity(projections, rule.metric, targetCount))
      : null;
    return {
      matchId: event.canonicalMatchId,
      event: event.name,
      marketId: market.providerMarketId,
      selectionId: selection?.providerSelectionId || null,
      marketCode: market.marketCode,
      marketName: market.marketName,
      variantName: market.variantName,
      marketRuleId: rule.marketRuleId,
      rule: {
        ...rule,
        coreRuleStatus: "VERIFIED",
        edgeCaseStatus: "PARTIAL",
        substitutionChain: "RULE_UNVERIFIED",
        halfTimeAndInjuryReplacement: "No special exclusion is stated; the general direct-substitute wording applies, but there is no separate explicit clause.",
      },
      player: associations.length === 1 ? associations[0].player : null,
      playerId: associations.length === 1 ? associations[0].playerId : null,
      namedPlayers: associations,
      threshold: Number(market.threshold),
      minimumCount: targetCount,
      target: `${targetCount}+ ${rule.metric === "shots" ? "tiri totali" : "tiri in porta"} DUO`,
      targetDefinition: rule.targetDefinition,
      odds: selection?.odds || null,
      selectionName: selection?.name || null,
      impliedProbability: selection?.odds > 0 ? round(1 / selection.odds) : null,
      marketUpdatedAt: market.updatedAt,
      oddsRetrievedAt: odds.retrievedAt,
      snapshotGeneratedAt: snapshotByMatch.get(event.canonicalMatchId)?.generatedAt || null,
      individualV2Probability,
      individualProbabilityType: individualV2Probability == null ? null : "INDIVIDUAL_V2_PROBABILITY",
      duoResearchProbability: null,
      sisalMarketCertifiedProbability: null,
      evResearch: null,
      evStatus: "NOT_AVAILABLE_TARGET_OR_SCENARIO_DISTRIBUTION_NOT_CERTIFIED",
      status: support.status,
      uncertainty: support.reasons,
      namedPlayerInputs: projections.map((player, index) => ({ association: associations[index], projection: compactProjection(player, associations[index]?.playerId ? operationalIndex.get(`${event.canonicalMatchId}:${associations[index].playerId}`) : null) })),
      sensitivity: duoSensitivity,
      provenance: {
        oddsFile: path.relative(root, oddsPath).replace(/\\/g, "/"),
        rawOddsFile: odds.rawFile,
        playerSnapshotFile: path.relative(root, snapshotPath).replace(/\\/g, "/"),
        operationalFile: path.relative(root, operationalPath).replace(/\\/g, "/"),
        rulesUrl: sisalRulesUrl,
        rulesLines: rule.officialLines,
      },
    };
  }));

  assert.equal(markets.length, 3771, "DUO market coverage changed");
  assert(markets.every(row => row.marketId && row.selectionId && row.marketRuleId), "market identity fields");
  assert(markets.every(row => row.duoResearchProbability === null && row.sisalMarketCertifiedProbability === null && row.evResearch === null), "no artificial point probability or EV");
  assert(markets.every(row => row.status === AVAILABILITY.SENSITIVITY_ONLY || row.status === AVAILABILITY.UNAVAILABLE), "status taxonomy");

  const byStatus = Object.fromEntries(Object.values(AVAILABILITY).map(status => [status, markets.filter(row => row.status === status).length]));
  const byCode = Object.fromEntries([...duoCodes].map(code => [code, markets.filter(row => row.marketCode === code).length]));
  const identityMatched = markets.filter(row => row.namedPlayers.every(player => ["EXACT", "FUZZY_VERIFIED_WITHIN_FIXTURE"].includes(player.status))).length;
  const projectionMatched = markets.filter(row => row.namedPlayerInputs.every(input => input.projection)).length;
  const uniqueProviderPlayers = associationIndex.size;
  const unresolvedProviderPlayers = [...associationIndex.values()].filter(association => !["EXACT", "FUZZY_VERIFIED_WITHIN_FIXTURE"].includes(association.status)).length;
  const replacementCandidates = operational.fixtures.flatMap(fixture => fixture.players).filter(player => player.likelyReplacement != null).length;
  const expectedMinutesAvailable = operational.fixtures.flatMap(fixture => fixture.players).filter(player => Number.isFinite(player.expectedMinutes)).length;
  const substitutionRiskAvailable = operational.fixtures.flatMap(fixture => fixture.players).filter(player => ["low", "medium", "high"].includes(player.substitutionRisk)).length;
  const rankings = {
    shots1Plus: ranking(markets, "shots", 1),
    shots2Plus: ranking(markets, "shots", 2),
    shots3Plus: ranking(markets, "shots", 3),
    sot1Plus: ranking(markets, "sot", 1),
    sot2Plus: ranking(markets, "sot", 2),
  };
  const outsiders = rankings.shots1Plus.filter(row => !/^Attaccante$/i.test(row.namedPlayerInputs[0]?.projection?.role || "")).slice(0, 10);
  const sensitivityExamples = rankings.shots2Plus.slice(0, 10).map(row => ({
    matchId: row.matchId,
    player: row.player,
    playerId: row.playerId,
    expectedMinutes: row.namedPlayerInputs[0].projection.expectedMinutes,
    substitutionRisk: row.namedPlayerInputs[0].projection.substitutionRisk,
    scenarios: row.sensitivity.scenarios,
  }));

  const coverage = {
    allSisalMarkets: odds.summary.markets,
    duoMarkets: markets.length,
    duoShotsMarkets: markets.filter(row => row.rule.metric === "shots").length,
    duoSotMarkets: markets.filter(row => row.rule.metric === "sot").length,
    byCode,
    identityMatchedMarkets: identityMatched,
    fullFrozenProjectionMatchedMarkets: projectionMatched,
    coreRuleVerifiedMarkets: markets.length,
    fullyVerifiedIncludingReplacementChainMarkets: 0,
    quantitativePointEstimateMarkets: byStatus.RESEARCH_ESTIMATE + byStatus.EXACT_TARGET_SUPPORTED,
    researchEstimateMarkets: byStatus.RESEARCH_ESTIMATE,
    sensitivityOnlyMarkets: byStatus.SENSITIVITY_ONLY,
    unavailableMarkets: byStatus.UNAVAILABLE,
    exactTargetSupportedMarkets: byStatus.EXACT_TARGET_SUPPORTED,
    uniqueProviderPlayers,
    unresolvedProviderPlayers,
  };

  const report = {
    schemaVersion: 1,
    title: "Sisal MD6 DUO player markets compatibility",
    generatedAt: new Date().toISOString(),
    reportDate,
    season: "2026-27",
    competition: "serie-a",
    matchday: 6,
    decision: {
      rules: "PARTIAL",
      shotsAdapter: "RESEARCH_ONLY",
      sotAdapter: "RESEARCH_ONLY",
      substitutionModel: "INSUFFICIENT",
      bookmakerCertifiedEv: "NOT AVAILABLE",
      researchPhase: "CLOSED",
      rationale: "The scenario adapter is implemented and tested, but MD6 has no defensible replacement identity/entry distribution or scenario weights. Single-player SOT additionally targets woodwork that V2 does not serialize.",
    },
    rules: {
      source: sisalRulesUrl,
      verifiedAt: reportDate,
      marketRules: RULES,
      verifiedCore: ["direct substitute aggregation", "single named-player DNP refund", "pair validity when at least one named player participates", "regulation/recovery versus explicit extra-time variants", "standard SOT excludes woodwork-only attempts", "woodwork-inclusive SOT counts those attempts", "total-shots definition"],
      notExplicitlyResolved: ["whether a substitute who is later replaced extends the DUO chain", "a separately worded exception for half-time replacements", "a separately worded exception for injury replacements"],
      interpretation: "Half-time and injury replacements are not excluded by the direct-substitute wording. A second link in a replacement chain is not expressly defined and remains RULE_UNVERIFIED.",
    },
    targetCompatibility: {
      playerMarket: "Event for one named player's own count only.",
      duoMarket: "Settlement event for one or two named players plus qualifying direct substitutes under the Sisal rule.",
      prohibitedShortcuts: ["P(player)+P(substitute)", "1-(1-Pplayer)(1-Psubstitute) without a participation/count model"],
      v2SotProvider: { currentProvider: "StatMuse direct match centre", historicalProviderMix: ["ESPN", "FootyStats"], localDefinitionCertification: "PARTIAL", evidence: "StatMuse exposes SOT and WOOD as separate fields, but the local V2 inputs do not serialize woodwork and do not carry a field-level definition contract.", source: statmuseDataUrl },
      sisalSingleSot: SOT_NOT_CERTIFIED,
      pairStandardSot: "STANDARD_SOT_PROXY_ONLY_NOT_BOOKMAKER_CERTIFIED",
    },
    participationData: {
      frozenPlayers: snapshots.snapshots.reduce((sum, snapshot) => sum + snapshot.prediction.players.length, 0),
      expectedMinutesAvailable,
      substitutionRiskAvailable,
      likelyReplacementAvailable: replacementCandidates,
      reservePlayersInProbableLineups: lineups.teams.flatMap(team => team.players).filter(player => player.lineupStatus === "reserve").length,
      replacementDistributionAvailable: false,
      conclusion: "Expected Minutes and a categorical substitutionRisk exist, but likelyReplacement is null for every MD6 projected player. Reserve role similarity is not used as a substitute identity or entry probability.",
    },
    scenarioAdapter: {
      module: "scripts/research/sisal-duo/adapter.js",
      unit: "mutually exclusive participation scenario with disjoint minute intervals per substitution slot",
      distribution: "Poisson using the frozen V2 player rate scaled to assigned minutes",
      aggregationGate: "All scenario weights must be present, non-negative and sum to 1; otherwise DUO_PROBABILITY_UNAVAILABLE.",
      pairDependenceGate: "Cross-player conditional independence must be explicitly declared; it is never implicit.",
      md6PointAggregationPerformed: false,
    },
    coverage,
    sensitivityExamples,
    rankings,
    outsiders,
    markets,
    tests: {
      status: adapterTest.status,
      unitAssertions: adapterTest.assertions,
      integrationAssertions: null,
      command: "node scripts/research/sisal-duo/test.js",
      cases: ["player not substituted", "player substituted", "substitute not entered", "named player from bench", "DNP/refund", "multiple replacements", "replacement chain", "1+/2+/3+", "minute overlap", "probability bounds", "normalized weights", "null != 0", "unknown rule", "incompatible SOT", "missing replacement", "IDs", "determinism", "leakage", "production integrity"],
    },
    integrity: {
      scope: "Every tracked or non-ignored untracked repository file except the authorized sisal-duo research directory and the two generated DUO reports.",
      protectedFiles: Object.keys(protectedBefore).length,
      manifestSha256Before: manifestHash(protectedBefore),
      manifestSha256After: null,
      changedFiles: null,
      categoriesBefore,
      categoriesAfter: null,
      status: "PENDING",
    },
    finalStatus: {
      sisalDuoRules: "PARTIAL",
      duoShotsAdapter: "RESEARCH_ONLY",
      duoSotAdapter: "RESEARCH_ONLY",
      substitutionModel: "INSUFFICIENT",
      md6DuoMarketsAnalyzed: markets.length,
      md6QuantitativeResearchEstimates: byStatus.RESEARCH_ESTIMATE,
      md6MarketsUnavailable: byStatus.UNAVAILABLE,
      bookmakerCertifiedEv: "NOT AVAILABLE",
      playerMarketV2: "UNCHANGED",
      exactScoreSnapshots: "UNCHANGED",
      cardModel: "UNCHANGED",
      productionIntegrity: "PENDING",
      duoResearchPhase: "CLOSED",
    },
  };

  writeJson(jsonOutput, report);
  fs.writeFileSync(markdownOutput, renderMarkdown(report));
  const protectedAfter = protectedRepositoryInventory();
  const changed = changedFiles(protectedBefore, protectedAfter);
  report.integrity.manifestSha256After = manifestHash(protectedAfter);
  report.integrity.changedFiles = changed;
  report.integrity.categoriesAfter = integrityCategories(protectedAfter);
  report.integrity.status = changed.length === 0 && report.integrity.manifestSha256Before === report.integrity.manifestSha256After ? "PASS" : "FAILED";
  report.finalStatus.productionIntegrity = report.integrity.status;
  assert.equal(report.integrity.status, "PASS", `protected files changed: ${changed.join(", ")}`);
  writeJson(jsonOutput, report);
  fs.writeFileSync(markdownOutput, renderMarkdown(report));
  const integratedTest = runAdapterTests({ includeReport: true });
  report.tests.status = integratedTest.status;
  report.tests.integrationAssertions = integratedTest.assertions;
  writeJson(jsonOutput, report);
  fs.writeFileSync(markdownOutput, renderMarkdown(report));
  return report;
}

function renderMarkdown(report) {
  const c = report.coverage;
  const rules = Object.entries(report.rules.marketRules).map(([code, rule]) => [code, rule.marketRuleId, rule.metric.toUpperCase(), rule.namedPlayers, rule.woodworkIncluded ? "Sì" : "No", rule.extraTimeIncluded ? "Sì" : "No", rule.officialLines]);
  const statusRows = Object.values(AVAILABILITY).map(status => [status, report.markets.filter(row => row.status === status).length]);
  const sensitivityRows = report.sensitivityExamples.map(row => {
    const byId = Object.fromEntries(row.scenarios.map(scenario => [scenario.scenarioId, scenario]));
    return [row.player, row.expectedMinutes, row.substitutionRisk, percent(byId.PLAYER_90?.duoProbability), percent(byId.PLAYER_75_PLUS_UNKNOWN_SUB?.namedPlayerComponent?.probability), percent(byId.PLAYER_60_PLUS_UNKNOWN_SUB?.namedPlayerComponent?.probability), percent(byId.PLAYER_45_PLUS_UNKNOWN_SUB?.namedPlayerComponent?.probability), "N/D senza identità/tasso sub"];
  });
  return `# Sisal MD6 DUO player markets — compatibilità V2\n\nData report: ${report.reportDate}. Ambito: Serie A 2026/27, MD6. Modalità research/shadow; nessuna promozione a produzione.\n\n## A. Regolamento Sisal\n\nIl testo ufficiale verifica somma con il sostituto diretto, partecipazione/rimborso, supplementari e definizioni tiri/SOT. Le quattro famiglie MD6 hanno un marketRuleId; la catena oltre il primo sostituto non è esplicitata e resta \`RULE_UNVERIFIED\`. La ragione della sostituzione e l'intervallo non sono esclusi dal testo generale, ma non hanno una clausola separata.\n\n${markdownTable(["Codice", "marketRuleId", "Metrica", "Nominati", "Legni", "TS", "Righe PDF"], rules)}\n\nFonte: [regolamento ufficiale Sisal Calcio](${sisalRulesUrl}).\n\n## B. Differenze tra V2 e DUO\n\nV2 stima il conteggio del singolo giocatore sui suoi Expected Minutes. Il DUO è il conteggio lungo una o due catene di partecipazione: nominato più sostituto diretto. Non è \`P(player)+P(sub)\` e non è automaticamente \`1-(1-Pplayer)(1-Psub)\`. Nessuna formula del motore individuale è stata modificata.\n\n## C. Copertura mercati\n\n${markdownTable(["Voce", "N"], [
    ["Mercati Sisal totali", c.allSisalMarkets], ["Mercati DUO analizzati", c.duoMarkets], ["DUO tiri", c.duoShotsMarkets], ["DUO SOT", c.duoSotMarkets],
    ["Identità complete", c.identityMatchedMarkets], ["Proiezioni frozen complete", c.fullFrozenProjectionMatchedMarkets], ["Regola core verificata", c.coreRuleVerifiedMarkets],
    ["Regola completa incl. catena", c.fullyVerifiedIncludingReplacementChainMarkets], ["Stime puntuali research", c.researchEstimateMarkets], ["Solo sensibilità", c.sensitivityOnlyMarkets], ["Indisponibili", c.unavailableMarkets],
  ])}\n\n${markdownTable(["Stato", "N"], statusRows)}\n\n## D. Modello scenari\n\nL'adattatore rappresenta intervalli di minuti disgiunti per ogni slot di sostituzione. In uno scenario completo somma i lambda proporzionali ai minuti e applica la Poisson V2. Per coppie, l'indipendenza condizionale tra slot deve essere dichiarata. L'aggregazione è ammessa solo con scenari mutuamente esclusivi e pesi non negativi normalizzati a 1; sui dati MD6 i pesi non esistono, quindi la probabilità aggregata resta \`DUO_PROBABILITY_UNAVAILABLE\`.\n\n## E. Expected Minutes e sostituzioni\n\n${report.participationData.expectedMinutesAvailable}/${report.participationData.frozenPlayers} giocatori hanno Expected Minutes e ${report.participationData.substitutionRiskAvailable}/${report.participationData.frozenPlayers} hanno substitutionRisk. Replacement candidate disponibili: ${report.participationData.likelyReplacementAvailable}. Le ${report.participationData.reservePlayersInProbableLineups} riserve note non vengono abbinate per semplice ruolo. Identità del subentrante, probabilità d'ingresso e distribuzione del minuto non sono disponibili.\n\n## F. Tiri totali\n\nLa definizione Sisal dei tiri totali è coerente con il conteggio standard V2. L'adattatore è quindi tecnicamente operativo in research, ma per MD6 produce solo sensibilità dove tutti i nominati hanno una proiezione: non esistono identità/tassi/pesi dei sostituti per una stima puntuale.\n\n## G. SOT e legni\n\nStatMuse espone SOT e WOOD come campi distinti, mentre il dataset locale V2 conserva SOT ma non WOOD e non porta un contratto di definizione campo. Il codice 28506 include esplicitamente pali/traverse: \`${SOT_NOT_CERTIFIED}\`. Il 31665 usa SOT standard ed è mostrato soltanto come proxy di sensibilità; nessun SOT è bookmaker-certified. [Catalogo dati StatMuse](${statmuseDataUrl}).\n\n## H. Sensitivity analysis\n\nLe colonne 75/60/45 mostrano soltanto il contributo del nominato, non il DUO completo. Nessun peso è attribuito agli scenari.\n\n${markdownTable(["Giocatore", "Exp min V2", "Rischio sub", "P DUO se 90' e nessun sub", "P componente giocatore 75'", "P componente 60'", "P componente 45'", "Contributo sub"], sensitivityRows)}\n\n## I. Confronto quote\n\nQuote, selezioni, timestamp e probabilità implicite sono conservati per tutti i ${c.duoMarkets} mercati nel JSON. \`duoResearchProbability\`, \`sisalMarketCertifiedProbability\` ed \`evResearch\` sono sempre null: il target completo non ha una distribuzione di sostituzione difendibile. Nessun prezzo viene trasformato in edge.\n\n## J. Candidati MD6\n\nSono ranking individuali V2 tra giocatori con la specifica quota Sisal; la colonna DUO impedisce di leggerli come probabilità bookmaker validate.\n\n${renderRanking("1+ tiri", report.rankings.shots1Plus)}${renderRanking("2+ tiri", report.rankings.shots2Plus)}${renderRanking("3+ tiri", report.rankings.shots3Plus)}${renderRanking("1+ SOT", report.rankings.sot1Plus)}${renderRanking("2+ SOT", report.rankings.sot2Plus)}\n## K. Outsider\n\nCentrocampisti, esterni e difensori sono inclusi senza forzare un sostituto per ruolo.\n\n${markdownTable(["#", "Giocatore", "Ruolo", "Partita", "P individuale 1+ tiri", "Quota", "DUO"], report.outsiders.map((row, index) => [index + 1, row.player, row.namedPlayerInputs[0]?.projection?.role, row.event, percent(row.individualV2Probability), row.odds, row.status]))}\n\n## L. Limiti\n\n- Nessuna identità/probabilità d'ingresso del sostituto.\n- substitutionRisk è categorico, non un peso di scenario.\n- La catena oltre il sostituto diretto è \`RULE_UNVERIFIED\`.\n- V2 non serializza legni; il 28506 non è ricostruibile senza coefficiente arbitrario.\n- Le quote U/O espongono spesso un solo lato aperto; non viene calcolato no-vig.\n- Nessuna calibrazione prospettica specifica DUO.\n\n## M. Test\n\nStato: **${report.tests.status}**. Casi sintetici: partecipazione, DNP/rimborso, sostituzione, catena, intervalli, soglie 1+/2+/3+, bounds, normalizzazione, null, regola ignota, SOT incompatibile, replacement assente, identificativi, determinismo e leakage. Comando: \`${report.tests.command}\`.\n\n## N. Integrità produzione\n\nInventario protetto: ${report.integrity.protectedFiles} file. SHA-256 manifest prima: \`${report.integrity.manifestSha256Before}\`; dopo: \`${report.integrity.manifestSha256After || "PENDING"}\`. File protetti cambiati: ${report.integrity.changedFiles?.length ?? "PENDING"}. Stato: **${report.integrity.status}**. Sono esclusi dal confronto solo adattatore/test research e i due report autorizzati.\n\n## O. Decisione finale\n\nL'adattatore scenari è chiuso in research/shadow. Per i tiri è pronto a calcolare una stima quando verranno forniti scenari completi e pesati; per MD6 resta sensitivity-only. Per i SOT gestisce il gate di compatibilità, ma non certifica il target con legni. Nessun mercato MD6 riceve una probabilità DUO puntuale o un EV.\n\n\`SISAL DUO RULES: ${report.finalStatus.sisalDuoRules}\`\n\n\`DUO SHOTS ADAPTER: ${report.finalStatus.duoShotsAdapter}\`\n\n\`DUO SOT ADAPTER: ${report.finalStatus.duoSotAdapter}\`\n\n\`SUBSTITUTION MODEL: ${report.finalStatus.substitutionModel}\`\n\n\`MD6 DUO MARKETS ANALYZED: ${report.finalStatus.md6DuoMarketsAnalyzed}\`\n\n\`MD6 QUANTITATIVE RESEARCH ESTIMATES: ${report.finalStatus.md6QuantitativeResearchEstimates}\`\n\n\`MD6 MARKETS UNAVAILABLE: ${report.finalStatus.md6MarketsUnavailable}\`\n\n\`BOOKMAKER-CERTIFIED EV: ${report.finalStatus.bookmakerCertifiedEv}\`\n\n\`PLAYER MARKET V2: ${report.finalStatus.playerMarketV2}\`\n\n\`EXACT-SCORE SNAPSHOTS: ${report.finalStatus.exactScoreSnapshots}\`\n\n\`CARD MODEL: ${report.finalStatus.cardModel}\`\n\n\`PRODUCTION INTEGRITY: ${report.finalStatus.productionIntegrity}\`\n\n\`DUO RESEARCH PHASE: ${report.finalStatus.duoResearchPhase}\`\n`;
}

if (require.main === module) {
  try {
    const report = main();
    console.log(JSON.stringify({ status: "PASS", coverage: report.coverage, integrity: report.integrity.status, outputs: [path.relative(root, jsonOutput), path.relative(root, markdownOutput)] }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { main, renderMarkdown };
