const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const callups = read("data/sources/fantacalcio-callups-md1-2026-27.json");
const quotations = read("data/sources/fantacalcio-quotations-2026-27.json");
const generated = read("data/generated/fantacalcio-advice.json");

assert.equal(callups.provider, "Fantacalcio.it");
assert.equal(callups.sourceUrl, "https://www.fantacalcio.it/convocati-serie-a");
assert.equal(callups.season, "2026/27");
assert.equal(callups.matchday, 1);
assert.equal(callups.coverage.teams, 20);
assert.ok(callups.coverage.teamsWithOfficialList >= 18);
assert.ok(callups.coverage.players >= 440);

const callupPlayers = callups.teams.flatMap(team => team.players);
assert.equal(new Set(callupPlayers.map(player => String(player.sourceId))).size, callupPlayers.length);
assert.deepEqual(callups.coverage.byStatus, Object.fromEntries(
  ["called-up", "suspended", "one-booking-away", "injured"].map(status => [status, callupPlayers.filter(player => player.status === status).length])
));

for (const team of callups.teams.filter(team => team.officialListAvailable)) {
  const expected = new Set(team.players.map(player => String(player.sourceId)));
  const actual = new Set(quotations.players.filter(player => player.teamId === team.teamId).map(player => String(player.sourceId)));
  const stillAtTeam = [...expected].filter(sourceId => actual.has(sourceId));
  assert.ok(stillAtTeam.every(sourceId => actual.has(sourceId)), `${team.team}: un convocato ancora in rosa è assente dal database attivo`);
}

assert.equal(quotations.players.length, quotations.coverage.activePlayers);
assert.equal(generated.listone.players.length, quotations.players.length);
const activePlayerIds = new Set(quotations.players.filter(player => player.playerId).map(player => player.playerId));
assert.ok(generated.players.every(player => activePlayerIds.has(player.id)), "i consigli contengono un calciatore assente dal database attivo");
assert.ok(quotations.players.every(player => Number.isFinite(player.currentQuotation)), "il listone aggiornato deve avere una quotazione attuale per ogni attivo");

console.log(`Convocati Fantacalcio: ${callups.coverage.players} presenze dalla pagina, ${quotations.players.length} nomi attivi inclusi i club incompleti, ${generated.players.length} profili analitici.`);
