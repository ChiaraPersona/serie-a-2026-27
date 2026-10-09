import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settleArchivedLeg } from "../js/pages/betting-settlement.mjs";
import bettingMarketPolicy from "./betting-market-policy.js";
import bettingSelectionContract from "./betting-selection-contract.js";

const { isUnderPlayableSelection, isIndividualPlayerFoulMarket, isPlayableSelection } = bettingMarketPolicy;
const { attachBetSelection, selectionIdFor, normalizeReliability } = bettingSelectionContract;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
};
const mode = process.argv.includes("--integrate") ? "integrate" : "reports";
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const round = (value, digits = 4) => finite(value) ? Number(Number(value).toFixed(digits)) : null;
const pct = value => finite(value) ? `${Number(value).toFixed(1)}%` : "N/D";
const probPct = value => finite(value) ? `${(Number(value) * 100).toFixed(1)}%` : "N/D";
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const product = values => values.reduce((result, value) => result * Number(value), 1);
const table = (headers, rows) => {
  const esc = value => String(value ?? "N/D").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [`| ${headers.map(esc).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map(row => `| ${row.map(esc).join(" | ")} |`)].join("\n");
};

const matches = read("data/normalized/matches.json");
const predictionsData = read("data/normalized/predictions.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const md5 = read("data/normalized/schedina-md05.json");
const settlementRecords = read("data/sources/card-settlement-records-2026-10-03.json").records;
const operational = read("output/reports/serie-a-md06-operational-player-analysis-2026-10-09.json");
const matchById = new Map(matches.map(match => [match.id, match]));
const predictionById = new Map(predictionsData.predictions.map(prediction => [prediction.matchId, prediction]));
const eventById = new Map(odds.events.map(event => [event.canonicalMatchId, event]));
const operationalById = new Map(operational.fixtures.map(fixture => [fixture.matchId, fixture]));
const sisalSelectionById = new Map(odds.events.flatMap(event => event.markets.flatMap(market => market.selections.map(selection => [String(selection.providerSelectionId), { event, market, selection }]))));
const settle = leg => settleArchivedLeg(leg, matchById.get(leg.matchId), settlementRecords);
const quoteSource = {
  provider: odds.provider,
  retrievedAt: odds.retrievedAt,
  sourceUrl: odds.sourceUrl,
  snapshotPath: "data/normalized/odds/sisal/serie-a.json",
  rawFile: odds.rawFile,
  acquisition: odds.acquisition,
};

function familyKey(leg) {
  const market = String(leg.market || "").toUpperCase();
  if (/1X2|DOPPIA CHANCE|DRAW NO BET/.test(market)) return "1X2 / DC / DNB";
  if (market === "UNDER/OVER" || /U\/O GOAL/.test(market)) return "Under/Over gol";
  if (/MULTIGOAL/.test(market)) return "Multigol";
  if (/CORNER/.test(market)) return "Corner";
  if (/TIRI TOTALI SQUADRA|TIRI TOTALI$/.test(market)) return "Tiri squadra";
  if (/TIRI TOTALI GIOCATORE/.test(market)) return "Tiri giocatore";
  if (/TIRI IN PORTA GIOCATORE/.test(market)) return "SOT giocatore";
  if (/MARCATORE|ASSIST/.test(market)) return "Marcatori e assist";
  if (/CARTELLIN/.test(market) || leg.marketFamily === "Ammoniti") return "Cartellini";
  return "Altri mercati";
}

function semanticallyComparableProbability(leg) {
  if (!finite(leg.modelProbabilityPct)) return false;
  const family = familyKey(leg);
  if (["Tiri giocatore", "SOT giocatore", "Marcatori e assist", "Cartellini"].includes(family)) return false;
  if (leg.probabilitySemantics || /\(DUO\)/i.test(leg.market || "")) return false;
  return true;
}

const md5SlipReviews = md5.slips.map(slip => {
  const legs = slip.legs.map(leg => ({ leg, settlement: settle(leg) }));
  const counts = legs.reduce((result, row) => {
    result[row.settlement.status] = (result[row.settlement.status] || 0) + 1;
    return result;
  }, { won: 0, lost: 0, void: 0, unavailable: 0, pending: 0 });
  const verifiable = counts.won + counts.lost;
  const fullStatus = counts.lost > 0 ? "LOST" : counts.unavailable + counts.pending > 0 ? "UNVERIFIABLE" : "WON";
  const effectiveOdds = fullStatus === "WON" ? product(legs.filter(row => row.settlement.status === "won").map(row => row.leg.odds)) : null;
  const grossReturn = fullStatus === "LOST" ? 0 : fullStatus === "WON" ? effectiveOdds : null;
  return {
    id: slip.id,
    name: slip.name,
    type: slip.type,
    selections: slip.legs.length,
    counts,
    verifiable,
    hitRatePct: verifiable ? round(counts.won / verifiable * 100, 2) : null,
    originalCombinedOdds: slip.combinedOdds,
    declaredJointProbabilityPct: slip.jointModelProbabilityPct,
    declaredExpectedValuePct: slip.expectedValuePct,
    originalQualityStatus: slip.qualityStatus,
    fullSlipStatus: fullStatus,
    unitStakeGrossReturn: grossReturn,
    unitStakeNetReturn: grossReturn == null ? null : round(grossReturn - 1, 2),
    unavailableLabels: legs.filter(row => ["unavailable", "pending"].includes(row.settlement.status)).map(row => row.leg.label),
  };
});

const md5FamilyMap = new Map();
for (const slip of md5.slips) for (const leg of slip.legs) {
  const family = familyKey(leg);
  const bucket = md5FamilyMap.get(family) || { family, observations: 0, won: 0, lost: 0, void: 0, unavailable: 0, pending: 0, comparableProbabilities: [] };
  const status = settle(leg).status;
  bucket.observations += 1;
  bucket[status] = (bucket[status] || 0) + 1;
  if (semanticallyComparableProbability(leg)) bucket.comparableProbabilities.push(Number(leg.modelProbabilityPct));
  md5FamilyMap.set(family, bucket);
}
const requiredFamilies = ["1X2 / DC / DNB", "Under/Over gol", "Multigol", "Corner", "Tiri squadra", "Tiri giocatore", "SOT giocatore", "Marcatori e assist", "Cartellini", "Altri mercati"];
const md5Families = requiredFamilies.map(family => {
  const bucket = md5FamilyMap.get(family) || { family, observations: 0, won: 0, lost: 0, void: 0, unavailable: 0, pending: 0, comparableProbabilities: [] };
  const decided = bucket.won + bucket.lost;
  const averagePredictedProbabilityPct = bucket.comparableProbabilities.length ? round(bucket.comparableProbabilities.reduce((sum, value) => sum + value, 0) / bucket.comparableProbabilities.length, 2) : null;
  const hitRatePct = decided ? round(bucket.won / decided * 100, 2) : null;
  return {
    ...bucket,
    decided,
    hitRatePct,
    averagePredictedProbabilityPct,
    descriptiveGapPp: hitRatePct != null && averagePredictedProbabilityPct != null ? round(hitRatePct - averagePredictedProbabilityPct, 2) : null,
    sampleLimit: bucket.observations < 10 ? "campione molto piccolo" : bucket.observations < 25 ? "campione piccolo" : "un solo turno, non calibrazione",
  };
});

const md5Predictions = predictionsData.predictions.filter(prediction => prediction.matchId.endsWith("-md-05"));
const myComboReviews = md5Predictions.map(prediction => {
  const combo = prediction.combinations?.find(item => item.tier === "Safe" && Array.isArray(item.legs));
  if (!combo?.legs?.length) return { matchId: prediction.matchId, status: "N/D", legs: 0, won: 0, lost: 0, void: 0, unavailable: 0 };
  const fixture = matchById.get(prediction.matchId);
  const rows = combo.legs.map(leg => settleArchivedLeg({ ...leg, fixture: prediction.matchId }, fixture, settlementRecords));
  const counts = rows.reduce((result, row) => (result[row.status] = (result[row.status] || 0) + 1, result), { won: 0, lost: 0, void: 0, unavailable: 0 });
  return { matchId: prediction.matchId, status: "REVIEWED", legs: combo.legs.length, ...counts };
});

const md5Report = {
  schemaVersion: 1,
  reportType: "serie-a-md05-betting-decision-review",
  generatedAt: new Date().toISOString(),
  scope: "Decision audit only. Historical scores, settlements, models and archived MD5 data are read-only.",
  source: { schedina: "data/normalized/schedina-md05.json", settlementRecords: "data/sources/card-settlement-records-2026-10-03.json", matches: "data/normalized/matches.json" },
  totals: md5.slips.flatMap(slip => slip.legs).map(settle).reduce((result, settlement) => (result[settlement.status] = (result[settlement.status] || 0) + 1, result), { won: 0, lost: 0, void: 0, unavailable: 0, pending: 0 }),
  slips: md5SlipReviews,
  marketFamilies: md5Families,
  myCombo: {
    matchesReviewed: myComboReviews.length,
    portfoliosWithSelections: myComboReviews.filter(row => row.legs > 0).length,
    totals: myComboReviews.reduce((result, row) => ({ won: result.won + row.won, lost: result.lost + row.lost, void: result.void + row.void, unavailable: result.unavailable + row.unavailable, legs: result.legs + row.legs }), { won: 0, lost: 0, void: 0, unavailable: 0, legs: 0 }),
    matches: myComboReviews,
  },
  errors: {
    forecasting: "Nessun errore di calibrazione dimostrabile da un solo turno; gli scostamenti per famiglia sono descrittivi.",
    selection: "Le multiple giocatore da otto gambe e i poker cartellini hanno sommato rischi di minuti, identità e target non calibrati.",
    combination: "Le multiple da 8-10 gambe amplificano fragilità e dipendenze; la probabilità congiunta non è difendibile quando i target non sono indipendenti.",
    semantics: "Probabilità individuali e proxy cartellini sono state accostate a target DUO; per i SOT Sisal includeva anche pali e traverse.",
    qualification: "I poker cartellini risultavano qualificati tramite proxy euristiche ed EV non validati: questa qualificazione va esclusa.",
  },
  criteria: [
    { criterion: "Poche gambe e partite distinte", evidence: "Le giocate singole hanno prodotto 26 vinte, 17 perse e 2 void, mentre tutte le multiple con almeno una perdita hanno rendimento -1 su stake unitario.", decision: "CONSERVARE", motivation: "Limitare la propagazione di un singolo errore." },
    { criterion: "Target e probabilità semanticamente allineati", evidence: "DUO giocatore, SOT con pali/traverse e cartellini non coincidono con le probabilità individuali/proxy.", decision: "ESCLUDERE", motivation: "Nessun EV certificato su target incompatibili." },
    { criterion: "Qualifica basata su EV validato", evidence: "I poker cartellini avevano EV dichiarati molto elevati ma probabilità euristiche non calibrate.", decision: "MODIFICARE", motivation: "Usare EV solo dove target, settlement e validazione coincidono." },
    { criterion: "Void e unavailable espliciti", evidence: "MD5 contiene 2 void; le MyCombo hanno 1 unavailable.", decision: "CONSERVARE", motivation: "Non trasformare dati mancanti in sconfitte o zeri." },
    { criterion: "Nessuna ottimizzazione su MD5", evidence: "Un solo turno non stima calibrazione né soglie stabili.", decision: "CONSERVARE", motivation: "Usare MD5 per errori di processo, non per rifittare parametri." },
  ],
};

function classifyPlayerCandidate(player, type) {
  const market = type === "shots" ? player.sisal.shots1Plus : player.sisal.sot1Plus;
  const probability = type === "shots" ? player.shotProbabilities.over05 : player.shotOnTargetProbabilities.over05;
  const marketName = type === "shots" ? "1+ tiri" : "1+ SOT";
  const compatibility = market.presence ? "DUO_INCOMPATIBILE_CON_V2_INDIVIDUALE" : "QUOTA_NON_DISPONIBILE";
  let classification;
  let reason;
  if (market.presence && market.identityStatus !== "VERIFIED") {
    classification = "ESCLUSO";
    reason = `identità Sisal da rivedere: ${market.variantName || "etichetta N/D"}`;
  } else if (!market.presence) {
    classification = "ESCLUSO";
    reason = "mercato Sisal non disponibile; nessuna quota inventata";
  } else if (player.fallbackUsed) {
    classification = "ESCLUSO";
    reason = "fallback attivo";
  } else if (player.reliability.level === "BASSA" || player.substitutionRisk === "high" || player.maturity.signalStatus === "low" || player.maturity.signalStatus === "unknown") {
    classification = "WATCH";
    reason = `${player.reliability.rationale}; rivalutare con XI ufficiale`;
  } else if ((player.outsider.qualifiedShots && type === "shots") || (player.outsider.qualifiedSot && type === "sot")) {
    classification = "OUTSIDER";
    reason = `gate outsider V2 superato; ${player.reliability.rationale}`;
  } else if (player.reliability.level === "ALTA") {
    classification = "PRINCIPALE";
    reason = `${player.reliability.rationale}; target commerciale DUO non confrontabile`;
  } else {
    classification = "INTERESSANTE";
    reason = `${player.reliability.rationale}; rischio residuo da monitorare`;
  }
  return {
    matchId: null,
    fixture: null,
    playerId: player.playerId,
    player: player.name,
    team: player.team,
    teamId: player.teamId,
    market: marketName,
    type,
    individualV2Probability: probability,
    projectedShots: player.projectedShots,
    projectedSot: player.projectedShotsOnTarget,
    expectedMinutes: player.expectedMinutes,
    starterProbability: player.starterProbability,
    substitutionRisk: player.substitutionRisk,
    signalStatus: player.maturity.signalStatus,
    maturity: player.maturity,
    fallbackUsed: player.fallbackUsed,
    matchup: player.matchup,
    previousDelta: null,
    reliability: player.reliability,
    sisalOdds: market.presence ? market.odds : null,
    sisalUpdatedAt: market.presence ? market.updatedAt : null,
    providerMarketId: market.presence ? market.providerMarketId : null,
    providerSelectionId: market.presence ? market.providerSelectionId : null,
    compatibility,
    evStatus: "EV_NON_CALCOLABILE",
    classification,
    reason,
  };
}

function chooseDisplayCandidates(fixture) {
  const changes = new Map(operational.comparison.largestChanges.filter(row => row.matchId === fixture.matchId).map(row => [row.playerId, row.deltas]));
  const shots = fixture.players.map(player => classifyPlayerCandidate(player, "shots")).sort((left, right) => right.individualV2Probability - left.individualV2Probability);
  const sot = fixture.players.map(player => classifyPlayerCandidate(player, "sot")).sort((left, right) => right.individualV2Probability - left.individualV2Probability);
  const used = new Set();
  const take = (pool, count, analysisSection, allowed = () => true) => pool
    .filter(row => !used.has(row.playerId) && allowed(row))
    .slice(0, count)
    .map(row => (used.add(row.playerId), { ...row, analysisSection }));
  const selected = [
    ...take(shots, 3, "MIGLIORI_TIRI"),
    ...take(sot, 3, "MIGLIORI_SOT"),
    ...take([...shots, ...sot].sort((a, b) => b.individualV2Probability - a.individualV2Probability), 2, "OUTSIDER", row => row.classification === "OUTSIDER"),
    ...take([...shots, ...sot].sort((a, b) => b.individualV2Probability - a.individualV2Probability), 2, "WATCH", row => row.classification === "WATCH"),
    ...take([...shots, ...sot].sort((a, b) => b.individualV2Probability - a.individualV2Probability), 2, "ESCLUSI", row => row.classification === "ESCLUSO"),
  ];
  return selected.map(row => ({ ...row, matchId: fixture.matchId, fixture: fixture.matchLabel, previousDelta: changes.get(row.playerId) || null }));
}

function poissonCdf(lambda, maximum) {
  let term = Math.exp(-lambda);
  let total = term;
  for (let value = 1; value <= maximum; value += 1) {
    term *= lambda / value;
    total += term;
  }
  return total;
}

function resolveDoubleChance(matchId, selection) {
  const event = eventById.get(matchId);
  const prediction = predictionById.get(matchId);
  const market = event.markets.find(item => item.marketName === "DOPPIA CHANCE" && item.status === "open");
  const quote = market?.selections.find(item => item.name === selection && item.status === "open");
  assert(market && quote, `${matchId}: doppia chance ${selection} non disponibile`);
  const probability = [...selection].reduce((sum, outcome) => sum + Number(prediction.probabilities.final[outcome] || 0), 0) / 100;
  const legacy = {
    matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: "match",
    marketFamily: "Esito",
    selection,
    label: selection === "1X" ? `${event.home.name} o pareggio (1X)` : selection === "X2" ? `${event.away.name} o pareggio (X2)` : "Nessun pareggio (12)",
    odds: quote.odds,
    modelProbabilityPct: round(probability * 100, 2),
    expectedValuePct: round((probability * quote.odds - 1) * 100, 2),
    evidenceLabel: `P V2 esiti aggregata ${pct(probability * 100)} · target compatibile`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: quote.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "COMPATIBILE",
    evStatus: "EV_CALCOLABILE",
    fairOdds: round(1 / probability, 2),
    overlapKey: "result-fulltime",
    semanticKeys: ["result-fulltime"],
  };
  return attachBetSelection(legacy, {
    provider: odds.provider,
    marketObject: market,
    selectionObject: quote,
    quoteSource,
    classification: null,
    reliability: { level: "Non valutabile", reason: "Il report decisionale MD6 non assegna un livello di affidabilità operativo ai mercati squadra." },
    compatibility: { status: "COMPATIBILE", reason: "Target Doppia Chance e probabilità V2 sugli esiti coincidono." },
    modelTarget: "Doppia Chance sul risultato finale",
    bookmakerTarget: `${market.marketName} · ${selection}`,
  });
}

function resolveGoals(matchId, selection, threshold) {
  const event = eventById.get(matchId);
  const prediction = predictionById.get(matchId);
  const market = event.markets.find(item => item.marketName === "UNDER/OVER" && Number(item.threshold) === threshold && item.status === "open");
  const quote = market?.selections.find(item => item.name === selection && item.status === "open");
  assert(market && quote, `${matchId}: ${selection} ${threshold} non disponibile`);
  const lambda = Number(prediction.expectedGoals.home) + Number(prediction.expectedGoals.away);
  const under = poissonCdf(lambda, Math.floor(threshold));
  const probability = selection === "UNDER" ? under : 1 - under;
  return {
    matchId,
    fixture: `${event.home.name} – ${event.away.name}`,
    startsAt: event.startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: "match",
    marketFamily: "Under/Over",
    selection,
    label: `${selection === "UNDER" ? "Under" : "Over"} ${String(threshold).replace(".", ",")} gol`,
    odds: quote.odds,
    modelProbabilityPct: round(probability * 100, 2),
    expectedValuePct: round((probability * quote.odds - 1) * 100, 2),
    evidenceLabel: `Poisson su xG totali ${round(lambda, 2)} · ricerca, non calibrazione specifica soglia`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: quote.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "COMPATIBILE_TARGET",
    evStatus: "EV_RESEARCH_ONLY",
  };
}

function resolvePlayer(matchId, playerName, type) {
  const fixture = operationalById.get(matchId);
  const player = fixture.players.find(item => clean(item.name) === clean(playerName));
  assert(player, `${matchId}: giocatore ${playerName} non trovato`);
  const market = type === "shots" ? player.sisal.shots1Plus : player.sisal.sot1Plus;
  assert(market.presence && market.identityStatus === "VERIFIED", `${matchId}: mercato ${playerName} non verificato`);
  const probability = type === "shots" ? player.shotProbabilities.over05 : player.shotOnTargetProbabilities.over05;
  const assessment = classifyPlayerCandidate(player, type);
  const legacy = {
    matchId,
    fixture: fixture.matchLabel.replace(" - ", " – "),
    startsAt: eventById.get(matchId).startsAt,
    market: market.marketName,
    variant: market.variantName,
    marketScope: "player",
    marketFamily: type === "shots" ? "Tiri giocatore" : "Tiri in porta giocatore",
    player: player.name,
    playerId: player.playerId,
    teamId: player.teamId,
    selection: "OVER",
    label: `${player.name} almeno 1 ${type === "shots" ? "tiro" : "tiro in porta"} · sostituto incluso`,
    odds: market.odds,
    modelProbabilityPct: null,
    individualV2ProbabilityPct: round(probability * 100, 2),
    expectedValuePct: null,
    evidenceLabel: `P V2 individuale ${pct(probability * 100)} · ${round(player.expectedMinutes, 1)} minuti · Sisal DUO`,
    providerMarketId: market.providerMarketId,
    providerSelectionId: market.providerSelectionId,
    marketUpdatedAt: market.updatedAt,
    compatibility: "INCOMPATIBILE_DUO",
    probabilitySemantics: type === "shots" ? "INDIVIDUAL_V2_VS_PLAYER_PLUS_SUBSTITUTE" : "INDIVIDUAL_V2_VS_DUO_POSTS_CROSSBAR_EXTRA_TIME",
    evStatus: "EV_NON_CALCOLABILE",
    classification: assessment.classification,
    classificationReason: assessment.reason,
    reliability: normalizeReliability(assessment.reliability),
    overlapKey: `player-volume-${player.playerId}-${type}`,
    semanticKeys: [`player-volume-${player.playerId}-${type}`],
  };
  return attachBetSelection(legacy, {
    provider: odds.provider,
    marketObject: {
      marketName: market.marketName,
      variantName: market.variantName,
      marketScope: "player",
      providerMarketId: market.providerMarketId,
      updatedAt: market.updatedAt,
    },
    selectionObject: { name: "OVER", providerSelectionId: market.providerSelectionId, odds: market.odds, status: "open" },
    quoteSource,
    classification: assessment.classification,
    classificationReason: assessment.reason,
    reliability: assessment.reliability,
    compatibility: {
      status: "INCOMPATIBILE_DUO",
      reason: "La probabilità V2 è individuale; la quota copre giocatore e sostituto e può includere ulteriori regole bookmaker.",
      modelTarget: type === "shots" ? "Almeno un tiro del giocatore" : "Almeno un tiro in porta del giocatore",
      bookmakerTarget: `${market.marketName} · ${market.variantName}`,
    },
    individualModelProbabilityPct: round(probability * 100, 2),
    modelProbabilityPct: null,
    fairOdds: null,
    expectedValuePct: null,
    warnings: ["MODEL_BOOKMAKER_TARGET_MISMATCH"],
    risks: [player.substitutionRisk ? `SUBSTITUTION_RISK_${String(player.substitutionRisk).toUpperCase()}` : null].filter(Boolean),
  });
}

function buildSlip({ id, type, eyebrow, name, description, validationStatus, risk, legs }) {
  assert(!legs.some(isUnderPlayableSelection), `${id}: una selezione Under non può essere resa giocabile dalla MD6`);
  assert(legs.every(leg => isPlayableSelection(leg, { matchday: 6 })), `${id}: un mercato escluso dalla policy MD6 non può essere reso giocabile`);
  assert(!legs.some(leg => leg.betSelection?.operational?.classification === "WATCH"), `${id}: un WATCH non può essere promosso automaticamente in schedina`);
  const combinedOdds = round(product(legs.map(leg => leg.odds)), 2);
  const jointAllowed = legs.every(leg => Number.isFinite(leg.modelProbabilityPct)) && new Set(legs.map(leg => leg.matchId)).size === legs.length;
  const jointProbability = jointAllowed ? product(legs.map(leg => leg.modelProbabilityPct / 100)) : null;
  return {
    id,
    type,
    number: null,
    eyebrow,
    name,
    description,
    validationStatus,
    risk,
    dependencyNote: new Set(legs.map(leg => leg.matchId)).size === legs.length ? "Partite distinte; nessuna dipendenza intrapartita sommata." : "Dipendenze presenti: probabilità congiunta non calcolata.",
    reviewConditions: "Rivedere dopo XI ufficiali, variazioni quote o sospensione del mercato.",
    marketFamilies: [...new Set(legs.map(leg => leg.marketFamily))],
    combinedOdds,
    jointModelProbabilityPct: jointProbability == null ? null : round(jointProbability * 100, 6),
    fairOdds: jointProbability ? round(1 / jointProbability, 2) : null,
    expectedValuePct: jointProbability == null ? null : round((jointProbability * combinedOdds - 1) * 100, 2),
    qualityStatus: validationStatus === "EV_CALCOLABILE" ? "operativa" : "laboratorio",
    qualityLabel: validationStatus,
    excludedLegsCount: 0,
    filterNote: validationStatus === "EV_NON_CALCOLABILE" ? "Quota totale commerciale; nessuna probabilità congiunta o EV certificato." : "Nessuna garanzia di successo; stato operativo, non certificazione.",
    weakestLeg: null,
    legs,
  };
}

const slips = [
  buildSlip({
    id: "intermedia-doppia-chance-compatibile",
    type: "team-markets",
    eyebrow: "Target compatibili · tre partite",
    name: "Intermedia doppia chance",
    description: "Tre doppie chance su gare distinte, scelte per coerenza V2 e non per quota minima.",
    validationStatus: "EV_CALCOLABILE",
    risk: "medio",
    legs: [resolveDoubleChance("como-roma-2026-27-md-06", "1X"), resolveDoubleChance("genoa-fiorentina-2026-27-md-06", "1X"), resolveDoubleChance("torino-udinese-2026-27-md-06", "X2")],
  }),
  buildSlip({
    id: "giocatori-duo-osservazionale",
    type: "player-only",
    eyebrow: "Giocatori · riferimento commerciale",
    name: "Tre profili DUO da monitorare",
    description: "Profili individuali robusti, ma quote riferite a giocatore più sostituto: multipla non statisticamente qualificata.",
    validationStatus: "EV_NON_CALCOLABILE",
    risk: "alto · incompatibilità semantica",
    legs: [resolvePlayer("genoa-fiorentina-2026-27-md-06", "Milutin Osmajić", "sot"), resolvePlayer("lecce-bologna-2026-27-md-06", "Lassana Coulibaly", "shots"), resolvePlayer("cagliari-juventus-2026-27-md-06", "Alessandro Romano", "shots")],
  }),
].map((slip, index) => ({ ...slip, number: index + 1 }));

const assessmentBySelectionId = new Map();
for (const fixture of operational.fixtures) {
  for (const player of fixture.players) {
    for (const type of ["shots", "sot"]) {
      const assessment = classifyPlayerCandidate(player, type);
      if (!assessment.providerSelectionId) continue;
      const selectionId = selectionIdFor({ matchId: fixture.matchId, provider: odds.provider, providerSelectionId: assessment.providerSelectionId });
      const row = {
        selectionId,
        matchId: fixture.matchId,
        provider: odds.provider,
        providerMarketId: String(assessment.providerMarketId),
        providerSelectionId: String(assessment.providerSelectionId),
        classification: assessment.classification,
        classificationReason: assessment.reason,
        reliability: normalizeReliability(assessment.reliability),
        compatibility: {
          status: "INCOMPATIBILE_DUO",
          reason: "Il modello V2 stima il giocatore individuale; la selezione commerciale è DUO.",
          modelTarget: type === "shots" ? "Almeno un tiro del giocatore" : "Almeno un tiro in porta del giocatore",
          bookmakerTarget: `${type === "shots" ? player.sisal.shots1Plus.marketName : player.sisal.sot1Plus.marketName} · ${type === "shots" ? player.sisal.shots1Plus.variantName : player.sisal.sot1Plus.variantName}`,
        },
        warnings: ["MODEL_BOOKMAKER_TARGET_MISMATCH"],
        risks: [player.substitutionRisk ? `SUBSTITUTION_RISK_${String(player.substitutionRisk).toUpperCase()}` : null].filter(Boolean),
      };
      const previous = assessmentBySelectionId.get(selectionId);
      assert(!previous || JSON.stringify(previous) === JSON.stringify(row), `${selectionId}: valutazioni operative conflittuali`);
      assessmentBySelectionId.set(selectionId, row);
    }
  }
}
const selectionAssessmentSource = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  matchday: 6,
  generatedFrom: "output/reports/serie-a-md06-operational-player-analysis-2026-10-09.json",
  rule: "Valutazioni agganciate soltanto tramite matchId, provider e providerSelectionId; nessuna equivalenza dedotta dall'etichetta.",
  assessments: [...assessmentBySelectionId.values()],
};

function classifyMyComboLeg(leg) {
  const quote = sisalSelectionById.get(String(leg.providerSelectionId));
  if (!quote) return { status: "MERCATO_NON_VALUTABILE", market: "N/D", odds: null, reason: "providerSelectionId non risolto nello snapshot Sisal" };
  const market = String(quote.market.marketName || "");
  const semanticKeys = leg.semanticKeys || [];
  if (/DUO|GIOCATORE|CARTELLIN|FALLI|ASSIST|MARCATORE/i.test(market)) {
    return { status: "SELEZIONE_SPERIMENTALE", market, odds: quote.selection.odds, reason: "target giocatore/disciplinare non validato come probabilità MyCombo" };
  }
  if (semanticKeys.some(key => /^(goals|result|volume)-(fulltime|shots|sot|corners)/.test(key))) {
    return { status: "CANDIDATO_STATISTICAMENTE_SUPPORTATO", market, odds: quote.selection.odds, reason: "famiglia coperta dai segnali squadra canonici; non equivale a raccomandazione" };
  }
  return { status: "SCENARIO_PLAUSIBILE", market, odds: quote.selection.odds, reason: "coerente con lo scenario, ma senza probabilità specifica validata" };
}

const md6MyComboPath = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-06.json");
const md6MyCombo = fs.existsSync(md6MyComboPath) ? JSON.parse(fs.readFileSync(md6MyComboPath, "utf8")) : null;
const myComboFixtureReviews = md6MyCombo ? Object.entries(md6MyCombo.matches).map(([matchId, portfolios]) => {
  const safe = portfolios.find(portfolio => portfolio.tier === "Safe");
  const legs = (safe?.legs || []).map(leg => ({ ...leg, ...classifyMyComboLeg(leg) }));
  return { matchId, fixture: operationalById.get(matchId)?.matchLabel || matchId, tier: "Safe", legs };
}) : [];
const myComboCategoryCounts = myComboFixtureReviews.flatMap(row => row.legs).reduce((counts, leg) => {
  counts[leg.status] = (counts[leg.status] || 0) + 1;
  return counts;
}, {});

const fixtureCandidateReports = operational.fixtures.map(fixture => {
  const candidates = chooseDisplayCandidates(fixture);
  return {
    matchId: fixture.matchId,
    fixture: fixture.matchLabel,
    startsAt: fixture.startsAt,
    formationChanges: fixture.lineupComparison.flatMap(team => [
      ...(team.entered.length || team.exited.length || team.formation.changed ? [{ team: team.team, formation: `${team.formation.previous || "N/D"} → ${team.formation.current}`, entered: team.entered.map(row => row.name), exited: team.exited.map(row => row.name) }] : []),
    ]),
    candidates,
    actionable: candidates.filter(row => ["PRINCIPALE", "INTERESSANTE", "OUTSIDER"].includes(row.classification)),
    watch: candidates.filter(row => row.classification === "WATCH"),
    excluded: candidates.filter(row => row.classification === "ESCLUSO"),
  };
});
const actionableCandidates = fixtureCandidateReports.flatMap(fixture => fixture.actionable);
const watchCandidates = fixtureCandidateReports.flatMap(fixture => fixture.watch);

const md6Report = {
  schemaVersion: 1,
  reportType: "serie-a-md06-betting-selection",
  generatedAt: new Date().toISOString(),
  scope: "Decision layer only. Player Market V2, coefficients, Team Profiles, odds and immutable snapshots are read-only inputs.",
  sources: {
    operationalReport: "output/reports/serie-a-md06-operational-player-analysis-2026-10-09.json",
    predictions: "data/normalized/predictions.json",
    odds: "data/normalized/odds/sisal/serie-a.json",
    oddsRetrievedAt: odds.retrievedAt,
  },
  rules: {
    noMandatorySelectionPerMatch: true,
    individualV2IsNotDuo: true,
    duoEvCertified: 0,
    underMarketsPlayable: false,
    underPolicyEffectiveFromMatchday: 6,
    individualPlayerFoulsPlayable: false,
    individualPlayerFoulsPolicyEffectiveFromMatchday: 6,
    overMarketsRemainEligible: true,
    classificationIsOperationalNotGuarantee: true,
    noMd5ThresholdOptimization: true,
  },
  summary: {
    matchesAnalyzed: fixtureCandidateReports.length,
    candidatesDisplayed: fixtureCandidateReports.reduce((sum, fixture) => sum + fixture.candidates.length, 0),
    actionableCandidates: actionableCandidates.length,
    watchCandidates: watchCandidates.length,
    slipsGenerated: slips.length,
    qualifiedSlips: 0,
    underPlayableSelections: 0,
    individualPlayerFoulPlayableSelections: 0,
    underOccurrencesRemoved: 3 + Number(md6MyCombo?.constraints?.underSelectionPolicy?.previousPlayableLegOccurrencesRemoved || 0),
  },
  fixtures: fixtureCandidateReports,
  slips,
  myCombo: {
    sourceAvailable: Boolean(md6MyCombo),
    matches: myComboFixtureReviews.length,
    displayedTier: "Safe",
    forcedTenLegs: false,
    underSelectionPolicy: md6MyCombo?.constraints?.underSelectionPolicy || null,
    individualFoulSelectionPolicy: md6MyCombo?.constraints?.individualFoulSelectionPolicy || null,
    categoryCounts: myComboCategoryCounts,
    fixtures: myComboFixtureReviews,
  },
  topSelections: slips.flatMap(slip => slip.legs.map(leg => ({ slip: slip.name, validationStatus: slip.validationStatus, ...leg }))),
  officialLineupReview: watchCandidates,
};

function md5Markdown(report) {
  const familyRows = report.marketFamilies.map(row => [row.family, row.observations, row.won, row.lost, row.void, row.unavailable, pct(row.hitRatePct), pct(row.averagePredictedProbabilityPct), row.descriptiveGapPp == null ? "N/D" : `${row.descriptiveGapPp > 0 ? "+" : ""}${row.descriptiveGapPp} pp`, row.sampleLimit]);
  return [
    "# Serie A MD5 — Audit delle decisioni di betting",
    "",
    `Generato: ${report.generatedAt}. Esiti già verificati; nessun recupero o ricalcolo storico.`,
    "",
    "## Prestazioni delle otto schedine",
    "",
    table(["Schedina", "Leg", "V-P-Void-N/D", "Hit rate", "Quota origine", "P congiunta dichiarata", "EV dichiarato", "Esito multipla", "Ritorno lordo €1", "Netto €1"], report.slips.map(row => [row.name, row.selections, `${row.counts.won}-${row.counts.lost}-${row.counts.void}-${row.counts.unavailable + row.counts.pending}`, pct(row.hitRatePct), row.originalCombinedOdds, pct(row.declaredJointProbabilityPct), pct(row.declaredExpectedValuePct), row.fullSlipStatus, row.unitStakeGrossReturn, row.unitStakeNetReturn])),
    "",
    `Totale singole selezioni: ${report.totals.won} vinte, ${report.totals.lost} perse, ${report.totals.void} void, ${report.totals.unavailable} unavailable. Il rendimento delle multiple è separato: una singola gamba persa azzera la multipla, mentre i void valgono quota 1 solo quando tutte le altre gambe sono vinte.`,
    "",
    "## Prestazioni per famiglia",
    "",
    table(["Famiglia", "N", "V", "P", "Void", "N/D", "Hit rate", "P media confrontabile", "Scarto descrittivo", "Limite"], familyRows),
    "",
    "Le probabilità medie escludono DUO giocatore, SOT con pali/traverse e proxy cartellini. Gli scarti sono descrittivi: un solo turno non dimostra calibrazione o miscalibrazione.",
    "",
    "## MyCombo MD5",
    "",
    `Portafogli con selezioni: ${report.myCombo.portfoliosWithSelections}/10; ${report.myCombo.totals.legs} esiti analizzati, ${report.myCombo.totals.won} vinti, ${report.myCombo.totals.lost} persi, ${report.myCombo.totals.void} void, ${report.myCombo.totals.unavailable} unavailable. La MyCombo è lettura di scenari, non una multipla automaticamente consigliata.`,
    "",
    table(["Partita", "Stato", "Leg", "V", "P", "Void", "N/D"], report.myCombo.matches.map(row => [row.matchId, row.status, row.legs, row.won, row.lost, row.void, row.unavailable])),
    "",
    "## Errori di costruzione",
    "",
    `- A. Previsionali: ${report.errors.forecasting}`,
    `- B. Selezione: ${report.errors.selection}`,
    `- C. Combinazione: ${report.errors.combination}`,
    `- D. Semantici: ${report.errors.semantics}`,
    `- E. Qualificazione: ${report.errors.qualification}`,
    "",
    "## Conclusioni MD5",
    "",
    table(["CRITERIO", "EVIDENZA MD5", "DECISIONE", "MOTIVAZIONE"], report.criteria.map(row => [row.criterion, row.evidence, row.decision, row.motivation])),
    "",
  ].join("\n");
}

function md6Markdown(report) {
  const lines = [
    "# Serie A MD6 — Selezione operativa e costruzione schedine",
    "",
    `Generato: ${report.generatedAt}. Quote Sisal: ${report.sources.oddsRetrievedAt}.`,
    "",
    `La classificazione è operativa, non una garanzia. Nessuna partita deve produrre obbligatoriamente una scelta. Dalla MD6 i mercati Under sono esclusi dalle giocate, ma restano nelle analisi e nelle distribuzioni; gli Over restano eleggibili. Occorrenze giocabili rimosse nella migrazione: ${report.summary.underOccurrencesRemoved}. Le quote giocatore restano visibili come riferimento commerciale DUO: P V2 è individuale, pertanto EV e probabilità congiunta non sono calcolabili.`,
    "",
  ];
  for (const fixture of report.fixtures) {
    lines.push(`## ${fixture.fixture}`, "");
    lines.push(`Cambi formazione rilevanti: ${fixture.formationChanges.length ? fixture.formationChanges.map(change => `${change.team} ${change.formation}; entrati ${change.entered.join(", ") || "nessuno"}; usciti ${change.exited.join(", ") || "nessuno"}`).join(" | ") : "nessuno"}.`, "");
    lines.push(table(["Gruppo", "Giocatore", "Mercato", "P V2", "Min", "Titolarità", "Affidabilità", "Quota Sisal", "Compatibilità", "Classificazione", "Motivazione"], fixture.candidates.map(row => [row.analysisSection, row.player, row.market, probPct(row.individualV2Probability), round(row.expectedMinutes, 1), `${row.starterProbability}%`, row.reliability.level, row.sisalOdds || "N/D", row.compatibility, row.classification, row.reason])));
    lines.push("");
    if (!fixture.actionable.length) lines.push("Nessun candidato operativo: nessuna selezione forzata.", "");
  }
  lines.push("## Schedine costruite", "");
  for (const slip of report.slips) {
    lines.push(`### ${slip.name}`, "", `${slip.description} Rischio: ${slip.risk}. Stato: ${slip.validationStatus}. ${slip.dependencyNote}`, "");
    lines.push(table(["Partita", "Selezione", "Quota", "P modello", "P V2 individuale", "EV", "Compatibilità", "Timestamp"], slip.legs.map(leg => [leg.fixture, leg.label, leg.odds, pct(leg.modelProbabilityPct), pct(leg.individualV2ProbabilityPct), leg.expectedValuePct == null ? "N/D" : `${leg.expectedValuePct > 0 ? "+" : ""}${leg.expectedValuePct}%`, leg.compatibility, leg.marketUpdatedAt])));
    lines.push("", `Quota totale: ${slip.combinedOdds}. Probabilità congiunta: ${pct(slip.jointModelProbabilityPct)}. EV: ${slip.expectedValuePct == null ? "N/D" : `${slip.expectedValuePct > 0 ? "+" : ""}${slip.expectedValuePct}%`}. Revisione: ${slip.reviewConditions}`, "");
  }
  lines.push("## MyCombo", "", "La pipeline MD6 esclude gli Under prima della costruzione dei portafogli e mantiene eleggibili gli Over. Non forza dieci esiti: il generatore canonico usa 3–6 gambe Safe, 4–7 Balanced e 5–8 Aggressive; un portafoglio resta N/D quando non raggiunge candidati distinti e semanticamente compatibili. Le etichette seguenti qualificano l’evidenza, non raccomandano automaticamente la multipla.", "");
  if (report.myCombo.sourceAvailable) {
    lines.push(table(["Partita", "Leg Safe", "Supportati", "Plausibili", "Sperimentali", "Non valutabili"], report.myCombo.fixtures.map(row => {
      const counts = row.legs.reduce((result, leg) => ({ ...result, [leg.status]: (result[leg.status] || 0) + 1 }), {});
      return [row.fixture, row.legs.length, counts.CANDIDATO_STATISTICAMENTE_SUPPORTATO || 0, counts.SCENARIO_PLAUSIBILE || 0, counts.SELEZIONE_SPERIMENTALE || 0, counts.MERCATO_NON_VALUTABILE || 0];
    })), "");
  } else {
    lines.push("Sorgente MyCombo MD6 non ancora disponibile al momento della prima stesura del report.", "");
  }
  lines.push("## Da rivalutare con le formazioni ufficiali", "");
  lines.push(report.officialLineupReview.length ? table(["Partita", "Giocatore", "Mercato", "P V2", "Min", "Rischio", "Motivo"], report.officialLineupReview.map(row => [row.fixture, row.player, row.market, probPct(row.individualV2Probability), round(row.expectedMinutes, 1), row.substitutionRisk, row.reason])) : "Nessun WATCH corrente.");
  lines.push("");
  return lines.join("\n");
}

if (mode === "reports") {
  write("output/reports/serie-a-md05-betting-decision-review-2026-10-09.json", md5Report);
  write("output/reports/serie-a-md05-betting-decision-review-2026-10-09.md", md5Markdown(md5Report));
  write("output/reports/serie-a-md06-betting-selection-2026-10-09.json", md6Report);
  write("output/reports/serie-a-md06-betting-selection-2026-10-09.md", md6Markdown(md6Report));
  console.log(JSON.stringify({ mode, md5: { slips: md5Report.slips.length, totals: md5Report.totals, myCombo: md5Report.myCombo.totals }, md6: md6Report.summary }, null, 2));
} else {
  const source = {
    schemaVersion: 1,
    competition: "serie-a",
    season: "2026-27",
    matchday: 6,
    title: "Schedine Serie A · 6ª giornata",
    description: "Due combinazioni selettive senza mercati Under: una compatibile e una osservazionale sui mercati DUO.",
    generatedFrom: "output/reports/serie-a-md06-betting-selection-2026-10-09.json",
    selectionContractVersion: 1,
    slips: slips.map(slip => ({ id: slip.id, type: slip.type, eyebrow: slip.eyebrow, name: slip.name, description: slip.description, validationStatus: slip.validationStatus, risk: slip.risk, picks: slip.legs.map(leg => ({ matchId: leg.matchId, market: leg.market, variant: leg.variant, selection: leg.selection, player: leg.player || null, label: leg.label, providerMarketId: leg.providerMarketId, providerSelectionId: leg.providerSelectionId, selectionId: leg.selectionId, overlapKey: leg.overlapKey, semanticKeys: leg.semanticKeys, classification: leg.betSelection.operational.classification, reliability: leg.betSelection.operational.reliability, compatibility: leg.betSelection.compatibility, betSelection: leg.betSelection })) })),
  };
  const normalized = {
    schemaVersion: 1,
    competition: "serie-a",
    season: "2026-27",
    matchday: 6,
    selectionContractVersion: 1,
    generatedAt: new Date().toISOString(),
    title: source.title,
    description: source.description,
    provider: odds.provider,
    sourceUrl: odds.sourceUrl,
    oddsRetrievedAt: odds.retrievedAt,
    modelVersion: predictionsData.engine.version,
    methodology: "Selezione decisionale senza modifica del modello: dalla MD6 gli Under sono esclusi dalle giocate, gli Over restano eleggibili e i mercati giocatore DUO restano non confrontabili con V2 individuale.",
    selectionRule: "Nessuna selezione obbligatoria per partita; gli Under sono esclusi dalle giocate dalla MD6; nessuna schedina è qualificata automaticamente. EV solo dove target, settlement e modello coincidono.",
    coverage: { profilesEvaluated: slips.length, qualifiedProfiles: 0, unavailableProfiles: 0 },
    slips,
  };
  write("data/sources/schedina-serie-a-2026-27-md-06.json", source);
  write("data/sources/betting-selection-assessments-md06.json", selectionAssessmentSource);
  write("data/normalized/schedina-md06.json", normalized);
  console.log(JSON.stringify({ mode, source: "data/sources/schedina-serie-a-2026-27-md-06.json", normalized: "data/normalized/schedina-md06.json", slips: slips.length, legs: slips.reduce((sum, slip) => sum + slip.legs.length, 0) }, null, 2));
}
