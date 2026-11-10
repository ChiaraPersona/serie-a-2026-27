'use strict';
// Descriptive browser enrichment only. Never consumed by scoring or selections.
const { isDefensiveDuel } = require('./predictions/defensive-duel.cjs');
const side = role => /destr[oa]/i.test(role || '') ? 'right' : /sinistr[oa]/i.test(role || '') ? 'left' : null;
function withReadingDuels(prediction, squads) {
  const players = prediction.shooters?.allPlayers || [];
  const member = p => (squads.get(p.teamId)?.players || []).find(q => p.playerId && q.id === p.playerId);
  return {...prediction, likelyBooked: (prediction.likelyBooked || []).map(candidate => {
    const own = players.find(p => candidate.playerId && p.playerId === candidate.playerId && p.teamId === candidate.teamId);
    const detailedRole = candidate.detailedRole || own?.detailedRole || (own && member(own)?.detailedRole);
    const flank = side(detailedRole);
    if (candidate.role !== 'Difensore' && (!flank || candidate.role !== 'Centrocampista')) return candidate;
    const seen = new Set();
    const readingDuels = players.filter(p => p.teamId !== candidate.teamId && p.role !== 'Portiere').flatMap(p => {
      const roster = member(p), opponentRole = p.detailedRole || roster?.detailedRole;
      const opposite = side(opponentRole);
      const compatible = candidate.role === 'Difensore'
        ? isDefensiveDuel({ detailedRole }, { role: p.role, detailedRole: opponentRole })
        : opposite && opposite !== flank;
      if (!roster || !compatible || seen.has(p.playerId)) return [];
      seen.add(p.playerId);
      const value = roster.previousSeason?.totals?.per90?.foulsWon;
      return [{playerId: p.playerId, name: p.name || roster.name, foulsWonPer90: Number.isFinite(value) ? value : null}];
    });
    return {...candidate, readingDuels};
  })};
}
module.exports = {withReadingDuels};
