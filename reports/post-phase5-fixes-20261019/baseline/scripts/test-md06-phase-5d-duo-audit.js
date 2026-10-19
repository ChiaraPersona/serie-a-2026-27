"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const generator = path.join(root, "scripts", "research", "sisal-duo", "audit-phase-5d.js");
const jsonPath = path.join(root, "output", "reports", "serie-a-md06-phase-5d-duo-audit-2026-10-09.json");
const markdownPath = path.join(root, "output", "reports", "serie-a-md06-phase-5d-duo-audit-2026-10-09.md");
const protectedPaths = [
  "data/normalized/odds/sisal/serie-a.json",
  "data/normalized/predictions.json",
  "data/normalized/schedina-md06.json",
  "data/sources/probable-lineups-md6-2026-27.json",
  "data/sources/fantacalcio-quotations-2026-27.json",
  "data/sources/player-identity-aliases-2026-27.json",
  "data/sources/match-results-2026-27.json",
  "scripts/build-predictions.js",
  "scripts/predictions/engine.js",
  "scripts/betting-market-policy.js",
];

const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const snapshot = () => Object.fromEntries(protectedPaths.map(relative => [relative, hash(path.join(root, relative))]));
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const count = (rows, predicate) => rows.filter(predicate).length;

const before = snapshot();
execFileSync(process.execPath, [generator], { cwd: root, stdio: "pipe" });
const first = read(jsonPath);
execFileSync(process.execPath, [generator], { cwd: root, stdio: "pipe" });
const second = read(jsonPath);
const after = snapshot();
const markdown = fs.readFileSync(markdownPath, "utf8");

assert.deepEqual(after, before, "Il generatore diagnostico ha modificato sorgenti protette");
assert.equal(first.invariants.classificationSignature, second.invariants.classificationSignature, "La classificazione non è deterministica");
assert.deepEqual(first.classifications.map(row => [row.providerSelectionId, row.classification, row.identity.playerId, row.lineup.status, row.classificationReasons]), second.classifications.map(row => [row.providerSelectionId, row.classification, row.identity.playerId, row.lineup.status, row.classificationReasons]), "Le decisioni per selection ID cambiano fra due esecuzioni");

const rows = second.classifications;
assert.equal(rows.length, 553, "Il perimetro deve contenere 553 esiti DUO");
assert.equal(count(rows, row => row.marketFamily === "player-sot-duo"), 336);
assert.equal(count(rows, row => row.marketFamily === "player-shots-duo"), 217);
assert.equal(count(rows, row => row.originalPhase5B1.level === "B3"), 397);
assert.equal(count(rows, row => row.originalPhase5B1.level === "B4"), 156);

assert.equal(new Set(rows.map(row => row.providerSelectionId)).size, rows.length, "providerSelectionId duplicato");
assert.equal(new Set(rows.map(row => row.selectionId)).size, rows.length, "selectionId canonico duplicato");
assert(rows.every(row => row.providerMarketId && row.matchId && row.providerPlayerIds.length === 1), "ID incompleti");
assert(rows.every(row => row.rawNormalizedIntegrity === "VERIFIED_EXACT" && row.rawReconciliationReasons.length === 0), "Raw e normalizzato non coincidono");
assert(rows.every(row => Number.isFinite(row.threshold) && Number.isInteger(row.threshold * 2) && !Number.isInteger(row.threshold)), "Soglia non half-line");
assert(rows.every(row => Number.isFinite(row.odds) && row.odds >= 1 && row.marketStatus === "open" && row.selectionStatus === "open"), "Quota o stato non valido");
assert(rows.every(row => !row.alreadyInSchedinaCatalog), "Duplicato nel catalogo Schedina");

assert(rows.filter(row => row.classification === "D3").every(row => row.identity.playerId && row.lineup.status === "probable-starter" && row.lineup.eligibleUnderUnchangedStarterPolicy), "D3 senza identità/titolarità verificata");
assert(rows.filter(row => row.classification === "D4").every(row => row.classificationReasons.length && (!row.identity.playerId || row.lineup.status !== "probable-starter")), "D4 senza motivo di ineleggibilità");
assert(rows.filter(row => row.identity.status === "REVIEW_ONLY_APPROXIMATE_NOT_ACCEPTED").every(row => row.identity.playerId === null && row.classification === "D4"), "Match approssimativo promosso a identità definitiva");
assert(rows.filter(row => row.identity.status === "UNRESOLVED").every(row => row.identity.playerId === null && row.classification === "D4"), "Identità irrisolta promossa");
assert(rows.every(row => row.engineV2.duoProbability === null && row.engineV2.individualProbabilityUsedAsDuo === false && row.evaluation === null), "È stata introdotta una probabilità DUO");

assert.deepEqual(second.summary.classificationTotals, { D1: 0, D2: 0, D3: 410, D4: 143 });
assert.equal(second.summary.crosswalkReview.acceptedDeterministicOutcomes, 150);
assert.equal(second.summary.crosswalkReview.acceptedAndProbableStarterOutcomes, 13);
assert.equal(second.summary.safeToAddNow, 0);
assert.equal(second.summary.requiresNewModel, 410);
assert.deepEqual(second.invariants.schedinaCatalog, { total: 383, evaluated: 367, notModelled: 16, unchanged: true });
assert.equal(second.invariants.duoRowsInCatalog, 0);
assert.equal(second.invariants.probabilitiesCreated, 0);

assert.equal(second.historicalData.currentSeasonMd1Md5.matches, 50);
assert.equal(second.historicalData.currentSeasonMd1Md5.substitutionEventsWithExplicitIds, 490);
assert.equal(second.historicalData.currentSeasonMd1Md5.rowsWithPlayerWoodwork, 0);
assert(second.historicalData.currentSeasonMd1Md5.explicitLaterReplacementChains > 0, "Le catene esplicite non sono state rilevate");
assert.equal(second.historicalData.previousSeason.files, 10);
assert.equal(second.historicalData.previousSeason.rowsWithPlayerWoodwork, 0);
assert.equal(second.semantics.authorizableNow, false);
assert(second.semantics.unconfirmed.some(row => row.topic === "replacement later substituted" && row.status === "RULE_UNVERIFIED"));

assert(markdown.includes("D1 0 · D2 0 · D3 410 · D4 143"));
assert(markdown.includes("0 mercati DUO possono essere aggiunti in sicurezza oggi"));
assert(markdown.includes("383 totali / 367 valutate / 16 NOT_MODELLED"));

process.stdout.write(`${JSON.stringify({
  status: "PASS",
  checks: {
    rows: rows.length,
    uniqueProviderSelectionIds: new Set(rows.map(row => row.providerSelectionId)).size,
    rawNormalizedExact: count(rows, row => row.rawNormalizedIntegrity === "VERIFIED_EXACT"),
    classificationTotals: second.summary.classificationTotals,
    safeToAddNow: second.summary.safeToAddNow,
    protectedSourcesUnchanged: true,
    deterministicSignature: second.invariants.classificationSignature,
  },
}, null, 2)}\n`);
