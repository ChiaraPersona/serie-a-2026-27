const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportStem = "serie-a-md06-operational-player-analysis-2026-10-09";
const jsonPath = path.join(root, "output", "reports", `${reportStem}.json`);
const markdownPath = path.join(root, "output", "reports", `${reportStem}.md`);

const sourcePaths = {
  predictions: path.join(root, "data", "normalized", "predictions.json"),
  lineups: path.join(root, "data", "sources", "probable-lineups-md6-2026-27.json"),
  rawLineups: path.join(root, "data", "raw", "fantacalcio", "probable-lineups-md6-2026-27.html"),
  odds: path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json"),
};

const protectedTargets = {
  immutablePlayerSnapshots: path.join(root, "data", "predictions", "snapshots"),
  exactScoreResearch: path.join(root, "data", "predictions", "exact-score-research"),
  cardResearchData: path.join(root, "data", "analysis", "card-prediction-research"),
  cardResearchCode: path.join(root, "scripts", "research", "cards"),
  championsData: path.join(root, "data", "champions-2026-27"),
  championsCode: path.join(root, "scripts", "champions"),
  teamProfiles: path.join(root, "data", "normalized", "team-matchup-profiles-2026-27.json"),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readFromHead(repositoryPath) {
  return execFileSync("git", ["show", `HEAD:${repositoryPath.replace(/\\/g, "/")}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

function readJsonFromHead(repositoryPath) {
  return JSON.parse(readFromHead(repositoryPath));
}

function round(value, digits = 4) {
  if (!Number.isFinite(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function percent(value, digits = 1) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(digits)}%` : "N/D";
}

function pp(value, digits = 1) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits)} pp` : "N/D";
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&agrave;/gi, "à")
    .replace(/&egrave;/gi, "è")
    .replace(/&eacute;/gi, "é")
    .replace(/&igrave;/gi, "ì")
    .replace(/&ograve;/gi, "ò")
    .replace(/&ugrave;/gi, "ù")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function listFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap(entry => listFiles(path.join(target, entry.name)))
    .sort((left, right) => left.localeCompare(right));
}

function digestTarget(target) {
  const hash = crypto.createHash("sha256");
  const files = listFiles(target);
  for (const file of files) {
    hash.update(path.relative(root, file).replace(/\\/g, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return { sha256: hash.digest("hex"), files: files.length };
}

function captureProtected() {
  return Object.fromEntries(Object.entries(protectedTargets).map(([name, target]) => [name, digestTarget(target)]));
}

function parseContentPlayers(content) {
  return [...String(content || "").matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].flatMap(match => {
    const body = match[1];
    const name = decodeHtml(body.match(/class="player-name player-link"[\s\S]*?<span>([^<]+)<\/span>/i)?.[1]);
    if (!name) return [];
    const description = decodeHtml(body.match(/<p class="description">([\s\S]*?)<\/p>/i)?.[1]);
    return [{ name, description: description || null }];
  });
}

function parseSection(matchBlock, className) {
  const section = matchBlock.match(new RegExp(`<section class="${className}">([\\s\\S]*?)<\\/section>`, "i"))?.[1] || "";
  const pieces = section.split(/<div class="content">/i).slice(1, 3);
  return [0, 1].map(index => parseContentPlayers(pieces[index] || ""));
}

function parseAvailability(html, events, teamIdByName) {
  const markers = [...html.matchAll(/<li class="match match-item\b/gi)];
  const output = {};
  for (let index = 0; index < markers.length; index += 1) {
    const block = html.slice(markers[index].index, markers[index + 1]?.index || html.length);
    const teamNames = [...block.matchAll(/<h3 class="h6 team-name">([^<]+)<\/h3>/gi)].slice(0, 2).map(match => decodeHtml(match[1]));
    if (teamNames.length !== 2) continue;
    const teamIds = teamNames.map(name => teamIdByName.get(normalize(name)) || null);
    const event = events.find(candidate => candidate.home.canonicalTeamId === teamIds[0] && candidate.away.canonicalTeamId === teamIds[1]);
    if (!event) continue;
    const suspended = parseSection(block, "suspendeds");
    const injured = parseSection(block, "injureds");
    const doubts = parseSection(block, "dubts");
    output[event.canonicalMatchId] = {
      teams: Object.fromEntries(teamIds.map((teamId, teamIndex) => [teamId, {
        team: teamNames[teamIndex],
        suspended: suspended[teamIndex] || [],
        injured: injured[teamIndex] || [],
        doubts: doubts[teamIndex] || [],
      }])),
    };
  }
  return output;
}

function availabilityChanges(current, previous) {
  const flatten = value => [
    ...(value?.suspended || []).map(player => ({ ...player, category: "squalificato" })),
    ...(value?.injured || []).map(player => ({ ...player, category: "infortunato" })),
    ...(value?.doubts || []).map(player => ({ ...player, category: "in dubbio" })),
  ];
  const currentRows = flatten(current);
  const previousRows = flatten(previous);
  const currentKeys = new Set(currentRows.map(row => `${row.category}:${normalize(row.name)}`));
  const previousKeys = new Set(previousRows.map(row => `${row.category}:${normalize(row.name)}`));
  return {
    added: currentRows.filter(row => !previousKeys.has(`${row.category}:${normalize(row.name)}`)),
    removed: previousRows.filter(row => !currentKeys.has(`${row.category}:${normalize(row.name)}`)),
  };
}

function reliabilityFor(player, lineupProbability) {
  const fallback = Boolean(player.fallbackUsed || player.expectedMinutesEvidence?.fallbackUsed);
  let score = 0;
  if (player.signalStatus === "high") score += 3;
  else if (player.signalStatus === "medium") score += 2;
  else if (player.signalStatus === "low") score += 1;
  if (player.playerBaselineStability?.level === "high") score += 2;
  else if (player.playerBaselineStability?.level === "medium") score += 1;
  if (Number(player.expectedMinutes) >= 72) score += 2;
  else if (Number(player.expectedMinutes) >= 60) score += 1;
  if (Number(lineupProbability) >= 80) score += 2;
  else if (Number(lineupProbability) >= 65) score += 1;
  if (player.substitutionRisk === "low") score += 1;
  if (player.substitutionRisk === "high") score -= 1;
  if (fallback) score -= 2;
  const level = score >= 8 ? "ALTA" : score >= 5 ? "MEDIA" : "BASSA";
  const reasons = [
    `segnale ${player.signalStatus || "N/D"}`,
    `stabilità tiri ${player.playerBaselineStability?.level || "N/D"}`,
    `titolarità ${Number.isFinite(Number(lineupProbability)) ? `${lineupProbability}%` : "N/D"}`,
    `rischio sostituzione ${player.substitutionRisk || "N/D"}`,
    fallback ? "fallback attivo" : "nessun fallback",
  ];
  return { level, score, reasons, rationale: reasons.join("; ") };
}

function variantNameConsistent(player, variantName) {
  const variant = normalize(variantName);
  if (!variant) return false;
  const aliases = [player.name, player.lineupName].filter(Boolean).map(normalize);
  return aliases.some(alias => {
    const tokens = alias.split(" ").filter(token => token.length >= 2);
    if (!tokens.length) return false;
    return tokens.some(token => variant.includes(token));
  });
}

function buildSisalMarket(player, event, marketKey, type) {
  const linked = player.markets?.[marketKey] || null;
  if (!linked) return {
    presence: false,
    identityStatus: "NO_MARKET",
    compatibleWithIndividualV2: false,
    incompatibilities: ["NO_QUOTE"],
  };
  const market = event.markets.find(candidate => candidate.providerMarketId === linked.providerMarketId) || null;
  const selection = market?.selections.find(candidate => candidate.providerSelectionId === linked.providerSelectionId)
    || market?.selections.find(candidate => candidate.status === "open" && normalize(candidate.name) === "over")
    || null;
  const expectedCode = type === "shots" ? "28507" : "28506";
  const labelConsistent = market ? variantNameConsistent(player, market.variantName) : false;
  const identityStatus = market && market.marketCode === expectedCode && Number(market.threshold) === 0.5 && labelConsistent
    ? "VERIFIED"
    : "REVIEW";
  const incompatibilities = type === "shots"
    ? ["PLAYER_PLUS_SUBSTITUTE", "EXTRA_TIME_INCLUDED"]
    : ["PLAYER_PLUS_SUBSTITUTE", "POSTS_AND_CROSSBAR_INCLUDED", "EXTRA_TIME_INCLUDED"];
  return {
    presence: Boolean(market && selection),
    identityStatus,
    labelConsistent,
    providerMarketId: market?.providerMarketId || linked.providerMarketId || null,
    providerSelectionId: selection?.providerSelectionId || linked.providerSelectionId || null,
    providerPlayerIds: market?.providerPlayerIds || [],
    marketCode: market?.marketCode || linked.marketCode || null,
    marketName: market?.marketName || null,
    variantName: market?.variantName || null,
    threshold: market?.threshold != null ? Number(market.threshold) : linked.threshold,
    odds: selection?.odds || linked.odds || null,
    rawImpliedProbability: selection?.odds > 0 ? round(1 / selection.odds, 6) : null,
    updatedAt: market?.updatedAt || null,
    retrievedAt: event.retrievedAt || null,
    replacementIncluded: true,
    compatibleWithIndividualV2: false,
    incompatibilities,
    certifiedEv: null,
  };
}

function compactPlayer(player, lineupByPlayerId, event) {
  const lineup = lineupByPlayerId.get(player.playerId) || null;
  const lineupProbability = lineup?.probability ?? null;
  return {
    playerId: player.playerId,
    name: player.name,
    lineupName: player.lineupName,
    team: player.team,
    teamId: player.teamId,
    role: player.role,
    detailedRole: player.detailedRole,
    lineupStatus: lineup?.lineupStatus || null,
    starterProbability: lineupProbability,
    expectedMinutes: player.expectedMinutes,
    projectedShots: player.projectedShots,
    projectedShotsOnTarget: player.projectedShotsOnTarget,
    shotProbabilities: player.shotProbabilities,
    shotOnTargetProbabilities: player.shotOnTargetProbabilities,
    substitutionRisk: player.substitutionRisk,
    likelyReplacement: player.likelyReplacement,
    fallbackUsed: Boolean(player.fallbackUsed || player.expectedMinutesEvidence?.fallbackUsed),
    maturity: {
      signalStatus: player.signalStatus,
      playerMatchesUsed: player.playerMatchesUsed,
      playerMinutesUsed: player.playerMinutesUsed,
      shotStability: player.playerBaselineStability?.level || null,
      sotStability: player.playerSotBaselineStability?.level || null,
      currentSampleCoverage: player.playerBaselineStability?.currentSample?.coverage ?? null,
    },
    matchup: {
      factorShots: player.shotsMatchupFactor,
      factorSot: player.shotsOnTargetMatchupFactor,
      profileConfidence: player.teamProfileConfidence,
      evidence: player.matchupEvidence || [],
    },
    reliability: reliabilityFor(player, lineupProbability),
    outsider: {
      qualifiedShots: Boolean(player.qualifiedOutsider),
      shotsScore: player.outsiderScore,
      shotsConfidence: player.outsiderConfidence,
      qualifiedSot: Boolean(player.qualifiedSotOutsider),
      sotScore: player.sotOutsiderScore,
      sotConfidence: player.sotOutsiderConfidence,
    },
    sisal: {
      shots1Plus: buildSisalMarket(player, event, "shotsOver05", "shots"),
      sot1Plus: buildSisalMarket(player, event, "shotsOnTargetOver05", "sot"),
    },
  };
}

function probabilityFor(player, type, threshold) {
  const key = threshold === 0.5 ? "over05" : threshold === 1.5 ? "over15" : "over25";
  return type === "shots" ? player.shotProbabilities?.[key] : player.shotOnTargetProbabilities?.[key];
}

function quoteFor(player, type, threshold) {
  if (threshold !== 0.5) return null;
  return type === "shots" ? player.sisal.shots1Plus : player.sisal.sot1Plus;
}

function technicalReason(player, type, threshold) {
  const lambda = type === "shots" ? player.projectedShots : player.projectedShotsOnTarget;
  const matchup = type === "shots" ? player.matchup.factorShots : player.matchup.factorSot;
  return [
    `λ ${type === "shots" ? "tiri" : "SOT"} ${round(lambda, 2) ?? "N/D"}`,
    `matchup x${round(matchup, 2) ?? "N/D"}`,
    `${round(player.expectedMinutes, 1) ?? "N/D"} minuti attesi`,
    `segnale ${player.maturity.signalStatus || "N/D"}`,
    threshold > 0.5 ? `soglia ${threshold + 0.5}+ senza quota individuale compatibile` : "quota solo DUO, non usata per graduare",
  ].join("; ");
}

function selectionEntry(player, type, threshold, reasonTag) {
  const quote = quoteFor(player, type, threshold);
  const verifiedQuote = quote?.presence && quote.identityStatus === "VERIFIED";
  return {
    playerId: player.playerId,
    player: player.name,
    team: player.team,
    market: `${threshold + 0.5}+ ${type === "shots" ? "tiri" : "SOT"}`,
    type,
    threshold,
    individualV2Probability: probabilityFor(player, type, threshold),
    sisal: verifiedQuote ? quote : null,
    sisalOdds: verifiedQuote ? quote.odds : null,
    rawImpliedProbability: verifiedQuote ? quote.rawImpliedProbability : null,
    expectedMinutes: player.expectedMinutes,
    starterProbability: player.starterProbability,
    technicalReason: `${reasonTag}; ${technicalReason(player, type, threshold)}`,
    compatibility: verifiedQuote ? "INCOMPATIBLE_DUO_TARGET" : quote?.presence ? "IDENTITY_REVIEW_NO_QUOTE_USED" : "NO_COMPATIBLE_QUOTE",
    reliability: player.reliability,
    substitutionRisk: player.substitutionRisk,
    certifiedEv: null,
  };
}

function chooseSelections(players) {
  const eligible = players.filter(player => player.expectedMinutes >= 55 && player.starterProbability >= 60 && player.maturity.signalStatus !== "unknown");
  const selected = [];
  const used = new Set();
  const take = (pool, type, threshold, floor, reason) => {
    const chosen = [...pool]
      .filter(player => !used.has(player.playerId) && probabilityFor(player, type, threshold) >= floor)
      .sort((left, right) => probabilityFor(right, type, threshold) - probabilityFor(left, type, threshold))[0];
    if (!chosen) return;
    selected.push(selectionEntry(chosen, type, threshold, reason));
    used.add(chosen.playerId);
  };
  take(eligible, "shots", 1.5, 0.2, "miglior profilo 2+ tiri eleggibile");
  take(eligible, "sot", 0.5, 0.25, "miglior profilo 1+ SOT distinto");
  const outsiders = eligible.filter(player => player.outsider.qualifiedShots || player.outsider.qualifiedSot || player.role !== "Attaccante");
  take(outsiders, "shots", 0.5, 0.35, "profilo meno ovvio supportato dal volume V2");
  take(eligible, "shots", 0.5, 0.45, "miglior residuo 1+ tiri");
  take(eligible, "sot", 0.5, 0.2, "miglior residuo 1+ SOT");
  return selected.slice(0, 3);
}

function selectOutsiders(players) {
  const primaryIds = new Set([...players].sort((a, b) => b.shotProbabilities.over05 - a.shotProbabilities.over05).slice(0, 4).map(player => player.playerId));
  return [...players]
    .filter(player => player.expectedMinutes >= 58 && player.starterProbability >= 55)
    .filter(player => player.outsider.qualifiedShots || player.outsider.qualifiedSot || player.role !== "Attaccante" || !primaryIds.has(player.playerId))
    .filter(player => player.shotProbabilities.over05 >= 0.28 || player.shotOnTargetProbabilities.over05 >= 0.18)
    .sort((left, right) => {
      const leftGate = left.outsider.qualifiedShots || left.outsider.qualifiedSot ? 1 : 0;
      const rightGate = right.outsider.qualifiedShots || right.outsider.qualifiedSot ? 1 : 0;
      return rightGate - leftGate || (right.outsider.shotsScore || 0) - (left.outsider.shotsScore || 0);
    })
    .slice(0, 3);
}

function compareTeamLineup(currentTeam, previousTeam, currentPrediction, previousPrediction) {
  const currentStarters = currentTeam.players.filter(player => player.lineupStatus === "starter");
  const previousStarters = previousTeam?.players.filter(player => player.lineupStatus === "starter") || [];
  const currentIds = new Set(currentStarters.map(player => player.playerId || `source:${player.sourceId}`));
  const previousIds = new Set(previousStarters.map(player => player.playerId || `source:${player.sourceId}`));
  const previousAllById = new Map((previousTeam?.players || []).map(player => [player.playerId || `source:${player.sourceId}`, player]));
  const currentAllById = new Map(currentTeam.players.map(player => [player.playerId || `source:${player.sourceId}`, player]));
  const currentProjectionById = new Map((currentPrediction?.shooters?.allPlayers || []).map(player => [player.playerId, player]));
  const previousProjectionById = new Map((previousPrediction?.shooters?.allPlayers || []).map(player => [player.playerId, player]));
  const expectedMinutesChanges = [];
  for (const [playerId, currentPlayer] of currentProjectionById) {
    const previousPlayer = previousProjectionById.get(playerId);
    if (!previousPlayer) continue;
    const delta = round(currentPlayer.expectedMinutes - previousPlayer.expectedMinutes, 1);
    if (Math.abs(delta) >= 3) expectedMinutesChanges.push({
      playerId,
      name: currentPlayer.name,
      previous: previousPlayer.expectedMinutes,
      current: currentPlayer.expectedMinutes,
      delta,
    });
  }
  expectedMinutesChanges.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  const probabilityChanges = [];
  for (const [key, currentPlayer] of currentAllById) {
    const previousPlayer = previousAllById.get(key);
    if (!previousPlayer) continue;
    const delta = currentPlayer.probability - previousPlayer.probability;
    if (Math.abs(delta) >= 10) probabilityChanges.push({
      playerId: currentPlayer.playerId,
      name: currentPlayer.currentName || currentPlayer.sourceName,
      previous: previousPlayer.probability,
      current: currentPlayer.probability,
      delta,
    });
  }
  probabilityChanges.sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  return {
    team: currentTeam.team,
    teamId: currentTeam.teamId,
    formation: { previous: previousTeam?.formation || null, current: currentTeam.formation, changed: previousTeam ? previousTeam.formation !== currentTeam.formation : null },
    updatedAt: currentTeam.updatedAt,
    starters: currentStarters.map(player => ({ playerId: player.playerId, name: player.currentName || player.sourceName, probability: player.probability })),
    entered: currentStarters.filter(player => !previousIds.has(player.playerId || `source:${player.sourceId}`)).map(player => ({ playerId: player.playerId, name: player.currentName || player.sourceName, probability: player.probability })),
    exited: previousStarters.filter(player => !currentIds.has(player.playerId || `source:${player.sourceId}`)).map(player => ({ playerId: player.playerId, name: player.currentName || player.sourceName, probability: player.probability })),
    starterProbabilityChanges: probabilityChanges,
    expectedMinutesChanges,
  };
}

function comparePlayers(currentFixture, previousFixture) {
  const current = currentFixture.shooters.allPlayers;
  const previous = previousFixture?.shooters?.allPlayers || [];
  const previousById = new Map(previous.map(player => [player.playerId, player]));
  const currentIds = new Set(current.map(player => player.playerId));
  const rows = [];
  for (const player of current) {
    const old = previousById.get(player.playerId);
    if (!old) {
      rows.push({ matchId: currentFixture.matchId, playerId: player.playerId, player: player.name, team: player.team, status: "ENTERED_XI", previous: null, current: { expectedMinutes: player.expectedMinutes, shotProbabilities: player.shotProbabilities, shotOnTargetProbabilities: player.shotOnTargetProbabilities }, maxProbabilityDeltaPp: null });
      continue;
    }
    const deltas = {
      expectedMinutes: round(player.expectedMinutes - old.expectedMinutes, 1),
      shots1PlusPp: round((player.shotProbabilities.over05 - old.shotProbabilities.over05) * 100, 2),
      shots2PlusPp: round((player.shotProbabilities.over15 - old.shotProbabilities.over15) * 100, 2),
      shots3PlusPp: round((player.shotProbabilities.over25 - old.shotProbabilities.over25) * 100, 2),
      sot1PlusPp: round((player.shotOnTargetProbabilities.over05 - old.shotOnTargetProbabilities.over05) * 100, 2),
      sot2PlusPp: round((player.shotOnTargetProbabilities.over15 - old.shotOnTargetProbabilities.over15) * 100, 2),
    };
    const maxProbabilityDeltaPp = Math.max(...Object.entries(deltas).filter(([key]) => key !== "expectedMinutes").map(([, value]) => Math.abs(value)));
    if (maxProbabilityDeltaPp >= 0.1 || Math.abs(deltas.expectedMinutes) >= 0.5) rows.push({
      matchId: currentFixture.matchId,
      playerId: player.playerId,
      player: player.name,
      team: player.team,
      status: "COMMON",
      previous: { expectedMinutes: old.expectedMinutes, shotProbabilities: old.shotProbabilities, shotOnTargetProbabilities: old.shotOnTargetProbabilities },
      current: { expectedMinutes: player.expectedMinutes, shotProbabilities: player.shotProbabilities, shotOnTargetProbabilities: player.shotOnTargetProbabilities },
      deltas,
      maxProbabilityDeltaPp: round(maxProbabilityDeltaPp, 2),
    });
  }
  for (const player of previous) {
    if (!currentIds.has(player.playerId)) rows.push({ matchId: currentFixture.matchId, playerId: player.playerId, player: player.name, team: player.team, status: "EXITED_XI", previous: { expectedMinutes: player.expectedMinutes, shotProbabilities: player.shotProbabilities, shotOnTargetProbabilities: player.shotOnTargetProbabilities }, current: null, maxProbabilityDeltaPp: null });
  }
  return rows;
}

function table(headers, rows) {
  const escape = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}

function formatNames(rows) {
  return rows?.length ? rows.map(row => row.name).join(", ") : "nessuno";
}

function formatAvailability(rows) {
  return rows?.length ? rows.map(row => `${row.name}${row.description ? ` (${row.description})` : ""}`).join("; ") : "nessuno";
}

function renderFixture(fixture, index) {
  const lines = [`## ${index + 1}. ${fixture.matchLabel}`, "", `Kick-off: ${fixture.startsAt}. Probabili aggiornate: ${fixture.lineupUpdatedAt}.`, "", "### A. Formazioni", ""];
  lines.push(table(
    ["Squadra", "Modulo prima → ora", "XI aggiornato", "Entrati", "Usciti"],
    fixture.lineupComparison.map(team => [
      team.team,
      `${team.formation.previous || "N/D"} → ${team.formation.current}${team.formation.changed ? " (cambio)" : ""}`,
      team.starters.map(player => `${player.name} ${player.probability}%`).join(", "),
      formatNames(team.entered),
      formatNames(team.exited),
    ])
  ));
  lines.push("");
  for (const team of fixture.lineupComparison) {
    const availability = fixture.availability.teams[team.teamId] || {};
    const changes = fixture.availabilityChanges[team.teamId] || { added: [], removed: [] };
    lines.push(`- ${team.team}: squalificati ${formatAvailability(availability.suspended)}; infortunati/assenti ${formatAvailability(availability.injured)}; in dubbio ${formatAvailability(availability.doubts)}.`);
    if (team.starterProbabilityChanges.length) lines.push(`  Variazioni titolarità ≥10 pp: ${team.starterProbabilityChanges.map(row => `${row.name} ${row.previous}%→${row.current}% (${row.delta > 0 ? "+" : ""}${row.delta} pp)`).join("; ")}.`);
    if (changes.added.length || changes.removed.length) lines.push(`  Stato disponibilità vs 3 ottobre: aggiunti ${changes.added.length ? changes.added.map(row => `${row.name} [${row.category}]`).join(", ") : "nessuno"}; rimossi ${changes.removed.length ? changes.removed.map(row => `${row.name} [${row.category}]`).join(", ") : "nessuno"}.`);
  }
  lines.push("");
  lines.push(`Matching/identità: ${fixture.identityIssues.length ? fixture.identityIssues.map(issue => `${issue.team}: ${issue.name} (${issue.status})`).join("; ") : "nessun titolare non collegato"}. Riserve fuori rosa conservate come diagnostica: ${fixture.omittedNonRoster.length}.`);
  lines.push("");
  lines.push("### B. Tiri totali", "");
  lines.push(table(
    ["Giocatore", "Squadra", "Min", "λ tiri", "1+", "2+", "3+", "Affidabilità"],
    fixture.bestShots.map(player => [player.name, player.team, round(player.expectedMinutes, 1), round(player.projectedShots, 2), percent(player.shotProbabilities.over05), percent(player.shotProbabilities.over15), percent(player.shotProbabilities.over25), player.reliability.level])
  ));
  lines.push("", "### C. Tiri in porta", "");
  lines.push(table(
    ["Giocatore", "Squadra", "Min", "λ SOT", "1+", "2+", "Sisal 1+", "Compatibilità"],
    fixture.bestSot.map(player => [player.name, player.team, round(player.expectedMinutes, 1), round(player.projectedShotsOnTarget, 2), percent(player.shotOnTargetProbabilities.over05), percent(player.shotOnTargetProbabilities.over15), player.sisal.sot1Plus.odds || "N/D", player.sisal.sot1Plus.presence ? "NO: DUO + pali/traverse + TS" : "N/D"])
  ));
  lines.push("", "### D. Outsider", "");
  if (!fixture.outsiders.length) lines.push("Nessun outsider supera un supporto dati minimo; nessuna scelta forzata.");
  else lines.push(table(
    ["Giocatore", "Ruolo", "Min", "1+ tiri", "1+ SOT", "Gate V2", "Motivo"],
    fixture.outsiders.map(player => [
      player.name,
      `${player.role}${player.detailedRole ? ` · ${player.detailedRole}` : ""}`,
      round(player.expectedMinutes, 1),
      percent(player.shotProbabilities.over05),
      percent(player.shotOnTargetProbabilities.over05),
      player.outsider.qualifiedShots || player.outsider.qualifiedSot ? "QUALIFICATO" : "WATCH, non qualificato",
      `score tiri ${round(player.outsider.shotsScore, 1) ?? "N/D"}; ${player.reliability.rationale}`,
    ])
  ));
  lines.push("", "### E. Rischi", "");
  lines.push(`- Minuti/sostituzioni: ${fixture.risks.highSubstitutionPlayers.length} profili ad alto rischio; più rilevanti ${fixture.risks.highSubstitutionPlayers.slice(0, 5).map(player => `${player.name} (${round(player.expectedMinutes, 1)}')`).join(", ") || "nessuno"}.`);
  lines.push(`- Fallback/maturity: ${fixture.risks.fallbackPlayers.length} fallback; segnali low/unknown ${fixture.risks.lowMaturityPlayers.length}.`);
  lines.push(`- Matchup: ${fixture.risks.lowMatchupConfidencePlayers.length} giocatori con profilo squadra low o medium-low; il fattore resta quello canonico, non ricalcolato nel report.`);
  lines.push(`- Sisal: quote mancanti sui due focus ${fixture.risks.missingSisalLinks}; identità da rivedere ${fixture.risks.sisalIdentityReviews}${fixture.risks.sisalIdentityReviewPlayers.length ? ` (${fixture.risks.sisalIdentityReviewPlayers.join("; ")})` : ""}. Tutte le quote verificate sono incompatibili con il target individuale V2.`);
  lines.push(`- Dati partita: ${fixture.dataQuality.missing.join("; ")}. Cutoff leakage: MD${fixture.futureDataDiagnostics.dataCutoff.matchdayExclusive} esclusa, solo gare concluse.`);
  if (fixture.expectedMinutesChanges.length) lines.push(`- Expected Minutes variati ≥3: ${fixture.expectedMinutesChanges.map(row => `${row.name} ${row.previous}→${row.current} (${row.delta > 0 ? "+" : ""}${row.delta})`).join("; ")}.`);
  lines.push("", "### F. Selezione", "");
  if (!fixture.selections.length) lines.push("Dati insufficienti: nessuna selezione forzata.");
  else lines.push(table(
    ["Giocatore", "Squadra", "Mercato", "P V2 individuale", "Quota Sisal", "P implicita grezza", "Min", "Motivazione", "Compatibilità", "Affidabilità"],
    fixture.selections.map(selection => [
      selection.player,
      selection.team,
      selection.market,
      percent(selection.individualV2Probability),
      selection.sisalOdds || "N/D",
      percent(selection.rawImpliedProbability),
      round(selection.expectedMinutes, 1),
      selection.technicalReason,
      selection.compatibility,
      `${selection.reliability.level}: ${selection.reliability.rationale}`,
    ])
  ));
  lines.push("", "Nota: nessun EV certificato è calcolato; P V2 è individuale, mentre Sisal quota giocatore + sostituto e, sui SOT, include pali/traverse e tempi supplementari.", "");
  return lines.join("\n");
}

function renderMarkdown(report) {
  const lines = [
    "# Serie A MD6 — Analisi operativa finale Player Market V2",
    "",
    `Generato: ${report.generatedAt}. Modello ${report.model.engineVersion}, Player Market V${report.model.playerMarketModelVersion}.`,
    "",
    "## Esito operativo",
    "",
    `- Probabili Fantacalcio importate il ${report.sources.lineups.importedAt}; copertura ${report.sources.lineups.teams}/20 squadre, ${report.sources.lineups.starters} titolari, ${report.sources.lineups.unmatched} non collegati.`,
    `- Operativa MD6 rigenerata il ${report.sources.predictions.generatedAt}: ${report.summary.matchesAnalyzed}/10 partite, ${report.summary.playersAnalyzed} giocatori di movimento.`,
    `- Sisal recuperata il ${report.sources.sisal.retrievedAt}: matching ${report.summary.sisalMatching}; ${report.sisalAudit.linkedMarkets}/${report.sisalAudit.expectedLinks} mercati presenti, ${report.sisalAudit.verifiedIdentities} identità verificate, compatibilità individuale 0/${report.sisalAudit.verifiedIdentities}, perché i mercati sono DUO.`,
    `- Snapshot immutabili Player ed exact-score: ${report.integrity.immutablePlayerSnapshots.unchanged && report.integrity.exactScoreResearch.unchanged ? "invariati" : "ERRORE"}. Formule, coefficienti e Team Profiles: ${report.integrity.modelConfigurationUnchanged ? "invariati" : "ERRORE"}.`,
    "",
    "## Regole di lettura Sisal",
    "",
    "La probabilità V2 riportata è sempre del singolo titolare e dipende dai suoi Expected Minutes. La probabilità implicita grezza è solo `1/quota` e non viene confrontata come target equivalente: Sisal 28507 somma tiri di giocatore e sostituto e include i supplementari; Sisal 28506 aggiunge anche pali e traverse. Il rischio sostituzione aumenta quindi la distanza semantica tra i due target. Nessuna quota più bassa è trattata automaticamente come più sicura e nessun EV è certificato.",
    "",
    table(
      ["Partita", "Mercati focus mancanti", "Identità da rivedere"],
      report.fixtures.map(fixture => [
        fixture.matchLabel,
        fixture.risks.missingSisalLinks,
        fixture.risks.sisalIdentityReviewPlayers.length ? fixture.risks.sisalIdentityReviewPlayers.join("; ") : "nessuna",
      ])
    ),
    "",
    "## Confronto importazione 3 → 9 ottobre",
    "",
    table(
      ["Partita", "Squadra", "Modulo", "Entrati XI", "Usciti XI", "Δ titolarità ≥10 pp", "Δ minuti ≥3"],
      report.fixtures.flatMap(fixture => fixture.lineupComparison.map(team => [
        fixture.matchLabel,
        team.team,
        `${team.formation.previous || "N/D"} → ${team.formation.current}`,
        formatNames(team.entered),
        formatNames(team.exited),
        team.starterProbabilityChanges.length ? team.starterProbabilityChanges.map(row => `${row.name} ${row.delta > 0 ? "+" : ""}${row.delta}`).join("; ") : "nessuna",
        team.expectedMinutesChanges.length ? team.expectedMinutesChanges.map(row => `${row.name} ${row.delta > 0 ? "+" : ""}${row.delta}`).join("; ") : "nessuna",
      ]))
    ),
    "",
    ...report.fixtures.map(renderFixture),
    "## Variazioni operative più ampie vs 3 ottobre",
    "",
    table(
      ["Giocatore", "Partita", "Stato", "Δ Min", "Δ 1+ tiri", "Δ 2+ tiri", "Δ 3+ tiri", "Δ 1+ SOT", "Δ 2+ SOT"],
      report.comparison.largestChanges.map(row => [
        row.player,
        row.matchLabel,
        row.status,
        row.deltas?.expectedMinutes ?? "N/D",
        pp(row.deltas?.shots1PlusPp),
        pp(row.deltas?.shots2PlusPp),
        pp(row.deltas?.shots3PlusPp),
        pp(row.deltas?.sot1PlusPp),
        pp(row.deltas?.sot2PlusPp),
      ])
    ),
    "",
    "## Riepilogo finale selezioni",
    "",
    table(
      ["Partita", "Giocatore", "Squadra", "Mercato", "P V2", "Quota Sisal", "Min", "Compatibilità", "Affidabilità"],
      report.fixtures.flatMap(fixture => fixture.selections.map(selection => [fixture.matchLabel, selection.player, selection.team, selection.market, percent(selection.individualV2Probability), selection.sisalOdds || "N/D", round(selection.expectedMinutes, 1), selection.compatibility, selection.reliability.level]))
    ),
    "",
    "## Verifiche e integrità",
    "",
    table(
      ["Controllo", "Esito", "Evidenza"],
      [
        ["Matching probabili", report.verification.lineupMatching ? "PASS" : "FAILED", `${report.sources.lineups.linkedPlayers}/${report.sources.lineups.players} collegati; unmatched ${report.sources.lineups.unmatched}`],
        ["Expected Minutes", report.verification.expectedMinutes ? "PASS" : "FAILED", `${report.summary.playersAnalyzed} valori finiti in [0,90]`],
        ["Probabilità", report.verification.probabilities ? "PASS" : "FAILED", "1+/2+/3+ tiri e 1+/2+ SOT in [0,1], monotone"],
        ["No leakage", report.verification.noLeakage ? "PASS" : "FAILED", "matchdayExclusive=6, completedOnly=true, output antecedente ai kick-off"],
        ["Configurazione modello", report.integrity.modelConfigurationUnchanged ? "PASS" : "FAILED", "versioni, pesi, formula Player Market e Team Profile invariati vs HEAD"],
        ["Snapshot Player", report.integrity.immutablePlayerSnapshots.unchanged ? "PASS" : "FAILED", report.integrity.immutablePlayerSnapshots.after.sha256],
        ["Snapshot exact-score", report.integrity.exactScoreResearch.unchanged ? "PASS" : "FAILED", report.integrity.exactScoreResearch.after.sha256],
        ["Card V2 / Champions", report.integrity.otherProtectedUnchanged ? "PASS" : "FAILED", "hash aggregati invariati durante la generazione"],
      ]
    ),
    "",
    "## Stato finale",
    "",
    `LATEST LINEUPS: ${report.status.latestLineups}`,
    "",
    `MD6 OPERATIONAL PREDICTIONS: ${report.status.operationalPredictions}`,
    "",
    `MATCHES ANALYZED: ${report.summary.matchesAnalyzed}/10`,
    "",
    `PLAYERS ANALYZED: ${report.summary.playersAnalyzed}`,
    "",
    `SISAL MATCHING: ${report.summary.sisalMatching}`,
    "",
    `IMMUTABLE PLAYER SNAPSHOTS: ${report.status.immutablePlayerSnapshots}`,
    "",
    `EXACT-SCORE SNAPSHOTS: ${report.status.exactScoreSnapshots}`,
    "",
    `PRODUCTION INTEGRITY: ${report.status.productionIntegrity}`,
    "",
    `READY FOR MATCH ANALYSIS: ${report.status.readyForMatchAnalysis}`,
    "",
  ];
  return lines.join("\n");
}

function stableModelConfiguration(predictions) {
  return JSON.stringify({
    engineVersion: predictions.engine?.version,
    playerMarketModelVersion: predictions.engine?.playerMarketModelVersion,
    teamMatchupProfileVersion: predictions.engine?.teamMatchupProfileVersion,
    weights: predictions.engine?.weights,
    playerMarketModel: predictions.engine?.playerMarketModel,
  });
}

function main() {
  const protectedBefore = captureProtected();
  const predictions = readJson(sourcePaths.predictions);
  const previousPredictions = readJsonFromHead("data/normalized/predictions.json");
  const lineups = readJson(sourcePaths.lineups);
  const previousLineups = readJsonFromHead("data/sources/probable-lineups-md6-2026-27.json");
  const rawLineups = fs.readFileSync(sourcePaths.rawLineups, "utf8");
  const previousRawLineups = readFromHead("data/raw/fantacalcio/probable-lineups-md6-2026-27.html");
  const odds = readJson(sourcePaths.odds);
  const fixtures = predictions.predictions.filter(fixture => fixture.matchId.endsWith("-md-06"));
  const previousFixtures = previousPredictions.predictions.filter(fixture => fixture.matchId.endsWith("-md-06"));
  const previousFixtureById = new Map(previousFixtures.map(fixture => [fixture.matchId, fixture]));
  const eventByMatchId = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
  const currentTeamById = new Map(lineups.teams.map(team => [team.teamId, team]));
  const previousTeamById = new Map(previousLineups.teams.map(team => [team.teamId, team]));
  const teamIdByName = new Map(lineups.teams.map(team => [normalize(team.team), team.teamId]));
  const availability = parseAvailability(rawLineups, odds.events, teamIdByName);
  const previousAvailability = parseAvailability(previousRawLineups, odds.events, teamIdByName);
  const lineupByPlayerId = new Map(lineups.teams.flatMap(team => team.players.filter(player => player.playerId).map(player => [player.playerId, player])));
  const allChanges = [];

  const reportFixtures = fixtures.map(fixture => {
    const event = eventByMatchId.get(fixture.matchId);
    if (!event) throw new Error(`Evento Sisal mancante per ${fixture.matchId}`);
    const previousFixture = previousFixtureById.get(fixture.matchId);
    const teamIds = [event.home.canonicalTeamId, event.away.canonicalTeamId];
    const compactPlayers = fixture.shooters.allPlayers.map(player => compactPlayer(player, lineupByPlayerId, event));
    const lineupComparison = teamIds.map(teamId => compareTeamLineup(currentTeamById.get(teamId), previousTeamById.get(teamId), fixture, previousFixture));
    const currentAvailability = availability[fixture.matchId] || { teams: {} };
    const oldAvailability = previousAvailability[fixture.matchId] || { teams: {} };
    const changes = Object.fromEntries(teamIds.map(teamId => [teamId, availabilityChanges(currentAvailability.teams[teamId], oldAvailability.teams[teamId])]));
    const matchLabel = `${event.home.name} - ${event.away.name}`;
    const playerChanges = comparePlayers(fixture, previousFixture).map(row => ({ ...row, matchLabel }));
    allChanges.push(...playerChanges);
    const expectedMinutesChanges = lineupComparison.flatMap(team => team.expectedMinutesChanges).sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
    const omittedNonRoster = lineups.omittedNonRoster.filter(player => teamIds.includes(player.teamId)).map(player => ({ team: player.team, name: player.sourceName, status: "OMITTED_NON_ROSTER", playerId: null }));
    const identityIssues = lineups.teams.filter(team => teamIds.includes(team.teamId)).flatMap(team => team.players.filter(player => player.lineupStatus === "starter" && !player.playerId).map(player => ({ team: team.team, name: player.sourceName, status: player.matchStatus, playerId: null })));
    return {
      matchId: fixture.matchId,
      matchLabel,
      startsAt: event.startsAt,
      lineupUpdatedAt: lineupComparison.map(team => `${team.team} ${team.updatedAt}`).join("; "),
      lineupComparison,
      availability: currentAvailability,
      availabilityChanges: changes,
      identityIssues,
      omittedNonRoster,
      dataQuality: fixture.dataQuality,
      futureDataDiagnostics: fixture.futureDataDiagnostics,
      players: compactPlayers,
      bestShots: [...compactPlayers].sort((left, right) => right.shotProbabilities.over15 - left.shotProbabilities.over15).slice(0, 6),
      bestSot: [...compactPlayers].sort((left, right) => right.shotOnTargetProbabilities.over05 - left.shotOnTargetProbabilities.over05).slice(0, 6),
      outsiders: selectOutsiders(compactPlayers),
      selections: chooseSelections(compactPlayers),
      expectedMinutesChanges: expectedMinutesChanges.slice(0, 10),
      risks: {
        highSubstitutionPlayers: compactPlayers.filter(player => player.substitutionRisk === "high").sort((left, right) => right.shotProbabilities.over05 - left.shotProbabilities.over05),
        fallbackPlayers: compactPlayers.filter(player => player.fallbackUsed),
        lowMaturityPlayers: compactPlayers.filter(player => ["low", "unknown"].includes(player.maturity.signalStatus)),
        lowMatchupConfidencePlayers: compactPlayers.filter(player => ["low", "medium-low", null].includes(player.matchup.profileConfidence)),
        missingSisalLinks: compactPlayers.reduce((count, player) => count + (player.sisal.shots1Plus.presence ? 0 : 1) + (player.sisal.sot1Plus.presence ? 0 : 1), 0),
        sisalIdentityReviews: compactPlayers.reduce((count, player) => count
          + (player.sisal.shots1Plus.presence && player.sisal.shots1Plus.identityStatus !== "VERIFIED" ? 1 : 0)
          + (player.sisal.sot1Plus.presence && player.sisal.sot1Plus.identityStatus !== "VERIFIED" ? 1 : 0), 0),
        sisalIdentityReviewPlayers: compactPlayers.flatMap(player => [
          ...(player.sisal.shots1Plus.presence && player.sisal.shots1Plus.identityStatus !== "VERIFIED" ? [`${player.name} / tiri: ${player.sisal.shots1Plus.variantName || "etichetta N/D"}`] : []),
          ...(player.sisal.sot1Plus.presence && player.sisal.sot1Plus.identityStatus !== "VERIFIED" ? [`${player.name} / SOT: ${player.sisal.sot1Plus.variantName || "etichetta N/D"}`] : []),
        ]),
      },
    };
  }).sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt) || left.matchId.localeCompare(right.matchId));

  const allPlayers = reportFixtures.flatMap(fixture => fixture.players);
  const linkedMarkets = allPlayers.length * 2;
  const presentMarkets = allPlayers.reduce((count, player) => count + (player.sisal.shots1Plus.presence ? 1 : 0) + (player.sisal.sot1Plus.presence ? 1 : 0), 0);
  const verifiedMarketIdentities = allPlayers.reduce((count, player) => count + (player.sisal.shots1Plus.identityStatus === "VERIFIED" ? 1 : 0) + (player.sisal.sot1Plus.identityStatus === "VERIFIED" ? 1 : 0), 0);
  const expectedMinutesValid = allPlayers.every(player => Number.isFinite(player.expectedMinutes) && player.expectedMinutes >= 0 && player.expectedMinutes <= 90);
  const probabilitiesValid = allPlayers.every(player => {
    const values = [player.shotProbabilities.over05, player.shotProbabilities.over15, player.shotProbabilities.over25, player.shotOnTargetProbabilities.over05, player.shotOnTargetProbabilities.over15];
    return values.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
      && player.shotProbabilities.over05 >= player.shotProbabilities.over15
      && player.shotProbabilities.over15 >= player.shotProbabilities.over25
      && player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15;
  });
  const noLeakage = reportFixtures.every(fixture => fixture.futureDataDiagnostics?.dataCutoff?.matchdayExclusive === 6
    && fixture.futureDataDiagnostics?.dataCutoff?.completedOnly === true
    && Date.parse(fixture.players.length ? predictions.generatedAt : "") < Date.parse(fixture.startsAt));
  const modelConfigurationUnchanged = stableModelConfiguration(predictions) === stableModelConfiguration(previousPredictions);
  const lineupMatching = lineups.coverage.unmatched === 0 && lineups.coverage.starters === 220 && reportFixtures.every(fixture => fixture.dataQuality.lineupResolved.complete && fixture.dataQuality.outfieldPlayersModeled.complete);
  const sisalMatching = presentMarkets === linkedMarkets && verifiedMarketIdentities === linkedMarkets ? "COMPLETE" : "PARTIAL";
  const largestChanges = allChanges
    .filter(row => row.status === "COMMON")
    .sort((left, right) => (right.maxProbabilityDeltaPp || 0) - (left.maxProbabilityDeltaPp || 0) || Math.abs(right.deltas?.expectedMinutes || 0) - Math.abs(left.deltas?.expectedMinutes || 0))
    .slice(0, 40);

  const baseReport = {
    schemaVersion: 1,
    reportType: "serie-a-md06-operational-player-analysis",
    generatedAt: new Date().toISOString(),
    scope: "MD6 operational regeneration only; no formula, coefficient, Team Profile, historical data or immutable snapshot changes.",
    sources: {
      lineups: { path: "data/sources/probable-lineups-md6-2026-27.json", provider: lineups.provider, sourceUrl: lineups.sourceUrl, importedAt: lineups.importedAt, previousImportedAt: previousLineups.importedAt, ...lineups.coverage },
      predictions: { path: "data/normalized/predictions.json", generatedAt: predictions.generatedAt, previousGeneratedAt: previousPredictions.generatedAt },
      sisal: { path: "data/normalized/odds/sisal/serie-a.json", retrievedAt: odds.retrievedAt, sourceUrl: odds.sourceUrl, events: odds.events.length },
    },
    model: {
      engineVersion: predictions.engine.version,
      playerMarketModelVersion: predictions.engine.playerMarketModelVersion,
      teamMatchupProfileVersion: predictions.engine.teamMatchupProfileVersion,
    },
    summary: {
      matchesAnalyzed: reportFixtures.length,
      playersAnalyzed: allPlayers.length,
      selections: reportFixtures.reduce((count, fixture) => count + fixture.selections.length, 0),
      sisalMatching,
      fallbackPlayers: allPlayers.filter(player => player.fallbackUsed).length,
    },
    sisalAudit: {
      expectedLinks: linkedMarkets,
      linkedMarkets: presentMarkets,
      verifiedIdentities: verifiedMarketIdentities,
      identityReviews: reportFixtures.flatMap(fixture => fixture.risks.sisalIdentityReviewPlayers.map(detail => ({ matchId: fixture.matchId, matchLabel: fixture.matchLabel, detail }))),
      compatibleIndividualTargets: 0,
      certifiedEvCalculated: false,
      marketRules: {
        "28507": ["PLAYER_PLUS_SUBSTITUTE", "EXTRA_TIME_INCLUDED"],
        "28506": ["PLAYER_PLUS_SUBSTITUTE", "POSTS_AND_CROSSBAR_INCLUDED", "EXTRA_TIME_INCLUDED"],
      },
    },
    comparison: {
      previousRevision: "HEAD",
      previousGeneratedAt: previousPredictions.generatedAt,
      changedPlayers: allChanges.length,
      largestChanges,
    },
    verification: {
      lineupMatching,
      expectedMinutes: expectedMinutesValid,
      probabilities: probabilitiesValid,
      noLeakage,
    },
    fixtures: reportFixtures,
  };

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify({ ...baseReport, integrity: { pendingFinalHashCheck: true } }, null, 2)}\n`);
  fs.writeFileSync(markdownPath, "Report in generazione; verifica hash protetti in corso.\n");

  const protectedAfter = captureProtected();
  const integrity = Object.fromEntries(Object.keys(protectedTargets).map(name => [name, {
    before: protectedBefore[name],
    after: protectedAfter[name],
    unchanged: protectedBefore[name].sha256 === protectedAfter[name].sha256,
  }]));
  integrity.modelConfigurationUnchanged = modelConfigurationUnchanged;
  integrity.otherProtectedUnchanged = ["cardResearchData", "cardResearchCode", "championsData", "championsCode", "teamProfiles"].every(name => integrity[name].unchanged);
  const productionIntegrity = Object.values(integrity).filter(value => value && typeof value === "object" && "unchanged" in value).every(value => value.unchanged)
    && modelConfigurationUnchanged && lineupMatching && expectedMinutesValid && probabilitiesValid && noLeakage;
  const ready = productionIntegrity && reportFixtures.length === 10 && allPlayers.length === 200;
  const report = {
    ...baseReport,
    integrity,
    status: {
      latestLineups: lineups.coverage.teams === 20 && lineups.coverage.starters === 220 ? "IMPORTED" : lineups.coverage.teams > 0 ? "PARTIAL" : "FAILED",
      operationalPredictions: reportFixtures.length === 10 && allPlayers.length === 200 ? "UPDATED" : "BLOCKED",
      immutablePlayerSnapshots: integrity.immutablePlayerSnapshots.unchanged ? "UNCHANGED" : "CHANGED",
      exactScoreSnapshots: integrity.exactScoreResearch.unchanged ? "UNCHANGED" : "CHANGED",
      productionIntegrity: productionIntegrity ? "PASS" : "FAILED",
      readyForMatchAnalysis: ready ? "YES" : "NO",
    },
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(report));
  console.log(JSON.stringify({
    markdownPath: path.relative(root, markdownPath).replace(/\\/g, "/"),
    jsonPath: path.relative(root, jsonPath).replace(/\\/g, "/"),
    status: report.status,
    summary: report.summary,
    sisalAudit: report.sisalAudit,
    integrity: {
      immutablePlayerSnapshots: report.integrity.immutablePlayerSnapshots.unchanged,
      exactScoreResearch: report.integrity.exactScoreResearch.unchanged,
      otherProtectedUnchanged: report.integrity.otherProtectedUnchanged,
      modelConfigurationUnchanged: report.integrity.modelConfigurationUnchanged,
    },
  }, null, 2));
}

main();
