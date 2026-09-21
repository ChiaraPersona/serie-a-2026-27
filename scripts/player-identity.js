"use strict";

const fs = require("fs");
const path = require("path");

const normalizePlayerName = value => String(value || "")
  .replace(/[øØ]/g, "o")
  .replace(/[đĐðÐ]/g, "d")
  .replace(/[łŁ]/g, "l")
  .replace(/ß/g, "ss")
  .replace(/[æÆ]/g, "ae")
  .replace(/[œŒ]/g, "oe")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "")
  .trim();

function loadPlayerIdentities(root) {
  const file = path.join(root, "data/sources/player-identity-aliases-2026-27.json");
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  const byAlias = new Map();
  const byId = new Map();
  for (const player of payload.players) {
    const identity = { ...player, aliases: [...new Set([player.canonicalName, ...(player.aliases || [])])] };
    byId.set(`${identity.teamId}:${identity.playerId}`, identity);
    for (const alias of identity.aliases) {
      const key = `${identity.teamId}:${normalizePlayerName(alias)}`;
      const previous = byAlias.get(key);
      if (previous && previous.playerId !== identity.playerId) {
        throw new Error(`Alias identità ambiguo ${key}: ${previous.playerId} / ${identity.playerId}`);
      }
      byAlias.set(key, identity);
    }
  }
  return {
    payload,
    byId,
    resolve(teamId, name) {
      return byAlias.get(`${teamId}:${normalizePlayerName(name)}`) || null;
    }
  };
}

module.exports = { loadPlayerIdentities, normalizePlayerName };
