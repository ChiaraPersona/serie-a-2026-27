"use strict";

function lane(player) {
  const role = (player.detailedRole || "").toLowerCase();
  if (/destr[oa]/.test(role)) return "right";
  if (/sinistr[oa]/.test(role)) return "left";
  if (/centrale|mediano|regista|trequartista|punta|centravanti/.test(role)) return "central";
  return null;
}

function isDefensiveDuel(defender, opponent) {
  if (!["Attaccante", "Centrocampista"].includes(opponent.role)) return false;
  const own = lane(defender);
  const other = lane(opponent);
  if (!own || !other) return false;
  const centreBack = /difensore centrale/i.test(defender.detailedRole);
  if (centreBack && other === "central") return true;
  return own !== "central" && other !== "central" && own !== other;
}

module.exports = { isDefensiveDuel };
