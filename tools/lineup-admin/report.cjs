'use strict';
const fs = require('node:fs');
const path = require('node:path');
function summarize(directory, fixtureId) {
  const file = path.join(directory, 'data/generated/champions-shared-scenarios.json');
  if (!fs.existsSync(file)) return null;
  const f = JSON.parse(fs.readFileSync(file, 'utf8')).fixtures.find(f => f.fixtureId === fixtureId);
  if (!f) return null;
  return {home: f.homeTeam, away: f.awayTeam,
    expectedGoals: {home: f.expectedGoals?.home ?? null, away: f.expectedGoals?.away ?? null},
    probabilities: {home: f.probabilities?.home ?? null, draw: f.probabilities?.draw ?? null, away: f.probabilities?.away ?? null},
    score: f.scoreForecast?.primary?.score ?? null,
    limits: [...new Set([f.expectedGoals?.method, f.scoreForecast?.method].filter(Boolean))]};
}
module.exports = {summarize};
