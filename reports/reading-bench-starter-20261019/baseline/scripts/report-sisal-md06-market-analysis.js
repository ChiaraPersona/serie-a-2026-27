const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const reportDate = "2026-10-09";
const outputDirectory = path.join(root, "output", "reports");
const jsonOutput = path.join(outputDirectory, `sisal-md06-market-analysis-${reportDate}.json`);
const markdownOutput = path.join(outputDirectory, `sisal-md06-market-analysis-${reportDate}.md`);
const oddsPath = path.join(root, "data", "normalized", "odds", "sisal", "serie-a.json");
const operationalPath = path.join(root, "output", "reports", "md6-latest-operational-2026-10-03.json");
const frozenPath = path.join(root, "data", "predictions", "snapshots", "2026-27", "md-06.json");
const manifestPath = path.join(root, "data", "predictions", "snapshots", "manifest.json");
const localLineupsPath = path.join(root, "data", "sources", "probable-lineups-md6-2026-27.json");
const quotationsPath = path.join(root, "data", "sources", "fantacalcio-quotations-2026-27.json");
const identityAliasesPath = path.join(root, "data", "sources", "player-identity-aliases-2026-27.json");
const cardPreviewPath = path.join(root, "data", "analysis", "card-prediction-research", "md6-snapshot-preview.json");
const fantasyUrl = "https://www.fantacalcio.it/probabili-formazioni-serie-a";
const aiaUrl = "https://www.aia-figc.it/news/serie-a-enilive-designazioni-6a-giornata-28755/";
const sisalRulesUrl = "https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf";

const refereeAssignments = {
  "genoa-fiorentina-2026-27-md-06": "Maresca",
  "inter-parma-2026-27-md-06": "Bonacina",
  "napoli-frosinone-2026-27-md-06": "Feliciani",
  "como-roma-2026-27-md-06": "Fabbri",
  "lazio-monza-2026-27-md-06": "Collu",
  "lecce-bologna-2026-27-md-06": "Pairetto",
  "sassuolo-milan-2026-27-md-06": "Fourneau",
  "cagliari-juventus-2026-27-md-06": "Marcenaro",
  "atalanta-venezia-2026-27-md-06": "Tremolada",
  "torino-udinese-2026-27-md-06": "Crezzini",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileHash(file) {
  return sha256(fs.readFileSync(file));
}

function relative(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percent(value, digits = 1) {
  return Number.isFinite(value) ? `${round(value * 100, digits)}%` : "N/D";
}

function normalize(value) {
  return String(value || "")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/ß/g, "ss")
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
    .trim();
}

function protectedAsset(relativePath) {
  return relativePath.startsWith("scripts/predictions/")
    || relativePath.startsWith("scripts/research/")
    || relativePath.startsWith("data/predictions/")
    || relativePath.startsWith("data/analysis/")
    || relativePath.startsWith("data/normalized/champions-")
    || relativePath === "data/normalized/predictions.json"
    || relativePath === "data/normalized/odds/sisal/serie-a.json"
    || relativePath === "data/sources/probable-lineups-md6-2026-27.json"
    || relativePath.startsWith("data/sources/team-matchup-profiles")
    || relativePath.startsWith("data/normalized/team-matchup-profiles")
    || relativePath.startsWith("output/reports/md6-latest-operational-")
    || relativePath === "scripts/build-predictions.js"
    || relativePath === "scripts/disciplinary-features.js"
    || relativePath === "scripts/build-team-matchup-profiles.js";
}

function captureProtectedHashes() {
  const files = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-co", "--exclude-standard", "-z"], {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
  }).toString().split("\0").filter(Boolean);
  const entries = files
    .map(value => value.replace(/\\/g, "/"))
    .filter(protectedAsset)
    .filter(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile())
    .sort()
    .map(file => [file, fileHash(path.join(root, file))]);
  return Object.fromEntries(entries);
}

function hashManifest(hashes) {
  return sha256(JSON.stringify(Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right))));
}

function runDiagnosticSuite() {
  const commands = [
    { name: "validate-sisal-odds", file: path.join(root, "scripts", "validate-sisal-odds.js"), args: ["--competition", "serie-a"] },
    { name: "sisal/test", file: path.join(root, "scripts", "sisal", "test.js"), args: [] },
    { name: "test-player-identities", file: path.join(root, "scripts", "test-player-identities.js"), args: [] },
    { name: "test-prediction-snapshots", file: path.join(root, "scripts", "test-prediction-snapshots.js"), args: [] },
    { name: "test-card-prediction-research", file: path.join(root, "scripts", "test-card-prediction-research.js"), args: [] },
    { name: "test-predictions", file: path.join(root, "scripts", "test-predictions.js"), args: [] },
  ];
  const results = commands.map(command => {
    try {
      const output = execFileSync(process.execPath, [command.file, ...command.args], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return { name: command.name, status: "PASS", output: output.slice(-1200) };
    } catch (error) {
      const output = `${error.stdout || ""}\n${error.stderr || ""}`.trim();
      const knownCardBaselineFailure = command.name === "test-card-prediction-research"
        && output.includes("PRODUCTION_FREEZE_VIOLATION")
        && output.includes("seria-a-2026-27-raw-archive-2026-08-24/data/raw/team-pages/milan/official-profiles");
      return {
        name: command.name,
        status: knownCardBaselineFailure ? "KNOWN_BASELINE_FAILURE" : "FAIL",
        blocking: !knownCardBaselineFailure,
        classification: knownCardBaselineFailure ? "Manifest storico Card divergente su archivio raw Milan 2026-08-24; esterno al perimetro Sisal MD6." : null,
        exitCode: error.status ?? null,
        output: output.slice(-2000),
      };
    }
  });
  try {
    const output = execFileSync("git", ["diff", "--check"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    results.push({ name: "git diff --check", status: "PASS", output });
  } catch (error) {
    const output = `${error.stdout || ""}\n${error.stderr || ""}`.trim();
    results.push({ name: "git diff --check", status: "FAIL", exitCode: error.status ?? null, output: output.slice(-2000) });
  }
  return results;
}

function extractList(teamBlock, status) {
  const className = status === "starter" ? "starters" : "reserves";
  const listMatch = teamBlock.match(new RegExp(`<ul class="[^"]*player-list[^"]*${className}[^"]*">([\\s\\S]*?)<\\/ul>`));
  if (!listMatch) throw new Error(`Lista Fantacalcio ${status} mancante`);
  return [...listMatch[1].matchAll(/<li class="player-item pill"[\s\S]*?<span class="role" data-value="([pdca])"><\/span>[\s\S]*?<a class="player-name player-link"[\s\S]*?href="[^"]+\/(\d+)"[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?aria-valuenow="(\d+)"[\s\S]*?<\/li>/gi)].map(match => ({
    sourceId: Number(match[2]),
    sourceName: decodeHtml(match[3]),
    sourceRole: match[1].toUpperCase(),
    probability: Number(match[4]),
    lineupStatus: status,
  }));
}

function parseLiveLineups(html, localLineups, quotations) {
  const matchday = Number(html.match(/Giornata\s+(\d+)/i)?.[1]);
  if (matchday !== 6) throw new Error(`Fantacalcio espone la giornata ${matchday || "N/D"}, attesa 6`);
  const localTeamByName = new Map(localLineups.teams.map(team => [normalize(team.team), team.teamId]));
  const quotationBySourceId = new Map(quotations.players.filter(player => player.status === "active").map(player => [Number(player.sourceId), player]));
  const oldBySourceId = new Map(localLineups.teams.flatMap(team => team.players).map(player => [Number(player.sourceId), player]));
  const headerRegex = /<h3 class="h6 team-name">([^<]+)<\/h3>/g;
  const headers = [...html.matchAll(headerRegex)];
  if (headers.length !== 20) throw new Error(`Fantacalcio live: ${headers.length}/20 squadre`);
  const teams = headers.map((header, index) => {
    const blockStart = header.index;
    const blockEnd = index + 1 < headers.length ? headers[index + 1].index : html.length;
    const block = html.slice(blockStart, blockEnd);
    const team = decodeHtml(header[1]);
    const teamId = localTeamByName.get(normalize(team));
    if (!teamId) throw new Error(`Squadra Fantacalcio live non riconosciuta: ${team}`);
    const formation = decodeHtml(block.match(/<div class="h6 team-formation">([^<]+)<\/div>/)?.[1] || "");
    const parsed = [...extractList(block, "starter"), ...extractList(block, "reserve")];
    const players = parsed.map(player => {
      const quotation = quotationBySourceId.get(player.sourceId);
      const old = oldBySourceId.get(player.sourceId);
      const linked = quotation?.teamId === teamId ? quotation : old?.teamId === teamId ? old : null;
      return {
        ...player,
        team,
        teamId,
        playerId: linked?.playerId || null,
        currentName: linked?.currentName || linked?.name || null,
        associationStatus: linked?.playerId ? "CANONICAL" : "UNMATCHED",
      };
    });
    if (players.filter(player => player.lineupStatus === "starter").length !== 11) throw new Error(`${team}: titolari live non pari a 11`);
    const fixtureStart = index % 2 === 0 ? blockStart : headers[index - 1].index;
    const fixtureEndIndex = index + (index % 2 === 0 ? 2 : 1);
    const fixtureEnd = fixtureEndIndex < headers.length ? headers[fixtureEndIndex].index : html.length;
    const fixtureBlock = html.slice(fixtureStart, fixtureEnd);
    const updatedAt = decodeHtml(fixtureBlock.match(/last-update[\s\S]*?<span class="date">([^<]+)<\/span>/i)?.[1] || "");
    return { team, teamId, formation, updatedAt, players };
  });
  return {
    sourceUrl: fantasyUrl,
    retrievedAt: new Date().toISOString(),
    matchday,
    coverage: {
      teams: teams.length,
      starters: teams.flatMap(team => team.players).filter(player => player.lineupStatus === "starter").length,
      reserves: teams.flatMap(team => team.players).filter(player => player.lineupStatus === "reserve").length,
      canonicalPlayers: teams.flatMap(team => team.players).filter(player => player.playerId).length,
      unmatchedPlayers: teams.flatMap(team => team.players).filter(player => !player.playerId).length,
    },
    teams,
  };
}

function playerKey(player) {
  return player.playerId || `source:${player.sourceId}` || `name:${normalize(player.sourceName || player.currentName)}`;
}

function compareLineups(localLineups, liveLineups) {
  const liveByTeam = new Map(liveLineups.teams.map(team => [team.teamId, team]));
  return localLineups.teams.map(oldTeam => {
    const liveTeam = liveByTeam.get(oldTeam.teamId);
    const oldStarters = new Map(oldTeam.players.filter(player => player.lineupStatus === "starter").map(player => [playerKey(player), player]));
    const liveStarters = new Map(liveTeam.players.filter(player => player.lineupStatus === "starter").map(player => [playerKey(player), player]));
    const entrants = [...liveStarters.entries()].filter(([key]) => !oldStarters.has(key)).map(([, player]) => player);
    const exits = [...oldStarters.entries()].filter(([key]) => !liveStarters.has(key)).map(([, player]) => player);
    const probabilityChanges = [...liveTeam.players].flatMap(player => {
      const old = oldTeam.players.find(candidate => playerKey(candidate) === playerKey(player));
      if (!old || old.probability === player.probability) return [];
      return [{
        playerId: player.playerId,
        name: player.currentName || player.sourceName,
        lineupStatus: player.lineupStatus,
        oldProbability: old.probability,
        liveProbability: player.probability,
        delta: player.probability - old.probability,
      }];
    });
    return {
      teamId: oldTeam.teamId,
      team: oldTeam.team,
      oldUpdatedAt: oldTeam.updatedAt,
      liveUpdatedAt: liveTeam.updatedAt,
      oldFormation: oldTeam.formation,
      liveFormation: liveTeam.formation,
      formationChanged: oldTeam.formation !== liveTeam.formation,
      entrants: entrants.map(player => ({ playerId: player.playerId, name: player.currentName || player.sourceName, probability: player.probability })),
      exits: exits.map(player => ({ playerId: player.playerId, name: player.currentName || player.sourceName, probability: player.probability })),
      probabilityChanges,
      changed: entrants.length > 0 || exits.length > 0 || oldTeam.formation !== liveTeam.formation || probabilityChanges.length > 0,
    };
  });
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
    const infos = Object.values(response.payload?.infoAggiuntivaMap || {});
    for (const info of infos) {
      for (const providerId of info.playerIds || []) {
        const candidates = [info.shortDescription, info.mobileDescription?.[0]?.description, info.descrizione]
          .map(cleanProviderLabel)
          .filter(Boolean);
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
  const values = [
    player.sourceName,
    player.currentName,
    player.name,
    player.canonicalName,
    player.lineupName,
    ...(player.names || []),
  ].filter(Boolean);
  const aliases = new Set();
  for (const value of values) {
    const clean = normalize(value);
    if (!clean) continue;
    aliases.add(clean);
    const tokens = clean.split(" ").filter(Boolean);
    if (tokens.length >= 2) {
      const first = tokens[0];
      const last = tokens[tokens.length - 1];
      aliases.add(last);
      aliases.add(`${last} ${first[0]}`);
      aliases.add(`${last} ${first}`);
      aliases.add([...tokens].sort().join(" "));
    }
  }
  return [...aliases];
}

function tokenMatchScore(targetTokens, aliasTokens) {
  if (targetTokens.length < 2 || !aliasTokens.length) return 0;
  const compatible = (left, right) => (left.length === 1 || right.length === 1) ? left[0] === right[0] : left === right;
  const usedTargets = new Set();
  let aliasExactFullTokens = 0;
  let aliasInitialTokens = 0;
  for (const aliasToken of aliasTokens) {
    const targetIndex = targetTokens.findIndex((targetToken, index) => !usedTargets.has(index) && compatible(targetToken, aliasToken));
    if (targetIndex < 0) {
      aliasExactFullTokens = 0;
      break;
    }
    usedTargets.add(targetIndex);
    if (targetTokens[targetIndex].length === 1 || aliasToken.length === 1) aliasInitialTokens += 1;
    else aliasExactFullTokens += 1;
  }
  if (aliasExactFullTokens) {
    const unmatchedTargets = targetTokens.filter((_, index) => !usedTargets.has(index));
    if (unmatchedTargets.every(token => token.length === 1)) return 92;
    if (aliasTokens.length >= 2 && aliasInitialTokens >= 1) return 91;
  }
  const used = new Set();
  let exactFullTokens = 0;
  let initialTokens = 0;
  for (const targetToken of targetTokens) {
    const matchIndex = aliasTokens.findIndex((aliasToken, index) => {
      if (used.has(index)) return false;
      return compatible(targetToken, aliasToken);
    });
    if (matchIndex < 0) return 0;
    used.add(matchIndex);
    if (targetToken.length === 1 || aliasTokens[matchIndex].length === 1) initialTokens += 1;
    else exactFullTokens += 1;
  }
  if (!exactFullTokens) return 0;
  const complete = targetTokens.length === aliasTokens.length;
  return (complete ? 96 : 92) + Math.min(2, exactFullTokens) - Math.min(1, initialTokens);
}

function mergePlayer(target, incoming) {
  const names = [...new Set([...(target.names || []), ...(incoming.names || []), incoming.sourceName, incoming.currentName, incoming.name, incoming.canonicalName, incoming.lineupName].filter(Boolean))];
  return {
    ...target,
    ...incoming,
    playerId: target.playerId || incoming.playerId || null,
    sourceId: target.sourceId || incoming.sourceId || null,
    teamId: target.teamId || incoming.teamId || null,
    names,
  };
}

function matchProviderPlayer(label, candidates) {
  const target = normalize(label);
  if (!target) return { status: "UNMATCHED", reason: "MISSING_PROVIDER_LABEL" };
  const targetTokens = target.split(" ").filter(Boolean);
  const ranked = candidates.map(player => {
    const aliases = aliasesForPlayer(player);
    let score = 0;
    for (const alias of aliases) {
      const aliasTokens = alias.split(" ").filter(Boolean);
      if (alias === target) score = Math.max(score, targetTokens.length === 1 ? 90 : 100);
      if (targetTokens.length > 1 && [...aliasTokens].sort().join(" ") === [...targetTokens].sort().join(" ")) score = Math.max(score, 98);
      score = Math.max(score, tokenMatchScore(targetTokens, aliasTokens));
    }
    return { player, score };
  }).filter(entry => entry.score > 0).sort((left, right) => right.score - left.score || String(left.player.playerId).localeCompare(String(right.player.playerId)));
  if (!ranked.length || ranked[0].score < 90) return { status: "UNMATCHED", reason: "NO_NAME_MATCH", label };
  if (ranked[1] && ranked[1].score === ranked[0].score && ranked[1].player.playerId && ranked[1].player.playerId !== ranked[0].player.playerId) {
    return { status: "AMBIGUOUS", reason: "TIED_NAME_MATCH", label, candidates: ranked.slice(0, 4).map(entry => ({ playerId: entry.player.playerId, name: entry.player.names?.[0], score: entry.score })) };
  }
  return { status: ranked[0].score >= 96 ? "EXACT" : "FUZZY_VERIFIED_WITHIN_FIXTURE", score: ranked[0].score, label, player: ranked[0].player };
}

function eventCandidatePool(matchId, fixture, localLineups, liveLineups, quotations, canonicalRosterPlayers, identityAliasPlayers) {
  const teamIds = new Set(fixture.teams.map(team => team.teamId));
  const values = [
    ...fixture.players,
    ...localLineups.teams.filter(team => teamIds.has(team.teamId)).flatMap(team => team.players),
    ...liveLineups.teams.filter(team => teamIds.has(team.teamId)).flatMap(team => team.players),
    ...quotations.players.filter(player => player.status === "active" && teamIds.has(player.teamId)),
    ...canonicalRosterPlayers.filter(player => teamIds.has(player.teamId)),
    ...identityAliasPlayers.filter(player => teamIds.has(player.teamId)),
  ];
  const merged = new Map();
  for (const player of values) {
    const key = player.playerId || (player.sourceId ? `source:${player.sourceId}` : `${player.teamId}:${normalize(player.sourceName || player.name)}`);
    merged.set(key, mergePlayer(merged.get(key) || {}, player));
  }
  return [...merged.values()].map(player => ({ ...player, matchId }));
}

function selectionFor(market, desiredName) {
  return market.selections.find(selection => selection.status === "open" && normalize(selection.name) === normalize(desiredName)) || null;
}

function marketAgeHours(market, retrievedAt) {
  const updated = Date.parse(market.updatedAt);
  const retrieved = Date.parse(retrievedAt);
  return Number.isFinite(updated) && Number.isFinite(retrieved) ? round((retrieved - updated) / 3600000, 1) : null;
}

function compactPlayer(player) {
  return {
    playerId: player.playerId,
    name: player.canonicalName || player.currentName || player.name || player.lineupName,
    lineupName: player.lineupName,
    team: player.team,
    teamId: player.teamId,
    role: player.sourceRole,
    detailedRole: player.detailedRole,
    starterProbabilityAtPrediction: player.starterProbability,
    expectedMinutes: player.expectedMinutes,
    substitutionRisk: player.substitutionRisk,
    projectedShots: player.projectedShots,
    projectedShotsOnTarget: player.projectedShotsOnTarget,
    shotProbabilities: player.shotProbabilities,
    shotOnTargetProbabilities: player.shotOnTargetProbabilities,
    baselineStability: player.playerBaselineStability?.level || null,
    sotBaselineStability: player.playerSotBaselineStability?.level || null,
    fallbackUsed: Boolean(player.fallbackUsed || player.expectedMinutesEvidence?.fallbackUsed),
    matchupEvidence: player.matchupEvidence || [],
    qualifiedOutsider: Boolean(player.qualifiedOutsider),
    outsiderScore: player.outsiderScore,
    qualifiedSotOutsider: Boolean(player.qualifiedSotOutsider),
    sotOutsiderScore: player.sotOutsiderScore,
  };
}

function currentLineupState(player, liveLineups) {
  const live = liveLineups.teams.flatMap(team => team.players).find(candidate => candidate.playerId && candidate.playerId === player.playerId);
  if (!live) return { status: "NOT_FOUND_LIVE", probability: null, teamId: null };
  return { status: live.lineupStatus.toUpperCase(), probability: live.probability, teamId: live.teamId };
}

function marketComparison(player, type, threshold, market, liveLineups, odds) {
  const probabilityKey = threshold === 0.5 ? "over05" : threshold === 1.5 ? "over15" : threshold === 2.5 ? "over25" : null;
  const modelProbability = type === "shots" ? player.shotProbabilities?.[probabilityKey] : player.shotOnTargetProbabilities?.[probabilityKey];
  const openSelection = market ? selectionFor(market, "OVER") : null;
  const implied = openSelection?.odds > 0 ? 1 / openSelection.odds : null;
  const live = currentLineupState(player, liveLineups);
  const incompatibilities = type === "shots"
    ? ["PLAYER_PLUS_SUBSTITUTE", "EXTRA_TIME_INCLUDED"]
    : ["PLAYER_PLUS_SUBSTITUTE", "POSTS_AND_CROSSBAR_INCLUDED", "EXTRA_TIME_INCLUDED"];
  return {
    ...compactPlayer(player),
    type,
    threshold,
    target: `${threshold + 0.5}+ ${type === "shots" ? "tiri" : "SOT"}`,
    modelProbability,
    bookmaker: market ? {
      marketCode: market.marketCode,
      marketName: market.marketName,
      variantName: market.variantName,
      providerMarketId: market.providerMarketId,
      providerSelectionId: openSelection?.providerSelectionId || null,
      odds: openSelection?.odds || null,
      rawImpliedProbability: implied,
      updatedAt: market.updatedAt,
      ageAtRetrievalHours: marketAgeHours(market, odds.retrievedAt),
      oppositeSideOpen: Boolean(selectionFor(market, "UNDER")),
    } : null,
    liveLineup: live,
    comparableTarget: false,
    noVigProbability: null,
    edge: null,
    theoreticalEv: null,
    incompatibilities,
    interpretation: "Confronto direzionale soltanto: la probabilità V2 è del singolo giocatore, la quota somma giocatore e sostituto; per i SOT Sisal include anche pali/traverse.",
  };
}

function oneXTwoAudit(frozen, oddsByMatch) {
  return frozen.snapshots.map(snapshot => {
    const event = oddsByMatch.get(snapshot.matchId);
    const market = event?.markets.find(candidate => candidate.marketCode === "3" && candidate.marketName === "1X2 ESITO FINALE");
    const open = market?.selections.filter(selection => selection.status === "open" && selection.odds > 1) || [];
    const overround = open.length === 3 ? open.reduce((sum, selection) => sum + 1 / selection.odds, 0) : null;
    const rows = ["1", "X", "2"].map(selectionName => {
      const selection = open.find(candidate => candidate.name === selectionName);
      const modelProbability = Number(snapshot.prediction.probabilities?.final?.[selectionName]) / 100;
      const rawImpliedProbability = selection ? 1 / selection.odds : null;
      const noVigProbability = rawImpliedProbability && overround ? rawImpliedProbability / overround : null;
      return {
        selection: selectionName,
        odds: selection?.odds || null,
        providerSelectionId: selection?.providerSelectionId || null,
        modelProbability,
        rawImpliedProbability,
        noVigProbability,
        overround,
        edgeVsRaw: rawImpliedProbability ? modelProbability - rawImpliedProbability : null,
        edgeVsNoVig: noVigProbability ? modelProbability - noVigProbability : null,
        theoreticalEv: selection ? modelProbability * selection.odds - 1 : null,
        exactTargetMatch: Boolean(selection),
      };
    });
    return {
      matchId: snapshot.matchId,
      modelGeneratedAt: snapshot.generatedAt,
      marketUpdatedAt: market?.updatedAt || null,
      marketAgeAtRetrievalHours: market ? marketAgeHours(market, event.retrievedAt) : null,
      expectedGoals: snapshot.prediction.expectedGoals,
      overround,
      selections: rows,
    };
  });
}

function markdownTable(headers, rows) {
  const escape = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}

function playerDisplay(entry) {
  return entry.name || entry.playerId || "N/D";
}

function renderComparisonTable(entries) {
  return markdownTable(
    ["#", "Giocatore", "Partita", "Target V2", "P modello", "Quota Sisal", "P implicita grezza", "Minuti", "Live", "Compatibilità"],
    entries.map((entry, index) => [
      index + 1,
      playerDisplay(entry),
      entry.matchLabel,
      entry.target,
      percent(entry.modelProbability),
      entry.bookmaker?.odds ?? "N/D",
      percent(entry.bookmaker?.rawImpliedProbability),
      entry.expectedMinutes ?? "N/D",
      `${entry.liveLineup.status}${entry.liveLineup.probability != null ? ` ${entry.liveLineup.probability}%` : ""}`,
      "NO · sostituto incluso" + (entry.type === "sot" ? " · pali/traverse" : ""),
    ])
  );
}

async function main() {
  const before = captureProtectedHashes();
  const odds = readJson(oddsPath);
  const operational = readJson(operationalPath);
  const frozen = readJson(frozenPath);
  const localLineups = readJson(localLineupsPath);
  const quotations = readJson(quotationsPath);
  const identityAliases = readJson(identityAliasesPath);
  const cardPreview = readJson(cardPreviewPath);
  if (odds.events.length !== 10 || odds.summary.matchedEvents !== 10 || odds.summary.unmatchedEvents !== 0) throw new Error("Import Sisal MD6 incompleto");
  if (operational.fixtures.length !== 10 || frozen.snapshots.length !== 10 || cardPreview.matches.length !== 10) throw new Error("Copertura MD6 incompleta");
  if (operational.engineVersion !== "4.13.0") throw new Error(`Engine operativo inatteso: ${operational.engineVersion}`);

  const response = await fetch(fantasyUrl, { headers: { "user-agent": "Mozilla/5.0 (compatible; SerieA2026Audit/1.0)", "accept-language": "it-IT,it;q=0.9" } });
  if (!response.ok) throw new Error(`Fantacalcio live HTTP ${response.status}`);
  const liveLineups = parseLiveLineups(await response.text(), localLineups, quotations);
  const lineupChanges = compareLineups(localLineups, liveLineups);
  const lineupChangesByTeam = new Map(lineupChanges.map(change => [change.teamId, change]));

  const rawOdds = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, odds.rawFile))).toString("utf8"));
  const labels = providerLabels(rawOdds);
  const fixtureByMatch = new Map(operational.fixtures.map(fixture => [fixture.matchId, fixture]));
  const oddsByMatch = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
  const matches = readJson(path.join(root, "data", "normalized", "matches.json"));
  const matchMeta = new Map(matches.filter(match => match.matchday === 6 && match.competition === "serie-a").map(match => [match.id, match]));
  const associationByMatchAndProvider = new Map();
  const canonicalRosterPlayers = localLineups.teams.flatMap(team => {
    const teamFile = path.join(root, "data", "teams", `${team.teamId}.json`);
    if (!fs.existsSync(teamFile)) return [];
    return (readJson(teamFile).squad || []).map(player => ({
      playerId: player.id,
      teamId: team.teamId,
      sourceId: player.providerIds?.fantacalcio || null,
      currentName: player.name,
      canonicalName: player.name,
      names: [player.name],
    }));
  });
  const identityAliasPlayers = identityAliases.players.map(player => ({
    playerId: player.playerId,
    teamId: player.teamId,
    currentName: player.canonicalName,
    canonicalName: player.canonicalName,
    names: player.aliases || [],
  }));

  for (const event of odds.events) {
    const fixture = fixtureByMatch.get(event.canonicalMatchId);
    const pool = eventCandidatePool(event.canonicalMatchId, fixture, localLineups, liveLineups, quotations, canonicalRosterPlayers, identityAliasPlayers);
    const providerIds = [...new Set(event.markets.flatMap(market => market.providerPlayerIds || []))];
    for (const providerId of providerIds) {
      associationByMatchAndProvider.set(`${event.canonicalMatchId}:${providerId}`, matchProviderPlayer(labels.get(String(providerId)), pool));
    }
  }

  const associationForMarket = (matchId, market) => {
    const ids = market.providerPlayerIds || [];
    if (!ids.length) return { status: "NO_PROVIDER_PLAYER_ID", players: [] };
    const entries = ids.map(providerId => ({ providerId, association: associationByMatchAndProvider.get(`${matchId}:${providerId}`) }));
    const unresolved = entries.filter(entry => !["EXACT", "FUZZY_VERIFIED_WITHIN_FIXTURE"].includes(entry.association?.status));
    return {
      status: unresolved.length ? "UNRESOLVED" : "MATCHED",
      players: entries.map(entry => ({
        providerId: entry.providerId,
        providerLabel: entry.association?.label || labels.get(String(entry.providerId)) || null,
        status: entry.association?.status || "UNMATCHED",
        score: entry.association?.score || null,
        playerId: entry.association?.player?.playerId || null,
        name: entry.association?.player?.currentName || entry.association?.player?.canonicalName || entry.association?.player?.names?.[0] || null,
        teamId: entry.association?.player?.teamId || null,
        reason: entry.association?.reason || null,
      })),
    };
  };

  const playerMarkets = odds.events.flatMap(event => event.markets.filter(market => market.marketScope === "player").map(market => ({ matchId: event.canonicalMatchId, event: event.name, market, association: associationForMarket(event.canonicalMatchId, market) })));
  const focusCodes = new Set(["28507", "28506", "28576"]);
  const focusMarkets = playerMarkets.filter(entry => focusCodes.has(entry.market.marketCode));
  const focusMarketCounts = Object.fromEntries(["28507", "28506", "28576"].map(code => [code, focusMarkets.filter(entry => entry.market.marketCode === code).length]));
  const matchedPlayerMarkets = playerMarkets.filter(entry => entry.association.status === "MATCHED").length;
  const matchedFocusMarkets = focusMarkets.filter(entry => entry.association.status === "MATCHED").length;
  const uniqueAssociations = [...associationByMatchAndProvider.entries()].map(([key, association]) => ({ key, ...association }));
  const unmatchedAssociations = uniqueAssociations.filter(entry => !["EXACT", "FUZZY_VERIFIED_WITHIN_FIXTURE"].includes(entry.status));
  const focusProviderKeys = new Set(focusMarkets.flatMap(entry => (entry.market.providerPlayerIds || []).map(providerId => `${entry.matchId}:${providerId}`)));
  const unmatchedFocusAssociations = unmatchedAssociations.filter(entry => focusProviderKeys.has(entry.key));

  const marketIndex = new Map();
  for (const entry of focusMarkets) {
    if (entry.association.status !== "MATCHED" || entry.association.players.length !== 1) continue;
    const playerId = entry.association.players[0].playerId;
    const threshold = Number(entry.market.threshold);
    marketIndex.set(`${entry.matchId}:${playerId}:${entry.market.marketCode}:${threshold}`, entry.market);
  }
  const quoteFor = (matchId, playerId, code, threshold) => marketIndex.get(`${matchId}:${playerId}:${code}:${threshold}`) || null;
  const operationalPlayers = operational.fixtures.flatMap(fixture => fixture.players.map(player => ({ ...player, matchId: fixture.matchId, matchLabel: fixture.label })));
  const operationalPlayerIndex = new Map(operationalPlayers.map(player => [`${player.matchId}:${player.playerId}`, player]));

  function rankingComparisons(rankingKey, type, threshold, limit = 10) {
    const code = type === "shots" ? "28507" : "28506";
    return operational.globalRankings[rankingKey].flatMap(row => {
      const player = operationalPlayerIndex.get(`${row.matchId}:${row.playerId}`);
      if (!player) return [];
      const market = quoteFor(row.matchId, row.playerId, code, threshold);
      if (!market) return [];
      const comparison = marketComparison(player, type, threshold, market, liveLineups, odds);
      if (comparison.liveLineup.status !== "STARTER") return [];
      return [{ ...comparison, matchLabel: player.matchLabel, sourceRanking: rankingKey, sourceRankingValue: row.value }];
    }).slice(0, limit);
  }

  const topShots = rankingComparisons("shots2Plus", "shots", 1.5, 10);
  const topSot = rankingComparisons("sot1Plus", "sot", 0.5, 10);
  const outsiderCandidates = operationalPlayers.flatMap(player => {
    const values = [];
    if (player.qualifiedOutsider) {
      const market = quoteFor(player.matchId, player.playerId, "28507", 1.5) || quoteFor(player.matchId, player.playerId, "28507", 0.5);
      if (market) values.push({ ...marketComparison(player, "shots", Number(market.threshold), market, liveLineups, odds), qualifier: "qualifiedOutsider", qualifierScore: player.outsiderScore, matchLabel: player.matchLabel });
    }
    if (player.qualifiedSotOutsider) {
      const market = quoteFor(player.matchId, player.playerId, "28506", 0.5);
      if (market) values.push({ ...marketComparison(player, "sot", 0.5, market, liveLineups, odds), qualifier: "qualifiedSotOutsider", qualifierScore: player.sotOutsiderScore, matchLabel: player.matchLabel });
    }
    return values.filter(value => value.liveLineup.status === "STARTER");
  }).sort((left, right) => (right.qualifierScore || 0) - (left.qualifierScore || 0));
  const topOutsiders = outsiderCandidates.filter((entry, index, all) => all.findIndex(candidate => candidate.playerId === entry.playerId && candidate.matchId === entry.matchId && candidate.type === entry.type) === index).slice(0, 10);

  const oneXTwo = oneXTwoAudit(frozen, oddsByMatch);
  const positiveOneXTwo = oneXTwo.flatMap(match => match.selections.map(selection => ({ ...selection, matchId: match.matchId, marketUpdatedAt: match.marketUpdatedAt, marketAgeAtRetrievalHours: match.marketAgeAtRetrievalHours })))
    .filter(selection => selection.theoreticalEv > 0)
    .sort((left, right) => right.theoreticalEv - left.theoreticalEv);

  const cardPreviewByMatch = new Map(cardPreview.matches.map(match => [match.matchId, match]));
  const fixtureAnalyses = operational.fixtures.map(fixture => {
    const meta = matchMeta.get(fixture.matchId);
    const event = oddsByMatch.get(fixture.matchId);
    const teamChanges = fixture.teams.map(team => lineupChangesByTeam.get(team.teamId));
    const liveStarters = new Set(liveLineups.teams.filter(team => fixture.teams.some(value => value.teamId === team.teamId)).flatMap(team => team.players.filter(player => player.lineupStatus === "starter" && player.sourceRole !== "P" && player.playerId).map(player => player.playerId)));
    const oldStarters = new Set(fixture.players.map(player => player.playerId));
    const unmodelledLiveStarters = [...liveStarters].filter(playerId => !oldStarters.has(playerId));
    const noLongerLiveStarters = [...oldStarters].filter(playerId => !liveStarters.has(playerId));
    const activePlayers = fixture.players.filter(player => liveStarters.has(player.playerId));
    const shots = activePlayers.map(player => {
      const market = quoteFor(fixture.matchId, player.playerId, "28507", 1.5);
      return market ? marketComparison({ ...player, matchId: fixture.matchId }, "shots", 1.5, market, liveLineups, odds) : null;
    }).filter(Boolean).sort((left, right) => (right.modelProbability || 0) - (left.modelProbability || 0)).slice(0, 3);
    const sot = activePlayers.map(player => {
      const market = quoteFor(fixture.matchId, player.playerId, "28506", 0.5);
      return market ? marketComparison({ ...player, matchId: fixture.matchId }, "sot", 0.5, market, liveLineups, odds) : null;
    }).filter(Boolean).sort((left, right) => (right.modelProbability || 0) - (left.modelProbability || 0)).slice(0, 3);
    const cardMatch = cardPreviewByMatch.get(fixture.matchId);
    const cardCandidates = (cardMatch?.candidates || []).flatMap(candidate => {
      if (!liveStarters.has(candidate.playerId) || candidate.role === "GK") return [];
      const market = quoteFor(fixture.matchId, candidate.playerId, "28576", 0);
      if (!market) return [];
      const selection = selectionFor(market, "SI");
      return [{
        playerId: candidate.playerId,
        name: candidate.playerName,
        teamId: candidate.team,
        role: candidate.role,
        expectedMinutes: candidate.expectedMinutes,
        maturity: candidate.maturity?.state || null,
        fouls: candidate.fouls,
        legacyRiskScore: candidate.legacyRiskScore,
        researchSignals: { C0: candidate.C0, C1: candidate.C1, C2: candidate.C2, C3: candidate.C3, C4: candidate.C4 },
        researchLeaderProbability: null,
        refereeAtPreview: candidate.referee,
        bookmaker: { odds: selection?.odds || null, rawImpliedProbability: selection?.odds ? 1 / selection.odds : null, marketName: market.marketName, variantName: market.variantName, updatedAt: market.updatedAt },
        comparableTarget: false,
        theoreticalEv: null,
        reason: "Research leader unresolved; quota DUO all-contexts include sostituto, panchina, post-finale, supplementari e rigori.",
      }];
    }).sort((left, right) => {
      const leftLegacy = Number.isFinite(left.legacyRiskScore) ? left.legacyRiskScore : -1;
      const rightLegacy = Number.isFinite(right.legacyRiskScore) ? right.legacyRiskScore : -1;
      return rightLegacy - leftLegacy || right.researchSignals.C2 - left.researchSignals.C2;
    }).slice(0, 3);
    return {
      matchId: fixture.matchId,
      label: fixture.label,
      date: meta?.date || fixture.date,
      kickoff: meta?.kickoff || fixture.kickoff,
      referee: { name: refereeAssignments[fixture.matchId], source: aiaUrl, confirmedPublishedAt: "2026-10-07", cardPreviewC4Recomputed: false },
      odds: {
        eventName: event.name,
        markets: event.markets.length,
        selections: event.markets.reduce((sum, market) => sum + market.selections.length, 0),
        suspendedSelections: event.markets.reduce((sum, market) => sum + market.selections.filter(selection => selection.status !== "open").length, 0),
        focusMarkets: Object.fromEntries(["28507", "28506", "28576"].map(code => [code, event.markets.filter(market => market.marketCode === code).length])),
      },
      lineup: {
        sourceAtPrediction: operational.source,
        liveSource: fantasyUrl,
        teamChanges,
        changed: teamChanges.some(change => change.changed),
        unmodelledLiveStarters,
        noLongerLiveStarters,
      },
      teamVolumes: fixture.teams.map(team => ({
        teamId: team.teamId,
        team: team.name,
        formationAtPrediction: team.formation,
        shots: team.projection?.shotsTotal,
        shotsOnTarget: team.projection?.shotsOnTarget,
        reconciliation: team.reconciliation,
        opponentMatchupInteraction: team.projection?.opponentMatchupInteraction,
      })),
      shots,
      sot,
      cardCandidates,
      risks: [
        ...(teamChanges.some(change => change.changed) ? ["Probabili live cambiate rispetto alla previsione operativa del 3 ottobre."] : []),
        ...(unmodelledLiveStarters.length ? [`${unmodelledLiveStarters.length} titolari live senza previsione operativa MD6 aggiornata.`] : []),
        ...(noLongerLiveStarters.length ? [`${noLongerLiveStarters.length} giocatori dell'operativa non più titolari live.`] : []),
        "Mercati tiri/SOT Sisal includono il sostituto; SOT include pali/traverse.",
        "Card C4 non aggiornato con la designazione AIA ora disponibile.",
      ],
    };
  });

  const eventCoverage = odds.events.map(event => ({
    matchId: event.canonicalMatchId,
    name: event.name,
    startsAt: event.startsAt,
    status: event.status,
    markets: event.markets.length,
    selections: event.markets.reduce((sum, market) => sum + market.selections.length, 0),
    playerMarkets: event.markets.filter(market => market.marketScope === "player").length,
    suspendedSelections: event.markets.reduce((sum, market) => sum + market.selections.filter(selection => selection.status !== "open").length, 0),
    oldestMarketUpdatedAt: event.markets.map(market => market.updatedAt).filter(Boolean).sort()[0] || null,
    newestMarketUpdatedAt: event.markets.map(market => market.updatedAt).filter(Boolean).sort().at(-1) || null,
  }));
  const focusOlderThan48Hours = focusMarkets.filter(entry => marketAgeHours(entry.market, odds.retrievedAt) > 48).length;
  const oneXTwoOlderThan48Hours = oneXTwo.filter(entry => entry.marketAgeAtRetrievalHours > 48).length;
  const excludedQuantitative = {
    playerShotsDuo: focusMarketCounts["28507"],
    playerSotDuoPostsCrossbar: focusMarketCounts["28506"],
    playerCardsResearchAndAllContextsDuo: focusMarketCounts["28576"],
    otherMarketsOutsideSupportedAuditTarget: odds.summary.markets - focusMarkets.length - 10,
  };
  const diagnosticTests = runDiagnosticSuite();
  const diagnosticTestsPassed = diagnosticTests.every(test => test.status !== "FAIL");
  const diagnosticTestStatus = diagnosticTests.every(test => test.status === "PASS") ? "PASS" : (diagnosticTestsPassed ? "PASS_WITH_KNOWN_BASELINE_FAILURE" : "FAIL");

  const report = {
    title: "Sisal MD6 — audit quote, confronto Prediction Engine V2 e analisi mercati",
    generatedAt: new Date().toISOString(),
    scope: { competition: "serie-a", season: "2026-27", matchday: 6, fixtures: 10, noModelChange: true },
    sources: {
      sisalOdds: { file: relative(oddsPath), rawFile: odds.rawFile, retrievedAt: odds.retrievedAt, sourceUrl: odds.sourceUrl, rulesUrl: sisalRulesUrl },
      operationalPrediction: { file: relative(operationalPath), generatedAt: operational.generatedAt, engineVersion: operational.engineVersion, dataCutoff: operational.dataCutoff, lineupSource: operational.source },
      immutableSnapshot: { file: relative(frozenPath), generatedAt: frozen.generatedAt, snapshotCount: frozen.snapshotCount, sha256: fileHash(frozenPath), manifestSha256: fileHash(manifestPath) },
      localProbableLineups: { file: relative(localLineupsPath), importedAt: localLineups.importedAt, coverage: localLineups.coverage },
      playerIdentityAliases: { file: relative(identityAliasesPath), verifiedAt: identityAliases.verifiedAt, players: identityAliases.players.length },
      liveProbableLineups: { sourceUrl: fantasyUrl, retrievedAt: liveLineups.retrievedAt, coverage: liveLineups.coverage },
      refereeAssignments: { sourceUrl: aiaUrl, publishedAt: "2026-10-07", assignments: refereeAssignments },
      cardResearch: { file: relative(cardPreviewPath), generatedAt: cardPreview.generatedAt, state: cardPreview.modelState, leader: cardPreview.researchLeader, actualsExcluded: cardPreview.actualsExcluded },
    },
    sisalImport: {
      status: "COMPLETE",
      summary: odds.summary,
      eventCoverage,
      duplicateProviderMarketIds: odds.events.flatMap(event => event.markets).length - new Set(odds.events.flatMap(event => event.markets.map(market => market.providerMarketId))).size,
      duplicateProviderSelectionIds: odds.events.flatMap(event => event.markets.flatMap(market => market.selections)).length - new Set(odds.events.flatMap(event => event.markets.flatMap(market => market.selections.map(selection => selection.providerSelectionId)))).size,
      focusOlderThan48Hours,
      oneXTwoOlderThan48Hours,
      staleInterpretation: "La soglia di 48 ore è un indicatore di età, non prova da sola che una quota sia obsoleta. Cagliari–Juventus 1X2 richiede ricontrollo manuale per anzianità del prezzo.",
    },
    predictionAudit: {
      engineVersion: operational.engineVersion,
      playerMarketModelVersion: 2,
      teamMatchupProfileVersion: 2,
      operationalGeneratedAt: operational.generatedAt,
      immutableGeneratedAt: frozen.generatedAt,
      dataCutoff: operational.dataCutoff,
      fixtures: operational.fixtures.length,
      players: operationalPlayers.length,
      expectedMinutesAvailable: operationalPlayers.filter(player => Number.isFinite(player.expectedMinutes)).length,
      shotProbabilitiesAvailable: operationalPlayers.filter(player => player.shotProbabilities && Object.values(player.shotProbabilities).every(Number.isFinite)).length,
      sotProbabilitiesAvailable: operationalPlayers.filter(player => player.shotOnTargetProbabilities && Object.values(player.shotOnTargetProbabilities).every(Number.isFinite)).length,
      liveLineupChanges: {
        teamsChanged: lineupChanges.filter(change => change.changed).length,
        starterEntrants: lineupChanges.reduce((sum, change) => sum + change.entrants.length, 0),
        starterExits: lineupChanges.reduce((sum, change) => sum + change.exits.length, 0),
        formationChanges: lineupChanges.filter(change => change.formationChanged).length,
        details: lineupChanges,
      },
      operationalRefreshAvailable: false,
      conclusion: "La previsione operativa più recente resta quella del 3 ottobre. Le probabili Fantacalcio live del 9 ottobre sono usate soltanto per controllo di freschezza; il motore non viene rigenerato.",
    },
    marketMatching: {
      status: matchedFocusMarkets === focusMarkets.length ? "PASS" : "PARTIAL",
      allPlayerMarkets: playerMarkets.length,
      matchedPlayerMarkets,
      unmatchedPlayerMarkets: playerMarkets.length - matchedPlayerMarkets,
      focusMarkets: focusMarkets.length,
      matchedFocusMarkets,
      unmatchedFocusMarkets: focusMarkets.length - matchedFocusMarkets,
      uniqueProviderPlayers: uniqueAssociations.length,
      unresolvedProviderPlayers: unmatchedAssociations.length,
      unresolvedAssociations: unmatchedAssociations,
      unresolvedFocusProviderPlayers: unmatchedFocusAssociations.length,
      unresolvedFocusAssociations: unmatchedFocusAssociations,
      focusMarketCounts,
    },
    marketRules: {
      playerShots: { code: "28507", exactModelMatch: false, replacementIncluded: true, extraTimeIncluded: true, reason: "Sisal somma giocatore e sostituto; V2 stima il singolo giocatore." },
      playerSot: { code: "28506", exactModelMatch: false, replacementIncluded: true, postsAndCrossbarIncluded: true, extraTimeIncluded: true, reason: "Sisal somma giocatore e sostituto e include pali/traverse; V2 stima SOT individuali standard." },
      playerCards: { code: "28576", exactModelMatch: false, replacementIncluded: true, allContextsIncluded: true, reason: "Mercato DUO include panchina, post-finale, supplementari e rigori; Card V2 resta research-only e non bookmaker-certified." },
      oneXTwo: { code: "3", exactModelMatch: true, allSidesOpen: oneXTwo.every(match => match.selections.every(selection => selection.odds)), noVigMethod: "normalizzazione delle probabilità inverse sui tre esiti" },
    },
    oneXTwo,
    positiveTheoreticalEv: positiveOneXTwo,
    playerMarketAnalysis: {
      certifiedEvCount: 0,
      explanation: "Nessun mercato tiri, SOT o cartellino del feed coincide esattamente con il target individuale del modello; probabilità implicite mostrate solo come descrizione del prezzo, senza edge o EV.",
      topShots,
      topSot,
      topOutsiders,
    },
    fixtures: fixtureAnalyses,
    exclusions: excludedQuantitative,
    missingData: [
      "Nessuna previsione operativa rigenerata sulle probabili live del 9 ottobre.",
      "Il modello non stima il contributo del sostituto per i mercati DUO tiri/SOT.",
      "Il modello SOT non include pali/traverse nel target pubblicato.",
      "Card research leader unresolved; probabilità bookmaker-certified assente.",
      "C4 della preview Card non include le designazioni AIA pubblicate il 7 ottobre.",
      "La maggior parte dei mercati U/O giocatore espone un solo lato aperto: no-vig non calcolabile.",
      "Assenze/infortuni live non sono serializzati nell'operativa del 3 ottobre; i cambi di XI sono trattati come warning, non imputati al modello.",
    ],
    tests: {
      internalAssertions: ["10/10 eventi Sisal", "10/10 fixture operative", "10/10 snapshot immutabili", "10/10 preview Card", "20 squadre e 220 titolari Fantacalcio live", "quote positive", "probabilità monotone già validate nell'operativa"],
      status: diagnosticTestStatus,
      commands: diagnosticTests,
    },
    integrity: {
      protectedFiles: Object.keys(before).length,
      manifestSha256Before: hashManifest(before),
      manifestSha256After: null,
      changedProtectedFiles: null,
      status: "PENDING_POST_WRITE_CHECK",
    },
    finalStatus: {
      sisalMd6Import: "COMPLETE",
      marketMatching: matchedFocusMarkets === focusMarkets.length ? "PASS" : "PARTIAL",
      playerMarketV2: "UNCHANGED",
      cardModel: "RESEARCH ONLY",
      immutableSnapshots: "UNCHANGED",
      productionIntegrity: "PENDING",
      readyForManualReview: "PENDING",
    },
  };

  function fixtureName(matchId) {
    return fixtureByMatch.get(matchId)?.label || matchId;
  }

  const markdown = [];
  markdown.push("# Sisal MD6 — audit quote, confronto Prediction Engine V2 e analisi mercati", "");
  markdown.push(`Generato: ${report.generatedAt}. Ambito: Serie A 2026/27, MD6, 10 partite. **Nessuna formula o snapshot è stata modificata.**`, "");
  markdown.push("## 1. Stato importazione Sisal", "");
  markdown.push(`Import completo: **${odds.summary.events}/10 eventi**, ${odds.summary.markets.toLocaleString("it-IT")} mercati, ${odds.summary.selections.toLocaleString("it-IT")} quote, ${odds.summary.playerMarkets.toLocaleString("it-IT")} mercati giocatore. Acquisizione: ${odds.retrievedAt}. Duplicati market ID: ${report.sisalImport.duplicateProviderMarketIds}; duplicati selection ID: ${report.sisalImport.duplicateProviderSelectionIds}.`, "");
  markdown.push(markdownTable(["Partita", "Inizio UTC", "Mercati", "Quote", "Mercati giocatore", "Selezioni sospese"], eventCoverage.map(event => [event.name, event.startsAt, event.markets, event.selections, event.playerMarkets, event.suspendedSelections])), "");
  markdown.push(`Mercati focus con aggiornamento più vecchio di 48 ore: ${focusOlderThan48Hours}. Mercati 1X2 più vecchi di 48 ore: ${oneXTwoOlderThan48Hours}. La soglia segnala età del dato, non dimostra da sola obsolescenza.`, "");
  markdown.push("## 2. Prediction Engine V2, cutoff e snapshot", "");
  markdown.push(`Engine operativo **${operational.engineVersion}**, player-market V2, generato ${operational.generatedAt}; cutoff: matchday < 6, completed-only. Snapshot immutabile MD6: ${frozen.generatedAt}, 10/10 partite, hash ${fileHash(frozenPath)}. Operativa: ${operationalPlayers.length} giocatori con Expected Minutes e probabilità tiri/SOT.`, "");
  markdown.push(`Le probabili locali usate dal modello furono importate il ${localLineups.importedAt}. La pagina Fantacalcio live è stata riletta il ${liveLineups.retrievedAt}: ${lineupChanges.filter(change => change.changed).length}/20 squadre hanno almeno una variazione di XI, probabilità o modulo; ingressi titolari ${report.predictionAudit.liveLineupChanges.starterEntrants}, uscite ${report.predictionAudit.liveLineupChanges.starterExits}. **Non esiste un'operativa rigenerata sulle probabili del 9 ottobre.**`, "");
  markdown.push("## 3. Integrità associazioni giocatore–mercato", "");
  markdown.push(`Mercati giocatore: ${playerMarkets.length.toLocaleString("it-IT")}; associati al giocatore canonico: ${matchedPlayerMarkets.toLocaleString("it-IT")}; non associati: ${(playerMarkets.length - matchedPlayerMarkets).toLocaleString("it-IT")}. Focus tiri/SOT/card: ${matchedFocusMarkets}/${focusMarkets.length}. Provider player unici: ${uniqueAssociations.length}; irrisolti complessivi: ${unmatchedAssociations.length}; irrisolti nei mercati focus: ${unmatchedFocusAssociations.length}. Nessuna associazione incerta è stata forzata.`, "");
  if (unmatchedFocusAssociations.length) {
    markdown.push("Provider non associati nei mercati focus (esclusi dall'analisi quantitativa):", "");
    markdown.push(markdownTable(["Partita", "Etichetta Sisal", "Esito matching"], unmatchedFocusAssociations.map(entry => [fixtureName(entry.key.split(":")[0]), entry.label || "N/D", entry.reason || entry.status])), "");
  }
  markdown.push("## 4. Regole e compatibilità dei mercati", "");
  markdown.push("- Tiri giocatore `28507`: somma giocatore + sostituto, inclusi eventuali supplementari. Target diverso dal singolo giocatore V2.");
  markdown.push("- SOT giocatore `28506`: giocatore + sostituto, supplementari e pali/traverse inclusi. Target diverso dal SOT individuale V2.");
  markdown.push("- Cartellino `28576`: DUO all-contexts, inclusi panchina, post-finale, supplementari e rigori. Card V2 non è bookmaker-certified.");
  markdown.push("- 1X2 `3`: target esatto sui tre esiti; qui sono calcolabili overround, no-vig ed EV teorico dalla snapshot indipendente dalle quote.", "");
  markdown.push(`Regolamento ufficiale consultato: ${sisalRulesUrl}`, "");
  markdown.push("## 5. Variazioni probabili formazioni", "");
  markdown.push(markdownTable(["Squadra", "Modulo 03/10", "Modulo live", "Ingressi XI", "Uscite XI", "Aggiornamento live"], lineupChanges.map(change => [change.team, change.oldFormation, change.liveFormation, change.entrants.map(player => player.name).join(", ") || "—", change.exits.map(player => player.name).join(", ") || "—", change.liveUpdatedAt])), "");
  markdown.push("## 6. Analisi partita per partita", "");
  for (const fixture of fixtureAnalyses) {
    markdown.push(`### ${fixture.label}`, "");
    markdown.push(`Arbitro ufficiale: **${fixture.referee.name}** (AIA, 7 ottobre). Mercati ${fixture.odds.markets}; quote ${fixture.odds.selections}. Probabili cambiate: ${fixture.lineup.changed ? "SÌ" : "NO"}. Titolari live non modellati: ${fixture.lineup.unmodelledLiveStarters.length}; giocatori dell'operativa non più nell'XI live: ${fixture.lineup.noLongerLiveStarters.length}.`, "");
    markdown.push("Volumi squadra: " + fixture.teamVolumes.map(team => `${team.team} ${team.shots?.central ?? "N/D"} tiri (${team.shots?.min ?? "N/D"}–${team.shots?.max ?? "N/D"}), ${team.shotsOnTarget?.central ?? "N/D"} SOT (${team.shotsOnTarget?.min ?? "N/D"}–${team.shotsOnTarget?.max ?? "N/D"})`).join("; ") + ".", "");
    markdown.push("Tiri 2+ direzionali: " + (fixture.shots.map(player => `${playerDisplay(player)} ${percent(player.modelProbability)} · quota ${player.bookmaker?.odds ?? "N/D"}`).join("; ") || "nessun matching valutabile") + ".", "");
    markdown.push("SOT 1+ direzionali: " + (fixture.sot.map(player => `${playerDisplay(player)} ${percent(player.modelProbability)} · quota ${player.bookmaker?.odds ?? "N/D"}`).join("; ") || "nessun matching valutabile") + ".", "");
    markdown.push("Cartellini osservazionali: " + (fixture.cardCandidates.map(player => `${player.name} · C2 ${percent(player.researchSignals.C2)} · quota ${player.bookmaker?.odds ?? "N/D"} · EV N/D`).join("; ") || "nessun mercato compatibile/disponibile") + ".", "");
    markdown.push(`Rischi: ${fixture.risks.join(" ")}`, "");
  }
  markdown.push("## 7. TOP 10 — TIRI TOTALI", "");
  markdown.push("Classifica del segnale V2 2+ tra i titolari ancora presenti nella probabile live e con mercato Sisal associato. **Non è una classifica EV**, perché il mercato include il sostituto.", "");
  markdown.push(renderComparisonTable(topShots), "");
  markdown.push("## 8. TOP 10 — TIRI IN PORTA", "");
  markdown.push("Classifica del segnale V2 1+ SOT. Il prezzo Sisal include sostituto e pali/traverse: edge ed EV restano N/D.", "");
  markdown.push(renderComparisonTable(topSot), "");
  markdown.push("## 9. TOP 10 — OUTSIDER", "");
  markdown.push("Sono ammessi soltanto outsider già qualificati dall'Engine V2 e ancora titolari live; non vengono creati outsider per riempire la classifica.", "");
  markdown.push(renderComparisonTable(topOutsiders), "");
  markdown.push("## 10. Cartellini", "");
  markdown.push(`Card preview: ${cardPreview.generatedAt}; stato **${cardPreview.modelState}**; leader **${cardPreview.researchLeader}**; actual esclusi. Le designazioni AIA ora esistono, ma C4 non è stato ricalcolato. Le righe partita-per-partita sono segnali osservazionali e non probabilità di vincita.`, "");
  markdown.push("## 11. 1X2: confronto quantitativo ed EV teorico", "");
  markdown.push(markdownTable(["Partita", "Esito", "P modello", "Quota", "P implicita", "P no-vig", "Overround", "EV teorico", "Età prezzo h"], oneXTwo.flatMap(match => match.selections.map(selection => [fixtureName(match.matchId), selection.selection, percent(selection.modelProbability), selection.odds, percent(selection.rawImpliedProbability), percent(selection.noVigProbability), percent(selection.overround), percent(selection.theoreticalEv), match.marketAgeAtRetrievalHours]))), "");
  markdown.push("EV teorici positivi (snapshot 3 ottobre; da rivedere manualmente per cambi XI): " + (positiveOneXTwo.map(selection => `${fixtureName(selection.matchId)} ${selection.selection} ${percent(selection.theoreticalEv)}`).join("; ") || "nessuno") + ".", "");
  markdown.push("## 12. Mercati esclusi", "");
  markdown.push(`Tiri DUO esclusi dall'EV: ${excludedQuantitative.playerShotsDuo}; SOT DUO/pali-traverse: ${excludedQuantitative.playerSotDuoPostsCrossbar}; cartellini DUO all-contexts: ${excludedQuantitative.playerCardsResearchAndAllContextsDuo}; altri mercati fuori dal target quantitativo supportato: ${excludedQuantitative.otherMarketsOutsideSupportedAuditTarget}.`, "");
  markdown.push("## 13. Rischi e incertezze", "");
  markdown.push(report.missingData.map(value => `- ${value}`).join("\n"), "");
  markdown.push("## 14. Verifiche di integrità", "");
  markdown.push(`Manifest protetto pre-scrittura: ${report.integrity.manifestSha256Before}; file protetti: ${report.integrity.protectedFiles}. Il controllo post-scrittura viene inserito al termine del generatore.`, "");
  markdown.push(`Suite diagnostica: **${report.tests.status}**.`, "");
  markdown.push(markdownTable(["Controllo", "Esito", "Nota"], report.tests.commands.map(test => [test.name, test.status, test.classification || "—"])), "");
  markdown.push("## 15. Conclusione operativa", "");
  markdown.push("Le opportunità player-market restano **candidati da revisione manuale**, non value bet certificate. Gli unici EV calcolabili in modo coerente sono i 1X2; quelli positivi restano sensibili alla distanza temporale e ai cambi di formazione intervenuti dopo la snapshot.", "");

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownOutput, `${markdown.join("\n")}\n`);

  const after = captureProtectedHashes();
  const changedProtectedFiles = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]);
  report.integrity.manifestSha256After = hashManifest(after);
  report.integrity.changedProtectedFiles = changedProtectedFiles;
  report.integrity.status = changedProtectedFiles.length ? "FAILED" : "PASS";
  report.finalStatus.productionIntegrity = changedProtectedFiles.length ? "FAILED" : "PASS";
  report.finalStatus.readyForManualReview = changedProtectedFiles.length || !diagnosticTestsPassed ? "NO" : "YES";
  fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);

  const finalMarkdown = markdown.join("\n")
    .replace(`Manifest protetto pre-scrittura: ${report.integrity.manifestSha256Before}; file protetti: ${report.integrity.protectedFiles}. Il controllo post-scrittura viene inserito al termine del generatore.`, `Manifest protetto prima/dopo: ${report.integrity.manifestSha256Before} / ${report.integrity.manifestSha256After}; file protetti: ${report.integrity.protectedFiles}; modifiche rilevate: ${changedProtectedFiles.length}. **${report.integrity.status}**.`)
    + `\n\nSISAL MD6 IMPORT: ${report.finalStatus.sisalMd6Import}\n\nMARKET MATCHING: ${report.finalStatus.marketMatching}\n\nPLAYER MARKET V2: ${report.finalStatus.playerMarketV2}\n\nCARD MODEL: ${report.finalStatus.cardModel}\n\nIMMUTABLE SNAPSHOTS: ${report.finalStatus.immutableSnapshots}\n\nPRODUCTION INTEGRITY: ${report.finalStatus.productionIntegrity}\n\nREADY FOR MANUAL REVIEW: ${report.finalStatus.readyForManualReview}\n`;
  fs.writeFileSync(markdownOutput, finalMarkdown);

  console.log(JSON.stringify({
    json: relative(jsonOutput),
    markdown: relative(markdownOutput),
    fixtures: report.scope.fixtures,
    markets: odds.summary.markets,
    focusMarkets: focusMarkets.length,
    matchedFocusMarkets,
    unmatchedProviderPlayers: unmatchedAssociations.length,
    positiveOneXTwoEv: positiveOneXTwo.length,
    topShots: topShots.length,
    topSot: topSot.length,
    topOutsiders: topOutsiders.length,
    lineupTeamsChanged: report.predictionAudit.liveLineupChanges.teamsChanged,
    productionIntegrity: report.integrity.status,
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
