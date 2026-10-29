const fs = require('fs');
const audit = require('../data/raw/champions-squads-2026-10-29/audit.json');
const registry = require('../data/normalized/champions-md03-player-database-2026-27.json');
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
for (const file of new Set(audit.teams.map(t=>t.file))) {
  const doc = JSON.parse(fs.readFileSync(file,'utf8'));
  for (const team of doc.teams) {
    const verified = audit.teams.find(t=>t.team===team.team);
    const prior = registry.teams.find(t=>t.team===team.team);
    team.players = [];
    team.playerIdentities = verified.players.map(p=>{
      const known = prior?.players.find(q=>String(q.uefaPlayerId)===String(p.uefaPlayerId));
      const name = known?.canonicalName || p.name.trim().replace(/\s+/g,' ');
      team.players.push([name,p.position,p.registrationList]);
      return {name,playerId:known?.playerId || slug(name),uefaPlayerId:p.uefaPlayerId};
    });
    team.rosterVerifiedAt = '2026-10-29';
    team.sources = team.sources.filter(source=>source.archive!==`data/raw/champions-squads-2026-10-29/${team.uefaClubId}.html`);
    team.sources.push({provider:'UEFA',url:verified.url,scope:'official-competition-squad',retrievedAt:audit.checkedAt,archive:`data/raw/champions-squads-2026-10-29/${team.uefaClubId}.html`});
  }
  if (doc.snapshotDate) doc.snapshotDate = '2026-10-29';
  fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
}
