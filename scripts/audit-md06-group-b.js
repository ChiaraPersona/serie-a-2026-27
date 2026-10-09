"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { scoreMatrix } = require("./predictions/decision-layer");
const { isPlayableSelection } = require("./betting-market-policy");
const { isSisalMyComboMarketName } = require("./mycombo-market-policy");

const root = path.resolve(__dirname, "..");
const reportDate = "2026-10-09";
const jsonOutput = path.join(root, "output", "reports", `serie-a-md06-group-b-audit-${reportDate}.json`);
const markdownOutput = path.join(root, "output", "reports", `serie-a-md06-group-b-audit-${reportDate}.md`);
const paths = {
  audit: "output/reports/serie-a-md06-schedina-market-audit-2026-10-09.md",
  odds: "data/normalized/odds/sisal/serie-a.json",
  rawOdds: "data/raw/odds/sisal/serie-a/2026-10-09T10-43-00-203Z.json.gz",
  predictions: "data/normalized/predictions.json",
  matches: "data/normalized/matches.json",
  teams: "data/teams/index.json",
  probable: "data/sources/probable-lineups-md6-2026-27.json",
  official: "data/sources/official-lineups-2026-27.json",
  schedina: "data/normalized/schedina-md06.json",
};

const readBuffer = relative => fs.readFileSync(path.join(root, relative));
const read = relative => JSON.parse(readBuffer(relative).toString("utf8"));
const sha256 = relative => crypto.createHash("sha256").update(readBuffer(relative)).digest("hex");
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const sum = values => values.reduce((total, value) => total + value, 0);
const matrixProbability = (matrix, predicate) => sum(matrix.filter(predicate).map(row => row.probability));
const canonicalSelectionId = (matchId, providerSelectionId) => `bet:sisal:${matchId}:${providerSelectionId}`;
const providerIdFromCanonical = selectionId => String(selectionId || "").split(":").at(-1);

const odds = read(paths.odds);
const predictionData = read(paths.predictions);
const matches = read(paths.matches);
const teams = read(paths.teams).teams;
const probableLineups = read(paths.probable);
const officialLineups = read(paths.official);
const schedina = read(paths.schedina);
const rawCapture = JSON.parse(zlib.gunzipSync(readBuffer(paths.rawOdds)).toString("utf8"));

const md6Predictions = predictionData.predictions.filter(prediction => prediction.matchId.endsWith("-md-06"));
const predictionByMatch = new Map(md6Predictions.map(prediction => [prediction.matchId, prediction]));
const matchById = new Map(matches.map(match => [match.id, match]));
const teamById = new Map(teams.map(team => [team.id, team]));
const eventByMatch = new Map(odds.events.filter(event => event.canonicalMatchId?.endsWith("-md-06")).map(event => [event.canonicalMatchId, event]));
assert.equal(md6Predictions.length, 10, "Servono dieci previsioni MD6");
assert.equal(eventByMatch.size, 10, "Servono dieci eventi Sisal MD6 riconciliati");

function buildRawSelectionIndex() {
  const index = new Map();
  for (const response of rawCapture.responses || []) {
    const payload = response.payload;
    const event = payload?.avvenimentoFe;
    if (!event) continue;
    for (const info of Object.values(payload.infoAggiuntivaMap || {})) {
      if (!Array.isArray(info.esitoList)) continue;
      const marketKey = `${info.codicePalinsesto}-${info.codiceAvvenimento}-${info.codiceScommessa}`;
      const marketName = payload.scommessaMap?.[marketKey]?.descrizione || info.descrizione || "";
      for (const selection of info.esitoList) {
        const id = String(selection.selectionId);
        const row = {
          providerSelectionId: id,
          providerMarketId: String(info.marketId),
          providerEventId: String(event.eventId),
          regulatorEventId: String(event.regulatorEventId || `${event.codicePalinsesto}-${event.codiceAvvenimento}`),
          marketCode: String(info.codiceScommessa),
          marketName: String(marketName).trim(),
          variantName: String(info.descrizione || "").trim(),
          threshold: info.soglia === "" || info.soglia == null ? null : String(info.soglia),
          marketStatus: info.stato === 1 ? "open" : "suspended",
          selectionCode: String(selection.codiceEsito),
          selectionName: String(selection.descrizione || "").trim(),
          oddsRaw: selection.quota,
          odds: Number((selection.quota / 100).toFixed(2)),
          selectionStatus: selection.stato === 1 ? "open" : "suspended",
        };
        assert(!index.has(id), `Selection ID raw duplicato: ${id}`);
        index.set(id, row);
      }
    }
  }
  return index;
}

const rawSelectionById = buildRawSelectionIndex();
const normalizedSelectionById = new Map();
for (const event of eventByMatch.values()) for (const market of event.markets || []) for (const selection of market.selections || []) {
  assert(!normalizedSelectionById.has(String(selection.providerSelectionId)), `Selection ID normalizzato duplicato: ${selection.providerSelectionId}`);
  normalizedSelectionById.set(String(selection.providerSelectionId), { event, market, selection });
}

const originalVisibleIds = new Set([
  ...schedina.marketCatalog.matches.flatMap(match => match.selections).filter(leg => leg.catalogOrigin !== "gruppo-a").map(leg => leg.selectionId),
  ...schedina.marketCatalog.excluded.map(item => item.selectionId),
]);
const groupAIds = new Set(schedina.marketCatalog.matches.flatMap(match => match.selections).filter(leg => leg.catalogOrigin === "gruppo-a").map(leg => leg.selectionId));
const currentCatalogIds = new Set(schedina.marketCatalog.matches.flatMap(match => match.selections).map(leg => leg.selectionId));
assert.equal(originalVisibleIds.size, 35, "Il perimetro visibile pre-Fase 5A deve essere 35");
assert.equal(groupAIds.size, 128, "Il Gruppo A deve contenere 128 esiti");
assert.equal(currentCatalogIds.size, 160, "Il catalogo Fase 5A deve contenere 160 esiti");

const familyDefinitions = {
  "corner-over-match": { label: "Corner totali full-match · Over", support: "team-volume", technicalRisk: "alto" },
  "corner-over-team": { label: "Corner squadra full-match · Over", support: "team-volume", technicalRisk: "alto" },
  "sot-over-match": { label: "Tiri in porta partita · Over", support: "team-volume", technicalRisk: "alto" },
  "sot-over-team": { label: "Tiri in porta squadra · Over", support: "team-volume", technicalRisk: "alto" },
  "multigoal-match": { label: "Multigoal partita", support: "score-matrix", technicalRisk: "medio-basso" },
  "multigoal-team": { label: "Multigoal squadra", support: "score-matrix", technicalRisk: "medio-basso" },
  "team-goals-over": { label: "Gol squadra · Over", support: "score-matrix", technicalRisk: "medio-basso" },
  "both-teams-sot": { label: "Entrambe almeno X tiri in porta", support: "team-volume-joint", technicalRisk: "alto" },
  "corner-1x2-fulltime": { label: "CALCI ANGOLO 1X2 T.R.", support: "corner-difference", technicalRisk: "alto" },
  "player-sot-duo": { label: "Tiri in porta giocatore DUO", support: "player-individual-only", technicalRisk: "molto alto" },
  "player-shots-duo": { label: "Tiri totali giocatore DUO", support: "player-individual-only", technicalRisk: "molto alto" },
};

const candidates = [];
const candidateIds = new Set();
function addCandidate(event, market, selection, family, sourceRule) {
  if (market.status !== "open" || selection.status !== "open" || !finite(selection.odds) || Number(selection.odds) < 1) return;
  const selectionId = canonicalSelectionId(event.canonicalMatchId, selection.providerSelectionId);
  if (originalVisibleIds.has(selectionId) || groupAIds.has(selectionId)) return;
  assert(!candidateIds.has(selectionId), `Candidato Gruppo B duplicato: ${selectionId}`);
  candidateIds.add(selectionId);
  candidates.push({ event, market, selection, family, sourceRule, selectionId });
}

function oldProjectedPlayer(variantName, match) {
  const variant = clean(variantName);
  const projected = [match.homeTeam, match.awayTeam].flatMap(teamId => teamById.get(teamId)?.probableLineup?.players || []);
  return projected.some(player => {
    const tokens = clean(player.name || player).split(" ").filter(Boolean);
    if (tokens.length < 2) return false;
    const surname = tokens.at(-1), first = tokens[0];
    return variant.includes(surname) && (variant.includes(first) || variant.includes(`${surname} ${first[0]}`));
  });
}

for (const [matchId, event] of eventByMatch) {
  const prediction = predictionByMatch.get(matchId);
  const match = matchById.get(matchId);
  assert(prediction && match, `${matchId}: previsione o partita assente`);
  for (const market of event.markets || []) {
    if (!isSisalMyComboMarketName(market.marketName)) continue;
    const threshold = Number(market.threshold);
    const fulltimeVolume = {
      "U/O CORNER": ["corner-over-match", prediction.matchProjection?.corners],
      "U/O CORNER SQUADRA X": ["corner-over-team", /SQUADRA 1\b/.test(market.variantName) ? prediction.teamProjections?.[0]?.corners : prediction.teamProjections?.[1]?.corners],
      "U/O TIRI IN PORTA": ["sot-over-match", prediction.matchProjection?.shotsOnTarget],
      "U/O TIRI IN PORTA SQUADRA X": ["sot-over-team", /SQUADRA 1\b/.test(market.variantName) ? prediction.teamProjections?.[0]?.shotsOnTarget : prediction.teamProjections?.[1]?.shotsOnTarget],
    }[market.marketName];
    if (fulltimeVolume && finite(threshold) && finite(fulltimeVolume[1]?.central)) {
      for (const selection of market.selections || []) {
        if (!['OVER', 'UNDER'].includes(selection.name)) continue;
        const coherent = selection.name === "OVER" ? Number(fulltimeVolume[1].central) >= threshold + 0.8 : Number(fulltimeVolume[1].central) <= threshold - 0.8;
        if (coherent && selection.name === "OVER") addCandidate(event, market, selection, fulltimeVolume[0], "candidatePool/fulltime-volume-coherence");
      }
    }

    const [homeGoals, awayGoals] = prediction.scoreForecast.primary.score.split("-").map(Number);
    const totalGoals = homeGoals + awayGoals;
    for (const selection of market.selections || []) {
      const compact = String(selection.name).replace(/\s+/g, "").toUpperCase();
      if (market.marketName === "MULTIGOAL") {
        const range = compact.match(/^(\d+)-(\d+)$/);
        if (range && totalGoals >= Number(range[1]) && totalGoals <= Number(range[2])) addCandidate(event, market, selection, "multigoal-match", "scoreMarketCandidate/primary-score-compatible");
      } else if (market.marketName === "MULTIGOAL SQUADRA X") {
        const range = compact.match(/^(\d+)-(\d+)$/);
        const goals = /SQUADRA 1\b/.test(market.variantName) ? homeGoals : awayGoals;
        if (range && goals >= Number(range[1]) && goals <= Number(range[2])) addCandidate(event, market, selection, "multigoal-team", "scoreMarketCandidate/primary-score-compatible");
      } else if (market.marketName === "U/O SQUADRA X" && selection.name === "OVER") {
        const goals = /SQUADRA 1\b/.test(market.variantName) ? homeGoals : awayGoals;
        if (goals > threshold) addCandidate(event, market, selection, "team-goals-over", "scoreMarketCandidate/primary-score-compatible");
      }
    }

    if (market.marketName === "ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA") {
      const bothThreshold = Number(market.variantName.match(/ALMENO\s+(\d+(?:\.\d+)?)/i)?.[1]);
      const supported = finite(bothThreshold) && prediction.teamProjections.every(team => Number(team?.shotsOnTarget?.central) >= bothThreshold + 0.4);
      const selection = (market.selections || []).find(item => item.name === "SI");
      if (supported && selection) addCandidate(event, market, selection, "both-teams-sot", "candidatePool/both-teams-volume-coherence");
    }

    if (market.marketName === "1X2 CORNER") {
      const homeCorners = Number(prediction.teamProjections?.[0]?.corners?.central);
      const awayCorners = Number(prediction.teamProjections?.[1]?.corners?.central);
      if (finite(homeCorners) && finite(awayCorners) && Math.abs(homeCorners - awayCorners) >= 0.5) {
        const selection = (market.selections || []).find(item => item.name === (homeCorners >= awayCorners ? "1" : "2"));
        if (selection) addCandidate(event, market, selection, "corner-1x2-fulltime", "candidatePool/corner-central-higher-side");
      }
    }

    const playerKind = {
      "U/O TIRI TOTALI GIOCATORE (DUO) INC TS": ["player-shots-duo", 3.5],
      "U/O TIRI IN PORTA GIOCATORE (DUO) INC PALI TRAVERSE INC TS": ["player-sot-duo", 1.5],
      "U/O  TIRI IN PORTA GIOCATORE (DUO) INC PALI TRAVERSE INC TS": ["player-sot-duo", 1.5],
    }[market.marketName];
    if (playerKind && threshold <= playerKind[1] && oldProjectedPlayer(market.variantName, match)) {
      const selection = (market.selections || []).find(item => item.name === "OVER");
      if (selection) addCandidate(event, market, selection, playerKind[0], "candidatePool/projected-player-over-threshold");
    }
  }
}

const reconstructedFamilyCounts = Object.fromEntries(Object.keys(familyDefinitions).map(family => [family, candidates.filter(candidate => candidate.family === family).length]));
assert.deepEqual(reconstructedFamilyCounts, {
  "corner-over-match": 21,
  "corner-over-team": 32,
  "sot-over-match": 32,
  "sot-over-team": 25,
  "multigoal-match": 105,
  "multigoal-team": 71,
  "team-goals-over": 27,
  "both-teams-sot": 15,
  "corner-1x2-fulltime": 5,
  "player-sot-duo": 336,
  "player-shots-duo": 217,
}, "La ricostruzione per famiglia non coincide con i 886 del report originario");
assert.equal(candidates.length, 886, "La ricostruzione del Gruppo B deve contenere 886 esiti");

function rawReconciliation(candidate) {
  const raw = rawSelectionById.get(String(candidate.selection.providerSelectionId));
  const reasons = [];
  if (!raw) reasons.push("RAW_SELECTION_NOT_FOUND");
  if (raw && raw.providerMarketId !== String(candidate.market.providerMarketId)) reasons.push("RAW_MARKET_ID_MISMATCH");
  if (raw && raw.marketName !== String(candidate.market.marketName).trim()) reasons.push("RAW_MARKET_NAME_MISMATCH");
  if (raw && raw.variantName !== String(candidate.market.variantName).trim()) reasons.push("RAW_VARIANT_MISMATCH");
  if (raw && raw.threshold !== (candidate.market.threshold == null ? null : String(candidate.market.threshold))) reasons.push("RAW_THRESHOLD_MISMATCH");
  if (raw && raw.selectionName !== String(candidate.selection.name).trim()) reasons.push("RAW_SELECTION_NAME_MISMATCH");
  if (raw && raw.odds !== Number(candidate.selection.odds)) reasons.push("RAW_ODDS_MISMATCH");
  if (raw && raw.selectionStatus !== candidate.selection.status) reasons.push("RAW_SELECTION_STATUS_MISMATCH");
  return { status: reasons.length ? "MISMATCH" : "VERIFIED_EXACT", reasons, raw };
}

function buildProviderPlayerMap() {
  const map = new Map();
  for (const prediction of md6Predictions) {
    const event = eventByMatch.get(prediction.matchId);
    const marketById = new Map(event.markets.map(market => [String(market.providerMarketId), market]));
    for (const player of prediction.shooters?.allPlayers || []) for (const quote of Object.values(player.markets || {}).filter(Boolean)) {
      const market = marketById.get(String(quote.providerMarketId));
      for (const providerPlayerId of market?.providerPlayerIds || []) {
        const key = `${prediction.matchId}:${providerPlayerId}`;
        const value = { playerId: player.playerId, playerName: player.name, teamId: player.teamId, engineMarketLink: quote };
        const previous = map.get(key);
        assert(!previous || previous.playerId === value.playerId, `${key}: providerPlayerId associato a più giocatori`);
        map.set(key, value);
      }
    }
  }
  return map;
}

const providerPlayerMap = buildProviderPlayerMap();
function lineupFor(candidate) {
  if (!candidate.family.startsWith("player-")) return { applicable: false, eligible: true, status: "not-applicable", identityStatus: "not-applicable" };
  const identities = [...new Map((candidate.market.providerPlayerIds || []).map(id => {
    const row = providerPlayerMap.get(`${candidate.event.canonicalMatchId}:${id}`);
    return row ? [row.playerId, { ...row, providerPlayerId: String(id) }] : [String(id), null];
  })).values()].filter(Boolean);
  if (identities.length !== 1) return { applicable: true, eligible: false, status: "unknown", identityStatus: "PROVIDER_PLAYER_ID_UNRESOLVED", providerPlayerIds: candidate.market.providerPlayerIds || [] };
  const identity = identities[0];
  const officialFixture = (officialLineups.fixtures || []).find(fixture => fixture.matchId === candidate.event.canonicalMatchId);
  if (officialFixture) {
    const starter = officialFixture.teams.flatMap(team => team.players || []).find(player => player.playerId === identity.playerId);
    return { applicable: true, eligible: Boolean(starter), status: starter ? "official-starter" : "official-nonstarter", identityStatus: "VERIFIED_PROVIDER_PLAYER_ID", source: officialLineups.provider, sourceUpdatedAt: officialLineups.retrievedAt, ...identity };
  }
  const probable = probableLineups.teams.flatMap(team => team.players || []).find(player => player.playerId === identity.playerId);
  return {
    applicable: true,
    eligible: probable?.lineupStatus === "starter",
    status: probable?.lineupStatus === "starter" ? "probable-starter" : probable?.lineupStatus === "reserve" ? "reserve" : "unknown",
    identityStatus: "VERIFIED_PROVIDER_PLAYER_ID",
    source: probableLineups.provider,
    sourceUpdatedAt: probableLineups.importedAt,
    ...identity,
  };
}

function scorePredicate(candidate) {
  const compact = String(candidate.selection.name).replace(/\s+/g, "").toUpperCase();
  if (candidate.family === "multigoal-match") {
    const range = compact.match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
    return range ? score => score.home + score.away >= range[0] && score.home + score.away <= range[1] : null;
  }
  if (candidate.family === "multigoal-team") {
    const range = compact.match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
    const side = /SQUADRA 1\b/.test(candidate.market.variantName) ? "home" : /SQUADRA 2\b/.test(candidate.market.variantName) ? "away" : null;
    return range && side ? score => score[side] >= range[0] && score[side] <= range[1] : null;
  }
  if (candidate.family === "team-goals-over") {
    const side = /SQUADRA 1\b/.test(candidate.market.variantName) ? "home" : /SQUADRA 2\b/.test(candidate.market.variantName) ? "away" : null;
    const threshold = Number(candidate.market.threshold);
    return side && finite(threshold) ? score => score[side] > threshold : null;
  }
  return null;
}

function scoreEvaluation(candidate) {
  const prediction = predictionByMatch.get(candidate.event.canonicalMatchId);
  const expected = prediction.expectedGoals;
  const lambdas = [
    [expected.home, expected.away],
    [expected.home * 0.9, expected.away * 1.1],
    [expected.home * 1.1, expected.away * 0.9],
    [expected.home * 0.9, expected.away * 0.9],
    [expected.home * 1.1, expected.away * 1.1],
  ];
  const predicate = scorePredicate(candidate);
  assert(predicate, `${candidate.selectionId}: predicato matrice punteggi assente`);
  const probabilities = lambdas.map(([home, away]) => matrixProbability(scoreMatrix({ home, away }, 7), predicate));
  const central = probabilities[0], prudent = Math.min(...probabilities), quote = Number(candidate.selection.odds);
  return {
    status: "DERIVED_EXISTING_SCORE_MATRIX",
    formula: "P = somma delle celle della matrice Poisson che soddisfano il predicato; P prudente = minimo tra matrice centrale e quattro sensibilità lambda ±10%; fair = 1/P prudente; EV = P prudente × quota - 1.",
    inputs: { expectedGoals: { home: expected.home, away: expected.away }, sensitivityLambdas: lambdas.map(([home, away]) => ({ home: round(home, 5), away: round(away, 5) })) },
    centralProbabilityPct: round(central * 100, 1),
    prudentProbabilityPct: round(prudent * 100, 1),
    fairOdds: round(1 / Math.max(0.0001, prudent), 2),
    expectedValuePct: round((prudent * quote - 1) * 100, 1),
    validation: "Formula già usata da assessConfiguredPortfolio/configuredScorePredicate; nessuna nuova ipotesi statistica.",
  };
}

function playerSignal(candidate, lineup) {
  if (!lineup?.playerId) return { status: "UNAVAILABLE_IDENTITY" };
  const player = predictionByMatch.get(candidate.event.canonicalMatchId)?.shooters?.allPlayers?.find(row => row.playerId === lineup.playerId);
  if (!player) return { status: "UNAVAILABLE_PLAYER_ROW" };
  const threshold = Number(candidate.market.threshold);
  const key = candidate.family === "player-shots-duo"
    ? ({ 0.5: "over05", 1.5: "over15", 2.5: "over25" })[threshold]
    : ({ 0.5: "over05", 1.5: "over15" })[threshold];
  const probabilities = candidate.family === "player-shots-duo" ? player.shotProbabilities : player.shotOnTargetProbabilities;
  return {
    status: key && finite(probabilities?.[key]) ? "INDIVIDUAL_SIGNAL_AVAILABLE_BUT_TARGET_INCOMPATIBLE" : "EXACT_THRESHOLD_SIGNAL_UNAVAILABLE",
    playerId: player.playerId,
    playerName: player.name,
    threshold,
    individualProbabilityPct: key && finite(probabilities?.[key]) ? round(Number(probabilities[key]) * 100, 2) : null,
    incompatibilities: candidate.family === "player-sot-duo"
      ? ["bookmaker target includes substitute", "bookmaker target includes posts/crossbar", "model target is named player only"]
      : ["bookmaker target includes substitute", "model target is named player only"],
  };
}

const rows = candidates.map(candidate => {
  const raw = rawReconciliation(candidate);
  const lineup = lineupFor(candidate);
  const policyInput = { matchId: candidate.event.canonicalMatchId, market: candidate.market.marketName, variant: candidate.market.variantName, selection: candidate.selection.name };
  const policyEligible = isPlayableSelection(policyInput, { matchday: 6 });
  const quoteValid = candidate.market.status === "open" && candidate.selection.status === "open" && finite(candidate.selection.odds) && Number(candidate.selection.odds) >= 1;
  let level, reason, evaluation = null;
  if (raw.status !== "VERIFIED_EXACT") {
    level = "B4"; reason = `Identità raw/normalizzata non riconciliata: ${raw.reasons.join(", ")}.`;
  } else if (!policyEligible) {
    level = "B4"; reason = "Esito escluso dalla policy MD6 corrente.";
  } else if (!quoteValid) {
    level = "B4"; reason = "Quota o stato non valido nello snapshot.";
  } else if (lineup.applicable && !lineup.eligible) {
    level = "B4"; reason = `Mercato individuale non eleggibile: ${lineup.status}.`;
  } else if (familyDefinitions[candidate.family].support === "score-matrix") {
    level = "B2"; reason = "Probabilità derivabile esattamente dalla distribuzione punteggi già prodotta, usando predicato e sensibilità già presenti nel motore.";
    evaluation = scoreEvaluation(candidate);
  } else {
    level = "B3";
    reason = candidate.family.startsWith("player-")
      ? "Il segnale del singolo giocatore non coincide con il target DUO del bookmaker; serve un modello del sostituto e, per i SOT, della semantica pali/traverse."
      : candidate.family === "corner-1x2-fulltime"
        ? "Media e deviazione dei corner non forniscono la distribuzione congiunta discreta del differenziale 1/X/2."
        : candidate.family === "both-teams-sot"
          ? "Le distribuzioni marginali non forniscono una probabilità congiunta validata per entrambe le squadre."
          : "Sono disponibili centralità e deviazione dei volumi, ma non una distribuzione calibrata e validata per la soglia commerciale; la normalità sarebbe un’ipotesi aggiuntiva.";
  }
  const match = matchById.get(candidate.event.canonicalMatchId);
  const playerDiagnostic = candidate.family.startsWith("player-") ? playerSignal(candidate, lineup) : null;
  return {
    selectionId: candidate.selectionId,
    provider: odds.provider,
    providerEventId: candidate.event.providerEventId,
    regulatorEventId: candidate.event.regulatorEventId,
    providerMarketId: candidate.market.providerMarketId,
    providerSelectionId: candidate.selection.providerSelectionId,
    providerPlayerIds: candidate.market.providerPlayerIds || [],
    matchId: candidate.event.canonicalMatchId,
    fixture: `${candidate.event.home.name} – ${candidate.event.away.name}`,
    date: match.date,
    kickoff: match.kickoff,
    family: candidate.family,
    familyLabel: familyDefinitions[candidate.family].label,
    marketName: candidate.market.marketName,
    variantName: candidate.market.variantName,
    marketScope: candidate.market.marketScope,
    selection: candidate.selection.name,
    threshold: candidate.market.threshold,
    odds: Number(candidate.selection.odds),
    marketStatus: candidate.market.status,
    selectionStatus: candidate.selection.status,
    marketUpdatedAt: candidate.market.updatedAt,
    normalizationStatus: raw.status,
    rawReconciliationReasons: raw.reasons,
    sourceRule: candidate.sourceRule,
    phase5AExclusionReason: "GROUP_B_NO_COMPLETE_CANONICAL_EVALUATION",
    policyEligible,
    quoteValid,
    lineup,
    playerDiagnostic,
    level,
    reason,
    evaluation,
    technicalRisk: familyDefinitions[candidate.family].technicalRisk,
    alreadyInCurrentCatalog: currentCatalogIds.has(candidate.selectionId),
  };
});

assert(rows.every(row => !row.alreadyInCurrentCatalog), "Il Gruppo B contiene duplicati rispetto alle 160 selezioni correnti");
assert(rows.every(row => row.normalizationStatus === "VERIFIED_EXACT"), "Esistono righe B non riconciliate con il raw Sisal");

const b2FormulaValidation = [];
for (const prediction of md6Predictions) for (const combo of prediction.combinations || []) for (const leg of combo.legs || []) {
  const family = leg.market === "MULTIGOAL" ? "multigoal-match"
    : leg.market === "MULTIGOAL SQUADRA X" ? "multigoal-team"
      : leg.market === "U/O SQUADRA X" && leg.selection === "OVER" ? "team-goals-over" : null;
  if (!family || !finite(leg.probabilityPct) || !finite(leg.prudentProbabilityPct) || !finite(leg.fairOdds) || !finite(leg.expectedValuePct)) continue;
  const calculated = scoreEvaluation({
    family,
    event: { canonicalMatchId: prediction.matchId },
    market: { variantName: leg.variant, threshold: leg.threshold },
    selection: { name: leg.selection, odds: leg.odds },
  });
  assert(Math.abs(calculated.centralProbabilityPct - Number(leg.probabilityPct)) <= 0.11, `${leg.selectionId}: P centrale B2 non replica il valore serializzato`);
  assert(Math.abs(calculated.prudentProbabilityPct - Number(leg.prudentProbabilityPct)) <= 0.11, `${leg.selectionId}: P prudente B2 non replica il valore serializzato`);
  assert(Math.abs(calculated.fairOdds - Number(leg.fairOdds)) <= 0.02, `${leg.selectionId}: fair B2 non replica il valore serializzato`);
  assert(Math.abs(calculated.expectedValuePct - Number(leg.expectedValuePct)) <= 0.11, `${leg.selectionId}: EV B2 non replica il valore serializzato`);
  b2FormulaValidation.push({ selectionId: leg.selectionId, matchId: prediction.matchId, tier: combo.tier, family, serialized: { centralProbabilityPct: leg.probabilityPct, prudentProbabilityPct: leg.prudentProbabilityPct, fairOdds: leg.fairOdds, expectedValuePct: leg.expectedValuePct }, calculated });
}
assert.equal(b2FormulaValidation.length, 4, "Servono quattro controlli B2 contro gambe già serializzate dall’Engine");

const levelTotals = Object.fromEntries(["B1", "B2", "B3", "B4"].map(level => [level, rows.filter(row => row.level === level).length]));
assert.equal(sum(Object.values(levelTotals)), 886, "I livelli B1-B4 non coprono i 886 esiti");

function summarizeFamily(family) {
  const familyRows = rows.filter(row => row.family === family);
  const evaluated = familyRows.filter(row => row.evaluation);
  return {
    family,
    label: familyDefinitions[family].label,
    total: familyRows.length,
    policyEligible: familyRows.filter(row => row.policyEligible).length,
    validQuote: familyRows.filter(row => row.quoteValid).length,
    probableOrOfficialStarters: familyRows.filter(row => row.lineup.applicable && row.lineup.eligible).length,
    alreadySupportedByExistingDistribution: familyRows.filter(row => ["B1", "B2"].includes(row.level)).length,
    directTechnicalLink: familyRows.filter(row => row.level === "B1").length,
    mathematicalDerivation: familyRows.filter(row => row.level === "B2").length,
    newPredictiveCapability: familyRows.filter(row => row.level === "B3").length,
    nonEligible: familyRows.filter(row => row.level === "B4").length,
    potentialVisibleIncrementB1B2: familyRows.filter(row => ["B1", "B2"].includes(row.level)).length,
    potentialEvaluatedIncrementB1B2: familyRows.filter(row => ["B1", "B2"].includes(row.level)).length,
    evPositive: evaluated.filter(row => row.evaluation.expectedValuePct > 0).length,
    evNegative: evaluated.filter(row => row.evaluation.expectedValuePct < 0).length,
    evZero: evaluated.filter(row => row.evaluation.expectedValuePct === 0).length,
    evNotCalculable: familyRows.filter(row => !row.evaluation).length,
    technicalRisk: familyDefinitions[family].technicalRisk,
  };
}
const familySummary = Object.keys(familyDefinitions).map(summarizeFamily);

function directDnbRows() {
  const output = [];
  for (const prediction of md6Predictions) for (const comparison of prediction.marketComparison || []) {
    if (comparison.family !== "draw-no-bet") continue;
    const resolved = normalizedSelectionById.get(String(comparison.providerSelectionId));
    if (!resolved || resolved.event.canonicalMatchId !== prediction.matchId) continue;
    const selectionId = canonicalSelectionId(prediction.matchId, comparison.providerSelectionId);
    output.push({
      selectionId,
      matchId: prediction.matchId,
      providerMarketId: resolved.market.providerMarketId,
      providerSelectionId: comparison.providerSelectionId,
      selection: comparison.selection,
      odds: resolved.selection.odds,
      modelProbabilityPct: comparison.modelProbabilityPct,
      fairOdds: comparison.fairOdds,
      expectedValuePct: comparison.expectedValuePct,
      policyEligible: isPlayableSelection({ matchId: prediction.matchId, market: resolved.market.marketName, variant: resolved.market.variantName, selection: resolved.selection.name }, { matchday: 6 }),
      inCurrentCatalog: currentCatalogIds.has(selectionId),
      rawStatus: rawReconciliation({ market: resolved.market, selection: resolved.selection }).status,
    });
  }
  return output;
}

const dnb = directDnbRows();
assert.equal(dnb.length, 20, "Devono risultare 20 Draw No Bet canonici esterni al Gruppo B");
assert(dnb.every(row => row.policyEligible && !row.inCurrentCatalog && row.rawStatus === "VERIFIED_EXACT"), "DNB adiacenti non pienamente verificati");

function openOverCount(marketName) {
  return [...eventByMatch.values()].flatMap(event => event.markets).filter(market => market.marketName === marketName).flatMap(market => market.selections).filter(selection => selection.status === "open" && selection.name === "OVER" && finite(selection.odds) && selection.odds >= 1).length;
}
function openCardCount(scope) {
  return [...eventByMatch.values()].flatMap(event => event.markets).filter(market => /CARTELL|AMMON/.test(market.marketName) && market.marketScope === scope).flatMap(market => market.selections).filter(selection => selection.status === "open" && finite(selection.odds) && selection.odds >= 1).length;
}

const evRows = rows.filter(row => row.evaluation);
const summary = {
  reconstructed: rows.length,
  rawReconciled: rows.filter(row => row.normalizationStatus === "VERIFIED_EXACT").length,
  currentCatalogOverlap: rows.filter(row => row.alreadyInCurrentCatalog).length,
  levelTotals,
  policyEligible: rows.filter(row => row.policyEligible).length,
  validQuote: rows.filter(row => row.quoteValid).length,
  playerRows: rows.filter(row => row.lineup.applicable).length,
  playerStarterEligible: rows.filter(row => row.lineup.applicable && row.lineup.eligible).length,
  playerNonEligible: rows.filter(row => row.lineup.applicable && !row.lineup.eligible).length,
  b4Breakdown: {
    providerPlayerIdUnresolved: rows.filter(row => row.level === "B4" && row.lineup.identityStatus === "PROVIDER_PLAYER_ID_UNRESOLVED").length,
    reserve: rows.filter(row => row.level === "B4" && row.lineup.status === "reserve").length,
    officialNonstarter: rows.filter(row => row.level === "B4" && row.lineup.status === "official-nonstarter").length,
    policyOrQuoteOrRaw: rows.filter(row => row.level === "B4" && !row.lineup.applicable).length,
  },
  ev: {
    positive: evRows.filter(row => row.evaluation.expectedValuePct > 0).length,
    negative: evRows.filter(row => row.evaluation.expectedValuePct < 0).length,
    zero: evRows.filter(row => row.evaluation.expectedValuePct === 0).length,
    notCalculable: rows.filter(row => !row.evaluation).length,
  },
  simulations: {
    current: { visible: 160, evaluated: 144, notModelled: 16 },
    afterB1: { visible: 160 + levelTotals.B1, evaluated: 144 + levelTotals.B1, notModelled: 16 },
    afterB1B2: { visible: 160 + levelTotals.B1 + levelTotals.B2, evaluated: 144 + levelTotals.B1 + levelTotals.B2, notModelled: 16 },
    adjacentDnbIfSeparatelyApproved: { additionalB1: dnb.length, visibleAfterB1: 160 + levelTotals.B1 + dnb.length, evaluatedAfterB1: 144 + levelTotals.B1 + dnb.length },
  },
};

const result = {
  schemaVersion: 1,
  audit: "Serie A 2026/27 — Fase 5B.1",
  scope: "Diagnostic-only classification of the 886 Group B outcomes from the 2026-10-09 MD6 audit.",
  generatedAt: new Date().toISOString(),
  immutableConstraints: ["no Engine V2 changes", "no probability changes", "no original odds changes", "no normalized data changes", "no policy changes", "no MyCombo changes", "no UI changes", "no catalog expansion"],
  sources: {
    oddsRetrievedAt: odds.retrievedAt,
    predictionsGeneratedAt: predictionData.generatedAt,
    engineVersion: predictionData.engine?.version || md6Predictions[0]?.engineVersion,
    probableLineupsImportedAt: probableLineups.importedAt,
    officialMd6Fixtures: (officialLineups.fixtures || []).filter(fixture => fixture.matchday === 6).length,
    paths,
    sha256: Object.fromEntries(Object.entries(paths).map(([key, relative]) => [key, sha256(relative)])),
  },
  summary,
  familySummary,
  capabilityAudit: {
    directCanonicalProbability: "No strict Group B row has a complete direct probability for the identical provider selection; those rows were Group A or already visible.",
    scoreDistribution: "Available: expectedGoals plus the normalized Poisson score matrix and four ±10% sensitivity matrices already used by Engine V2 portfolio assessment.",
    b2FormulaValidation: { status: "PASS", samples: b2FormulaValidation.length, rows: b2FormulaValidation },
    teamVolumeDistribution: "Only central, sd, p20/p80 and sample metadata are serialized. configuredVolumeAssessment applies a Normal CDF and heuristic haircuts, but no prospective calibration evidence for commercial thresholds was found; strict B2 requirements are not met.",
    playerShots: "Individual Poisson probabilities exist for shots 1+/2+/3+ and SOT 1+/2+, but the bookmaker markets are DUO targets including the substitute; SOT DUO additionally includes posts/crossbar.",
    corner1x2: "Team corner marginals exist, but no validated joint discrete distribution for home/draw/away corner comparison exists.",
    discipline: "likelyBooked/riskScore are heuristic signals rather than calibrated probabilities and no Group B card outcome was present in the original 886 taxonomy.",
  },
  scopeAnomalies: {
    drawNoBet: { count: dnb.length, disposition: "OUTSIDE_886_DIRECT_V2_ADJACENT", rows: dnb },
    teamShotsTotal: { matchOverOpenOutside886: openOverCount("U/O TIRI TOTALI"), teamOverOpenOutside886: openOverCount("U/O TIRI TOTALI SQUADRA X"), disposition: "OUTSIDE_886_PREVIOUS_CANDIDATE_TAXONOMY" },
    cards: { playerOpenOutside886: openCardCount("player"), teamOrMatchOpenOutside886: openCardCount("match"), disposition: "OUTSIDE_886_NO_CALIBRATED_V2_PROBABILITY" },
  },
  familySummaryNotes: {
    alreadySupportedByExistingDistribution: "B1+B2 only.",
    probableOrOfficialStarters: "Applicable only to individual markets; official MD6 lineups are absent, so eligible rows use probable starters.",
    ev: "Calculated only for B1/B2. B3/B4 remain N/D.",
  },
  classifications: rows,
};

const table = (headers, body) => [
  `| ${headers.join(" | ")} |`,
  `|${headers.map(() => "---").join("|")}|`,
  ...body.map(row => `| ${row.join(" | ")} |`),
].join("\n");
const familyTable = table(
  ["Famiglia", "Totale", "Policy elig.", "Quota valida", "Titolari", "B1", "B2", "B3", "B4", "Δ vis.", "Δ eval.", "EV +", "EV −", "EV N/D", "Rischio"],
  familySummary.map(row => [row.label, row.total, row.policyEligible, row.validQuote, row.probableOrOfficialStarters, row.directTechnicalLink, row.mathematicalDerivation, row.newPredictiveCapability, row.nonEligible, row.potentialVisibleIncrementB1B2, row.potentialEvaluatedIncrementB1B2, row.evPositive, row.evNegative, row.evNotCalculable, row.technicalRisk])
);
const perMatchTable = table(
  ["Partita", "B1", "B2", "B3", "B4", "Totale"],
  [...eventByMatch.keys()].map(matchId => {
    const matchRows = rows.filter(row => row.matchId === matchId);
    return [matchRows[0]?.fixture || matchId, ...["B1", "B2", "B3", "B4"].map(level => matchRows.filter(row => row.level === level).length), matchRows.length];
  }).concat([["Totale", levelTotals.B1, levelTotals.B2, levelTotals.B3, levelTotals.B4, rows.length]])
);
const examples = rows.filter(row => row.level === "B2").sort((a, b) => b.evaluation.expectedValuePct - a.evaluation.expectedValuePct).slice(0, 5);
const exampleTable = table(
  ["Partita", "Mercato", "Esito", "Quota", "P prudente", "Fair", "EV"],
  examples.map(row => [row.fixture, row.variantName, row.selection, row.odds.toFixed(2).replace(".", ","), `${row.evaluation.prudentProbabilityPct.toFixed(1).replace(".", ",")}%`, row.evaluation.fairOdds.toFixed(2).replace(".", ","), `${row.evaluation.expectedValuePct > 0 ? "+" : ""}${row.evaluation.expectedValuePct.toFixed(1).replace(".", ",")}%`])
);
const absentTable = table(
  ["Famiglia richiesta", "Dentro gli 886", "Evidenza esterna al perimetro"],
  [
    ["Esiti partita 1X2", 0, "Già visibili/Gruppo A con confronto canonico V2."],
    ["Doppia chance 1X/X2", 0, "Già visibili/Gruppo A; la variante 12 resta esclusa dalla policy."],
    ["Draw No Bet", 0, `${dnb.length} righe canoniche dirette, aperte e ammesse dalla policy, ma classificate fuori dai 886 nell’audit originario.`],
    ["Goal/No Goal", 0, "Già visibili/Gruppo A; nei 886 compaiono invece Multigoal e Over squadra."],
    ["Tiri totali partita/squadra", 0, `${result.scopeAnomalies.teamShotsTotal.matchOverOpenOutside886} Over partita e ${result.scopeAnomalies.teamShotsTotal.teamOverOpenOutside886} Over squadra aperti fuori dalla tassonomia B originaria.`],
    ["Cartellini giocatore", 0, `${result.scopeAnomalies.cards.playerOpenOutside886} esiti aperti fuori dal Gruppo B; segnali disciplinari non calibrati.`],
    ["Cartellini squadra/partita", 0, `${result.scopeAnomalies.cards.teamOrMatchOpenOutside886} esiti aperti fuori dal Gruppo B; nessuna probabilità V2 calibrata.`],
  ]
);

const markdown = `# Serie A 2026/27 — Fase 5B.1: audit tecnico dei 886 esiti del Gruppo B

Data audit: ${reportDate}  
Ambito: esclusivamente diagnostico; nessun mercato aggiunto alla Schedina.

## Esito sintetico

- Ricostruiti **${summary.reconstructed}/886** esiti con identificativi Sisal canonici.
- Riconciliazione raw → normalizzato: **${summary.rawReconciled}/886** esatta; sovrapposizioni con le 160 selezioni correnti: **${summary.currentCatalogOverlap}**.
- Livelli: **B1 ${levelTotals.B1}**, **B2 ${levelTotals.B2}**, **B3 ${levelTotals.B3}**, **B4 ${levelTotals.B4}**.
- I **${levelTotals.B2} B2** sono esclusivamente Multigoal partita, Multigoal squadra e Over gol squadra: la probabilità è derivabile dalla matrice punteggi e dalle sensibilità già usate dall’Engine V2.
- Non esistono B1 nel perimetro stretto dei 886. Le probabilità canoniche dirette erano già confluite nel Gruppo A o nelle 35 righe iniziali.
- I volumi tiri in porta/corner non passano a B2: centralità e deviazione standard non dimostrano una distribuzione calibrata per la soglia commerciale.
- I mercati DUO non possono usare le probabilità del singolo giocatore: il target include il sostituto e, nei SOT, pali/traverse.

## 1. Riconciliazione dei 886 esiti

Ogni riga conserva partita e \`matchId\`, mercato, variante, esito, soglia, quota, \`providerMarketId\`, \`providerSelectionId\`, eventuali \`providerPlayerIds\`, stato raw/normalizzato, filtro policy, titolarità e motivo della classificazione. Il dettaglio completo è nel JSON strutturato \`${path.relative(root, jsonOutput).replace(/\\/g, "/")}\`.

Il raw Sisal \`${paths.rawOdds}\` e il normalizzato \`${paths.odds}\` coincidono per tutti gli 886 esiti su ID mercato/esito, nome mercato, variante, soglia, esito, quota e stato. Tutte le quote sono aperte e numericamente valide nel perimetro ricostruito.

Il motivo comune del mancato recupero in Fase 5A è \`GROUP_B_NO_COMPLETE_CANONICAL_EVALUATION\`: nessuna di queste righe disponeva già del contratto completo P/fair/EV per l’identico \`providerSelectionId\`.

${perMatchTable}

## 2. Classificazione completa per famiglia

“Titolari” conta soltanto i mercati individuali riconciliati tramite \`providerPlayerId\` → \`playerId\` canonico e presenti nell’XI ufficiale o, in assenza dell’ufficiale, nell’XI probabile. “EV N/D” non viene trasformato in zero.

${familyTable}

Totale controllato: **${familySummary.reduce((total, row) => total + row.total, 0)}**.

## 3. Capacità effettive dell’Engine V2

### Disponibili e utilizzabili senza nuove ipotesi

- Distribuzione discreta dei punteggi ottenuta da \`expectedGoals.home/away\` con matrice Poisson normalizzata 0–7.
- Quattro matrici di sensibilità già usate dal motore: λ casa/trasferta variati di ±10%.
- Predicati già esistenti per Multigoal, Multigoal squadra e U/O gol squadra.
- Formula B2: somma delle celle compatibili; probabilità prudente uguale al minimo fra matrice centrale e sensibilità; fair \`1/P\`; EV \`P × quota − 1\`.
- Validazione formula: **${b2FormulaValidation.length}/${b2FormulaValidation.length}** gambe omologhe già serializzate dall’Engine replicate entro la tolleranza di arrotondamento per P centrale, P prudente, fair ed EV.

### Presenti ma non sufficienti per B2

- Tiri in porta e corner di squadra/partita: sono serializzati media centrale, deviazione standard, p20/p80 e campione. \`configuredVolumeAssessment\` applica una CDF normale e haircut euristici 0,92/0,90, ma non è stata trovata una validazione prospettica/calibrazione delle probabilità per soglia. Usarla come B2 introdurrebbe un’assunzione statistica non certificata.
- Tiri giocatore: esistono probabilità Poisson individuali per 1+/2+/3+ tiri e 1+/2+ SOT. Non coincidono con il contratto DUO Sisal.
- \`CALCI ANGOLO 1X2 T.R.\`: le marginali casa/trasferta non forniscono la distribuzione congiunta discreta del differenziale corner né la massa del pareggio.
- Cartellini: \`likelyBooked\`/\`riskScore\` restano euristiche non calibrate, non probabilità di mercato.

## 4. Livelli B1/B2/B3/B4

- **B1 — ${levelTotals.B1}:** nessun collegamento diretto nel perimetro stretto dei 886.
- **B2 — ${levelTotals.B2}:** derivazioni dalla matrice punteggi già prodotta e dai predicati esistenti.
- **B3 — ${levelTotals.B3}:** richiedono una distribuzione/calibrazione nuova o un target predittivo differente.
- **B4 — ${levelTotals.B4}:** non eleggibili dopo riconciliazione identità/titolarità/policy/quota.

Tutti i motivi sono serializzati per singolo esito nel JSON. Le classificazioni non sono state assegnate per semplice somiglianza testuale.

## 5. Mercati giocatore

- Esiti DUO complessivi nel Gruppo B: **${summary.playerRows}**.
- Titolari probabili/ufficiali eleggibili: **${summary.playerStarterEligible}**.
- Non eleggibili o identità non risolvibile: **${summary.playerNonEligible}**.
- Dettaglio B4: **${summary.b4Breakdown.providerPlayerIdUnresolved}** senza crosswalk affidabile \`providerPlayerId → playerId\`, **${summary.b4Breakdown.reserve}** riserve, **${summary.b4Breakdown.officialNonstarter}** non titolari ufficiali, **${summary.b4Breakdown.policyOrQuoteOrRaw}** esclusioni per policy/quota/raw.
- Formazioni ufficiali MD6 disponibili: **${result.sources.officialMd6Fixtures}**; in loro assenza è stata usata la fonte probabile Fantacalcio del ${probableLineups.importedAt}.

L’identità è stata risolta usando i \`providerPlayerIds\` Sisal già collegati dall’Engine a un \`playerId\` canonico, poi verificata sulla formazione. Le probabilità individuali vengono conservate soltanto come diagnostica di incompatibilità e non sono usate per calcolare fair o EV del DUO.

## 6. Famiglie richieste ma assenti dai 886

${absentTable}

Questa è un’anomalia di perimetro del vecchio audit, non una ragione per alterare retroattivamente il totale 886. In particolare i **${dnb.length} Draw No Bet** sono una coda B1 adiacente: hanno P/fair/EV canonici, quota aperta e policy ammessa, ma il generatore li escludeva prima della tassonomia Gruppo B.

## 7. EV diagnostico

- EV positivo: **${summary.ev.positive}**.
- EV negativo: **${summary.ev.negative}**.
- EV esattamente zero: **${summary.ev.zero}**.
- EV non calcolabile senza nuova capacità: **${summary.ev.notCalculable}**.

I valori sono calcolati soltanto per i B2 e non costituiscono nuove previsioni. Esempi con EV B2 più alto, non raccomandazioni:

${exampleTable}

## 8. Simulazioni senza modifica dei dati

| Scenario | Selezioni visibili | Con valutazione V2 | NOT_MODELLED |
|---|---:|---:|---:|
| Catalogo Fase 5A | ${summary.simulations.current.visible} | ${summary.simulations.current.evaluated} | ${summary.simulations.current.notModelled} |
| Dopo soli B1 del perimetro 886 | ${summary.simulations.afterB1.visible} | ${summary.simulations.afterB1.evaluated} | ${summary.simulations.afterB1.notModelled} |
| Dopo B1+B2 del perimetro 886 | ${summary.simulations.afterB1B2.visible} | ${summary.simulations.afterB1B2.evaluated} | ${summary.simulations.afterB1B2.notModelled} |

Scenario separato, subordinato a correzione esplicita del perimetro: i ${dnb.length} DNB porterebbero il catalogo B1 a **${summary.simulations.adjacentDnbIfSeparatelyApproved.visibleAfterB1}** righe, di cui **${summary.simulations.adjacentDnbIfSeparatelyApproved.evaluatedAfterB1}** valutate. Non sono inclusi nelle simulazioni ufficiali dei 886.

## 9. Priorità proposta per la sottofase successiva

1. **Correggere/decidere la tassonomia DNB**: 20 collegamenti diretti ad alta affidabilità, ma fuori dal perimetro 886 originario. Nessuna implementazione senza approvazione esplicita.
2. **B2 matrice punteggi (${levelTotals.B2})**: Multigoal partita, Multigoal squadra, Over squadra. Impatto alto, rischio medio-basso; riusare i predicati e le sensibilità già esistenti.
3. **Validazione prospettica dei volumi**: SOT e corner full-match. Non promuovere finché la CDF per soglia non supera un gate di calibrazione.
4. **Modello corner 1X2**: richiede distribuzione congiunta/differenziale e massa del pareggio.
5. **DUO giocatore**: ultimo per priorità; richiede modellazione del sostituto, semantica pali/traverse e settlement coerente.

Le quote elevate non sono state usate come criterio di priorità.

## 10. File e funzioni candidati per una futura implementazione

Nessuno di questi file è stato modificato in questa fase diagnostica.

- \`scripts/predictions/engine.js\`: condividere in un modulo puro \`configuredScorePredicate\`, matrici di sensibilità e valutazione per singolo esito; non cambiare le probabilità.
- \`scripts/md06-market-catalog.js\`: importare in futuro soltanto B1/B2 approvati, con deduplica rispetto alle 160 righe.
- \`scripts/build-md06-betting-decision-package.mjs\`: integrare il nuovo layer diagnostico/contrattuale dopo approvazione.
- \`scripts/betting-selection-contract.js\`: serializzare provenienza della derivazione B2 e distinzione central/prudent.
- \`scripts/generate-mycombo-md01.js\`: rivedere la classificazione DNB e l’attuale assessment all-or-nothing; non necessario per calcolare i B2 singoli.
- \`scripts/test-schedina-md06.js\` e \`scripts/test-betting-selection-contract.js\`: aggiungere invarianti su predicato, soglia, identità e formula.
- \`js/pages/betting.js\`: nessuna nuova logica probabilistica; dovrà solo rendere contratti già calcolati, se approvati.

## 11. Vincoli e stato

Non sono stati modificati Engine V2, probabilità esistenti, quote, dati normalizzati, policy, MyCombo, interfaccia, archivi MD1–MD5 o Champions. Non sono state aggiunte selezioni alla Schedina. Gli artefatti prodotti sono esclusivamente questo report, il JSON diagnostico e lo script ripetibile dell’audit.

Il worktree contiene l’unico artefatto estraneo non tracciato \`scripts/create-champions-data-recovery-control.js\`, preesistente e fuori ambito; non è stato toccato da questo audit.
`;

fs.mkdirSync(path.dirname(jsonOutput), { recursive: true });
fs.writeFileSync(jsonOutput, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(markdownOutput, markdown);
console.log(`OK audit Gruppo B: ${rows.length} esiti · B1 ${levelTotals.B1} · B2 ${levelTotals.B2} · B3 ${levelTotals.B3} · B4 ${levelTotals.B4}`);
console.log(`Report: ${path.relative(root, markdownOutput)}`);
console.log(`JSON: ${path.relative(root, jsonOutput)}`);
