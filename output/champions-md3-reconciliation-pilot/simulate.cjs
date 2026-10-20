'use strict';
// Read-only model simulation: only this output directory is written.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {projectDocumentedTeam} = require('../../scripts/champions/current-season-offline');
const {starterThresholds} = require('../../scripts/champions/md3-lineup-policy');
const {buildSharedIndividualCatalog} = require('../../scripts/champions/md3-shared-forecast-integration.cjs');
const {selectPreliminaryMatch, TARGET} = require('../../scripts/champions/md3-preliminary-pilot.cjs');
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const originals = read('data/normalized/champions-md03-probable-individuals-2026-27.json');
const fixture = structuredClone(originals.fixtures.find(item => item.fixtureId === TARGET));
const team = fixture.teams.find(item => item.teamId === 'fenerbahce');
const ids = new Set(team.reconciliation.diagnostic.unapprovedRaw.map(row => row.playerId));
const players = team.players.filter(player => ids.has(player.playerId)).map(player => ({
  playerId: player.playerId, roleKey: player.role, expectedMinutes: player.expectedMinutes,
  per90: {shots: player.baseline.candidate.shots, shotsOnTarget: player.baseline.candidate.sot}
}));
const recon = projectDocumentedTeam({teamId: team.teamId, players, lineupVerified: true, benchVerified: true,
  targetShots: team.reconciliation.targetShots, targetSOT: team.reconciliation.targetSOT});
assert.equal(recon.status, 'offline-conditional-only');
for (const player of team.players) {
  const projection = recon.players.find(row => row.playerId === player.playerId);
  if (!projection) continue;
  player.projectedShots = projection.shots;
  player.projectedSOT = projection.sot;
  player.blockers = player.blockers.filter(reason => reason !== 'TEAM_RECONCILIATION_NOT_PASSED' && reason !== 'blocked-existing-reconciliation-limit');
  player.eventProbabilities = player.projectedRole === 'starter' ? starterThresholds(projection.shots, projection.sot) : null;
}
team.reconciliation = {...recon, targetShots: team.reconciliation.targetShots, targetSOT: team.reconciliation.targetSOT};
const starters = team.players.filter(player => player.projectedRole === 'starter' && Number.isFinite(player.projectedShots));
assert.equal(starters.length, 10);
const frozen = read('data/normalized/schedina-champions-md03.json');
const base = structuredClone(frozen.marketCatalog.matches.find(match => match.matchId === TARGET));
base.selections = base.selections.filter(leg => leg.marketScope !== 'player');
const catalog = buildSharedIndividualCatalog({baseMatches: [base], individuals: {...originals, fixtures: [fixture]},
  database: read('data/normalized/champions-md03-player-database-2026-27.json'),
  odds: read('data/normalized/odds/sisal/champions-league.json'),
  identityArchive: read('data/normalized/champions-md02-integration-2026-27.json')});
const match = catalog.matches[0];
const selected = selectPreliminaryMatch(match);
const frozenMatch = frozen.marketCatalog.matches.find(item => item.matchId === TARGET);
assert.deepEqual(selected.suggestions, frozenMatch.suggestions, 'frozen preliminary selection changed');
for (const id of selected.suggestions) {
  const before = frozenMatch.selections.find(leg => leg.selectionId === id);
  const after = selected.selections.find(leg => leg.selectionId === id);
  assert.equal(after.odds, before.odds, `${id}: quote changed`);
  assert.equal(after.betSelection.evaluation.modelProbabilityPct, before.betSelection.evaluation.modelProbabilityPct, `${id}: probability changed`);
}
const legs = selected.selections.filter(leg => leg.marketScope === 'player');
const summary = {fixtureId: TARGET, frozenSuggestions: frozen.marketCatalog.matches.find(item => item.matchId === TARGET).suggestions,
  integrationSummary: catalog.summary, predictionRows: catalog.predictions[0].shooters.allPlayers.length,
  reconciliation: {status: recon.status, playerCount: recon.players.length,
    shots: recon.players.reduce((sum, row) => sum + row.shots, 0), sot: recon.players.reduce((sum, row) => sum + row.sot, 0),
    targetShots: team.reconciliation.targetShots, targetSOT: team.reconciliation.targetSOT},
  usableStarters: starters.map(p => ({playerId: p.playerId, name: p.canonicalName || p.sourceName,
    minutes: p.expectedMinutes, shots: p.projectedShots, sot: p.projectedSOT, probabilities: p.eventProbabilities})),
  modeledPlayerContracts: legs.length, quotedPlayerContracts: legs.filter(leg => leg.odds !== null).length,
  duoContracts: legs.filter(leg => leg.betSelection?.market?.bookmakerSemantics?.duo).map(leg => ({label: leg.label, odds: leg.odds, probability: leg.betSelection.evaluation.modelProbabilityPct})),
  selected: selected.selections.filter(leg => leg.suggestionAnalysis?.suggested).map(leg => ({label: leg.label, market: leg.market,
    odds: leg.odds, estimatedProbabilityPct: leg.betSelection?.evaluation?.modelProbabilityPct ?? null,
    playerId: leg.playerId || null, selectionId: leg.selectionId})),
  rejectedPlayers: legs.filter(leg => !leg.suggestionAnalysis?.suggested).map(leg => ({label: leg.label, odds: leg.odds,
    reasons: leg.suggestionAnalysis?.reasons || [], estimatedProbabilityPct: leg.betSelection?.evaluation?.modelProbabilityPct ?? null}))};
fs.writeFileSync('output/champions-md3-reconciliation-pilot/simulation.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({usableStarters: starters.length, playerContracts: legs.length, quoted: summary.quotedPlayerContracts,
  duo: summary.duoContracts.length, selected: summary.selected.length, selectedPlayers: summary.selected.filter(leg => leg.playerId).length}));
