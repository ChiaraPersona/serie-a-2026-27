'use strict';
// Internal evidence only: never writes the operational validation registry.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { targetForLeg, eventKey, familyKey, summary, evaluateEvidence } = require('./event-validation.cjs');
const { zonedLocalToUtc } = require('./complete-forecast-snapshots');
const finite = n => typeof n === 'number' && Number.isFinite(n);
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function target(leg) {
  const t = targetForLeg(leg), market = leg.betSelection?.market || {};
  if (leg.suggestionAnalysis?.family === 'goals') t.metric = 'goals';
  if (t.scope === 'player') t.teamId = leg.teamId;
  t.extraTime ||= market.modifiers?.extraTimeIncluded === true;
  t.duo ||= /DUO/.test(leg.betSelection?.evaluation?.probabilitySemantics || '');
  return t;
}
function baselineForTarget(t, actuals, history, now, existingBaseline) {
  if (t.metric !== 'goals') {
    const baseline = existingBaseline(t, actuals, history, now);
    // Legacy baseline collector counts OVER; preserve the exact UNDER event.
    return t.direction === 'UNDER' ? { ...baseline, probability: baseline.probability == null ? null : 1 - baseline.probability, positives: baseline.n - baseline.positives } : baseline;
  }
  const values = history.matches.filter(m => m.competitionCode === 'ucl' && m.date < now.slice(0, 10) && finite(m.score90?.home) && finite(m.score90?.away)).map(m => m.score90.home + m.score90.away);
  const positives = values.filter(v => t.direction === 'OVER' ? v > t.threshold : v < t.threshold).length;
  return { probability: values.length ? positives / values.length : null, n: values.length, positives, periodVerified: true, availableAt: now, method: 'FROZEN_PRIOR_UCL_90_MINUTE_GOALS' };
}
function captureFixture({ fixture, match, catalogGeneratedAt, now, receipts, baseline, countModelId = null, meanForLeg = () => null }) {
  const kickoffAt = zonedLocalToUtc(fixture.date, fixture.kickoff, fixture.timezone || 'Europe/Rome');
  if (!finite(Date.parse(now)) || !finite(Date.parse(kickoffAt))) throw Error('Invalid capture clock or kickoff');
  if (fixture.status !== 'scheduled' || Date.parse(now) >= Date.parse(kickoffAt)) return { fixtureId: fixture.id, status: 'NOT_FUTURE_SCHEDULED' };
  if (!finite(Date.parse(catalogGeneratedAt)) || Date.parse(catalogGeneratedAt) > Date.parse(now)) return { fixtureId: fixture.id, status: 'CATALOG_CHRONOLOGY_UNPROVEN' };
  const events = new Map(), exclusions = [];
  for (const leg of match.selections || []) {
    const t = target(leg), evaluation = leg.betSelection?.evaluation;
    const baseModelId = evaluation?.validation?.modelId || (evaluation?.provenance?.model === 'scripts/md06-statistical-models.js' && leg.catalogOrigin === 'champions-md04-team-volumes' ? countModelId : null);
    const publishedModelId = baseModelId && evaluation?.provenance?.adapterVersion ? `${baseModelId}:adapter:${evaluation.provenance.adapterVersion}` : baseModelId;
    let issue = null;
    if (!t.metric || !['result', 'double-chance', 'goals', 'shots', 'sot', 'corners'].includes(t.metric)) issue = 'UNSUPPORTED_MARKET';
    else if (t.duo || t.woodwork || t.extraTime) issue = 'EXTENDED_CONTRACT_NOT_VALIDATED';
    else if (t.period !== 'REGULATION') issue = 'NON_REGULATION_PERIOD';
    else if (['team', 'player'].includes(t.scope) && !t.subjectId) issue = 'EXACT_SUBJECT_ID_MISSING';
    else if (t.metric === 'goals' && t.scope !== 'match') issue = 'GOALS_SCOPE_UNSUPPORTED';
    else if (!['result', 'double-chance'].includes(t.metric) && (!finite(t.threshold) || t.threshold % 1 !== 0.5)) issue = 'EXACT_NON_PUSH_THRESHOLD_REQUIRED';
    else if (!publishedModelId) issue = 'PUBLISHED_MODEL_ID_MISSING';
    else if (!finite(evaluation.modelProbabilityPct) || evaluation.modelProbabilityPct < 0 || evaluation.modelProbabilityPct > 100) issue = 'ORIGINAL_PROBABILITY_MISSING';
    if (issue) { exclusions.push({ selectionId: leg.selectionId, target: t, reason: issue }); continue; }
    const key = `${eventKey(publishedModelId, t)}:${t.subjectId || ''}`;
    const reference = baseline(t);
    const event = { eventId: key, modelId: publishedModelId, target: t, probability: evaluation.modelProbabilityPct / 100, baselineProbability: reference.probability, baseline: reference, mean: meanForLeg(leg, t), latestInputAt: now, trainingThroughAt: now, baselineAvailableAt: now, sourceGeneratedAt: catalogGeneratedAt, selected: leg.suggestionAnalysis?.suggested === true, selectionIds: [leg.selectionId], quote: leg.betSelection.quote || null, exactContract: leg.betSelection.market, originalEvaluation: evaluation };
    const old = events.get(key);
    if (!old) events.set(key, event);
    else if (old.probability !== event.probability) old.captureIssue = 'CONFLICTING_PROBABILITY_ALIASES';
    else { old.selectionIds.push(leg.selectionId); old.selected ||= event.selected; }
  }
  // Record inconsistent serialized probabilities; do not silently repair them.
  const complementary = new Map();
  for (const event of events.values()) {
    const t = event.target;
    if (!['OVER', 'UNDER'].includes(t.direction)) continue;
    const key = JSON.stringify([event.modelId, t.scope, t.metric, t.subjectId, t.threshold, t.period]);
    if (!complementary.has(key)) complementary.set(key, []);
    complementary.get(key).push(event);
  }
  for (const items of complementary.values()) if (items.length === 2 && new Set(items.map(e => e.target.direction)).size === 2 && Math.abs(items[0].probability + items[1].probability - 1) > 1e-6) {
    for (const event of items) event.captureIssue = 'COMPLEMENTARY_PROBABILITIES_INCONSISTENT';
  }
  const payload = { schemaVersion: 1, protocol: 'CHAMPIONS_MARKET_PROSPECTIVE_V1', competition: 'champions', fixtureId: fixture.id, kickoffAt, createdAt: now, evaluationWindow: 'test', chronologyStatus: 'VALID_PREMATCH_SNAPSHOT', availabilityProof: 'LOCAL_CAPTURE_BEFORE_KICKOFF_NOT_EXTERNAL_TIMESTAMP_AUTHORITY', universe: 'ALL_PUBLISHED_CATALOG_EVENTS_WITH_ORIGINAL_PROBABILITY_SELECTED_FLAG_RETAINED', receipts, events: [...events.values()], exclusions };
  return { status: 'READY', snapshot: { ...payload, contentHash: digest(payload) } };
}
function verify(snapshot) {
  const { contentHash, ...payload } = snapshot;
  return contentHash === digest(payload) && Date.parse(snapshot.createdAt) < Date.parse(snapshot.kickoffAt) && snapshot.chronologyStatus === 'VALID_PREMATCH_SNAPSHOT';
}
function freeze(snapshot, directory) {
  if (!verify(snapshot) || !/^ucl-\d{4}-\d{2}-md\d{2}-\d{2}$/.test(snapshot.fixtureId)) throw Error('Invalid prospective snapshot');
  const folder = path.join(directory, snapshot.fixtureId);
  fs.mkdirSync(folder, { recursive: true });
  const first = path.join(folder, 'first.json');
  if (!fs.existsSync(first)) { fs.writeFileSync(first, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' }); return 'FROZEN_FIRST'; }
  const previous = JSON.parse(fs.readFileSync(first, 'utf8'));
  if (!verify(previous)) throw Error('Existing first snapshot integrity failure');
  const fingerprint = s => digest({ receipts: s.receipts, events: s.events.map(({ latestInputAt, trainingThroughAt, baselineAvailableAt, baseline, ...event }) => ({ ...event, baseline: { ...baseline, availableAt: null } })) });
  const key = fingerprint(snapshot);
  if (key === fingerprint(previous)) return 'ALREADY_FROZEN_IDENTICAL';
  const revision = path.join(folder, `revision-${key}.json`);
  if (!fs.existsSync(revision)) fs.writeFileSync(revision, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
  return 'REVISION_ARCHIVED_FIRST_RETAINED';
}
function evaluate(snapshots, actuals, actualFor, now) {
  const rows = [], pending = [], quarantine = [], seen = new Set(), fixtures = new Set();
  for (const snapshot of [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (!verify(snapshot)) { quarantine.push({ fixtureId: snapshot.fixtureId, reason: 'SNAPSHOT_INTEGRITY_OR_CHRONOLOGY' }); continue; }
    fixtures.add(snapshot.fixtureId);
    for (const event of snapshot.events) {
      const identity = `${snapshot.fixtureId}:${event.eventId}`;
      if (seen.has(identity)) continue;
      seen.add(identity); // First capture of this exact model/subject/event wins, including blockers.
      if (event.captureIssue) { quarantine.push({ fixtureId: snapshot.fixtureId, eventId: event.eventId, reason: event.captureIssue }); continue; }
      if (Date.parse(now) < Date.parse(snapshot.kickoffAt)) { pending.push({ fixtureId: snapshot.fixtureId, eventId: event.eventId, reason: 'FIXTURE_NOT_STARTED' }); continue; }
      const actual = actualFor(event.target, snapshot.fixtureId, actuals);
      if (actual.reason) { pending.push({ fixtureId: snapshot.fixtureId, eventId: event.eventId, reason: actual.reason }); continue; }
      if (actual.verified !== true || ![0, 1].includes(actual.outcome) || !finite(Date.parse(actual.availableAt)) || Date.parse(actual.availableAt) < Date.parse(snapshot.kickoffAt) || Date.parse(actual.availableAt) > Date.parse(now)) { quarantine.push({ fixtureId: snapshot.fixtureId, eventId: event.eventId, reason: 'ACTUAL_UNVERIFIED_OR_INVALID_CHRONOLOGY' }); continue; }
      rows.push({ ...event, fixtureId: snapshot.fixtureId, kickoffAt: snapshot.kickoffAt, availableAt: snapshot.createdAt, availabilityVerified: true, phase: 'test', actualVerified: actual.verified, outcome: actual.outcome, actualValue: actual.value, outcomeAvailableAt: actual.availableAt });
    }
  }
  const evidence = evaluateEvidence(rows);
  // The shared registry has no calibrated goal-count bias gate. Report scores,
  // but do not manufacture an approval rule for a newly supported diagnostic.
  for (const event of evidence.events || []) if (event.target?.metric === 'goals') {
    event.approvable = false; event.status = 'DIAGNOSTIC_ONLY';
    event.reasons.push('GOALS_APPROVAL_GATE_NOT_DEFINED_BY_EXISTING_PROTOCOL');
  }
  for (const family of evidence.families || []) if (family.metric === 'goals') family.status = 'DIAGNOSTIC_ONLY';
  // Descriptive scores are separated by exact event and selection flag.
  // Only evidence above applies the existing baseline/sample gates.
  const group = new Map();
  for (const row of rows) {
    const key = JSON.stringify([eventKey(row.modelId, row.target), row.selected]);
    if (!group.has(key)) group.set(key, []);
    group.get(key).push(row);
  }
  const byMarket = [...group].map(([key, items]) => {
    const stats = summary(items);
    if (items.some(row => !finite(row.baselineProbability))) { stats.baselineBrier = null; stats.deltaBrier = null; }
    return { key, family: familyKey(items[0].modelId, items[0].target), target: items[0].target, selected: items[0].selected, ...stats };
  });
  return { schemaVersion: 1, generatedAt: now, activation: false, settlementCertified: false, profitOrRoi: null, fixtures: fixtures.size, captures: snapshots.length, observations: rows.length, pending, quarantine, evidence, byMarket, policy: 'FIRST_CAPTURE_PER_EXACT_EVENT; REVISIONS_NEVER_REPLACE_EXISTING_EVENTS; NEW_EVENTS_ONLY_IF_CAPTURED_PREMATCH; EXISTING_GATES_UNCHANGED; NO_OPERATIONAL_REGISTRY_WRITE' };
}
module.exports = { target, baselineForTarget, captureFixture, freeze, verify, evaluate, digest };
