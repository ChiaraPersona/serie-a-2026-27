"use strict";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(Number(value).toFixed(digits));

function scaleShotProjections(players, key, teamCentral) {
  const outfield = players.filter(player => player.roleKey !== "goalkeeper");
  const raw = outfield.map(player => ({
    player,
    value: player.per90[key] * (Number.isFinite(player.expectedMinutes) ? player.expectedMinutes / 90 : 0.94)
  }));
  const sum = raw.reduce((total, item) => total + item.value, 0);
  const target = Number.isFinite(teamCentral) ? teamCentral : sum;
  const factor = sum ? clamp(target / sum, 0.72, 1.35) : 1;
  return raw.map(item => ({ player: item.player, projection: round(item.value * factor, 2), reconciliationFactor: factor }));
}

module.exports = { scaleShotProjections };
