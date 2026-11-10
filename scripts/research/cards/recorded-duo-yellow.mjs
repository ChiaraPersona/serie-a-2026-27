import { cardType, coverageStatus, disciplinaryCoverage, nameKey } from "../../../js/pages/disciplinary.mjs";

const playerName = player => player.playerName ?? player.player ?? player.name;
const samePlayer = (a, b) => a.playerId && b.playerId
  ? a.playerId === b.playerId
  : Boolean(nameKey(playerName(a)) && nameKey(playerName(a)) === nameKey(playerName(b)));

export function recordedDuoYellow(match, candidate) {
  const teamId = candidate.teamId;
  const side = teamId === match.homeTeam ? "home" : teamId === match.awayTeam ? "away" : null;
  const unavailable = { status: "unknown" };
  if (!side || disciplinaryCoverage(match) !== "COMPLETE" ||
      coverageStatus(match.resultCoverage?.substitutions) !== "COMPLETE" || !Array.isArray(match.substitutions)) return unavailable;

  const played = match.playerStats?.[side] ?? [];
  const unused = (match.didNotPlay?.[side] ?? []).map(row => typeof row === "string" ? { player: row } : row);
  const roster = [...played, ...unused];
  let primary = roster.filter(player => samePlayer(candidate, player));
  if (!primary.length && !candidate.playerId) {
    const aliases = (match.playerIdentityAliases ?? []).filter(player => player.teamId === teamId &&
      [player.canonicalName, ...player.aliases].some(name => nameKey(name) === nameKey(playerName(candidate))));
    if (aliases.length === 1) primary = roster.filter(player => player.playerId === aliases[0].playerId);
    if (!aliases.length) {
      primary = roster.filter(player => player.playerId && playerName(player)?.split(/\s+/).slice(1)
        .some((_, index) => nameKey(playerName(player).split(/\s+/).slice(index + 1).join(" ")) === nameKey(playerName(candidate))));
    }
  }
  if (primary.length !== 1) return unavailable;
  const [player] = primary;
  if (unused.includes(player) || player.minutes === 0) return { status: "unused" };
  if (!(player.minutes > 0)) return unavailable;

  const swaps = match.substitutions.filter(event => event.team === teamId &&
    samePlayer(player, { playerId: event.playerOutId, player: event.playerOut }));
  if (swaps.length > 1) return unavailable;
  const [swap] = swaps;
  const replacements = swap ? played.filter(row => samePlayer(row, { playerId: swap.playerInId, player: swap.playerIn })) : [];
  if (swap && replacements.length !== 1) return unavailable;
  const [replacement] = replacements;
  const events = match.bookings.filter(event => (event.teamId ?? event.team) === teamId);
  const booked = row => events.find(event => samePlayer(row, event) && cardType(event.eventType ?? event.card) === "yellow");
  const individual = booked(player);
  if (individual) return { status: "hit", via: "player", player: playerName(player), minute: individual.minute };
  const substituteYellow = replacement && booked(replacement);
  if (substituteYellow) return { status: "hit", via: "replacement", player: playerName(replacement), minute: substituteYellow.minute };
  if (events.some(event => (!event.playerId && !playerName(event)) ||
      (cardType(event.eventType ?? event.card) === "unknown" && (samePlayer(player, event) || replacement && samePlayer(replacement, event))))) return unavailable;
  return { status: "miss" };
}
