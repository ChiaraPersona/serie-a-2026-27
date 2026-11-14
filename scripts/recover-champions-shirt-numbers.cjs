// Recover missing numbers from the archived, season-checked UEFA squad pages.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const registryPath = 'data/sources/champions-shirt-numbers-2026-27.json';
const registry = read(registryPath);
const squads = read('data/normalized/champions-registered-squads-2026-27.json');
const md3 = read('data/sources/champions-md03-squads-2026-27.json');
let recovered = 0;
for (const team of squads.teams) {
  const archive = `data/raw/champions-squads-2026-10-29/${team.uefaClubId}.html`;
  const html = fs.readFileSync(path.join(root, archive), 'utf8');
  if (!html.includes('2026/27')) throw Error(`${team.id}: unexpected season`);
  const rows = [...html.matchAll(/<pk-table-row class="row--squadlist">[\s\S]*?<\/pk-table-row>/g)].map(([row]) => ({
    id: row.match(/clubs\/players\/(\d+)/)?.[1],
    number: Number(row.match(/itemprop="numberedPosition">\s*(\d+)/)?.[1])
  }));
  for (const player of team.players) {
    const previousPlayer = md3.teams.find(t => t.teamId === team.id)?.players.find(p => player.uefaPlayerId && String(p.uefaPlayerId) === String(player.uefaPlayerId));
    const exactNameRecords = registry.records.filter(r => r.teamId === team.id && r.canonicalName === player.name && r.block !== 'uefa-archive-recovery');
    const previousRecord = (previousPlayer && registry.records.find(r => r.teamId === team.id && r.playerId === previousPlayer.playerId && r.block !== 'uefa-archive-recovery')) || (exactNameRecords.length === 1 ? exactNameRecords[0] : null);
    if (previousRecord && previousRecord.playerId !== player.id) {
      const evidence = rows.filter(row => row.id === String(player.uefaPlayerId));
      if (evidence.length !== 1 || evidence[0].number !== previousRecord.shirtNumber) throw Error(`${team.id}:${player.id}: conflicting number`);
      previousRecord.playerIdAliases = [...new Set([...(previousRecord.playerIdAliases || []), player.id])];
      registry.records = registry.records.filter(r => !(r.block === 'uefa-archive-recovery' && r.teamId === team.id && r.playerId === player.id));
    }
    const existing = registry.records.find(r => r.teamId === team.id && (r.playerId === player.id || r.playerIdAliases?.includes(player.id)));
    if (existing) continue;
    if (!player.uefaPlayerId) continue;
    const matches = rows.filter(row => row.id === String(player.uefaPlayerId));
    if (matches.length !== 1 || !Number.isInteger(matches[0].number) || matches[0].number < 1 || matches[0].number > 99) continue;
    const number = matches[0].number;
    registry.records.push({
      teamId: team.id, uefaClubId: team.uefaClubId, playerId: player.id,
      stablePlayerId: `${team.id}:${player.id}`, uefaPlayerId: String(player.uefaPlayerId),
      canonicalName: player.name, aliases: [player.name], shirtNumber: number,
      existingConfirmedNumber: number, status: 'accepted', block: 'uefa-archive-recovery',
      source: {provider: 'UEFA', url: `https://it.uefa.com/uefachampionsleague/clubs/${team.uefaClubId}/squad/`,
        archive, snapshotDate: '2026-10-29', sha256: crypto.createHash('sha256').update(html).digest('hex')}
    });
    recovered++;
  }
}
registry.scope = [...new Set([...registry.scope, ...registry.records.map(r => r.teamId)])];
fs.writeFileSync(path.join(root, registryPath), JSON.stringify(registry, null, 2) + '\n');
// Update only the presentation fields; leave existing historical profiles intact.
for (const team of squads.teams) for (const player of team.players) {
  const row = registry.records.find(r => r.status === 'accepted' && r.teamId === team.id && (r.playerId === player.id || r.playerIdAliases?.includes(player.id)));
  if (row && player.shirtNumber == null) player.shirtNumber = row.shirtNumber;
}
squads.shirtNumbers = registry;
fs.writeFileSync(path.join(root, 'data/normalized/champions-registered-squads-2026-27.json'), JSON.stringify(squads) + '\n');
console.log(JSON.stringify({recovered, accepted: registry.records.length}));
