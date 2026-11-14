const fs = require('fs');
const path = require('path');
const base = path.resolve(__dirname, '..');
const dir = path.join(base, 'data/raw/champions-squads-2026-10-29');
const decode = s => s.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
const roles = {Portieri:'goalkeeper', Difensori:'defender', Centrocampisti:'midfielder', Attaccanti:'forward'};
const files = ['data/sources/champions-registered-squads-2026-27.json', ...fs.readdirSync(path.join(base,'data/sources/champions-squads')).filter(f=>f.endsWith('.json')).map(f=>'data/sources/champions-squads/'+f)];
async function main() {
  fs.mkdirSync(dir,{recursive:true});
  const report = [];
  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(base,file),'utf8'));
    for (const team of doc.teams) {
      const url = `https://it.uefa.com/uefachampionsleague/clubs/${team.uefaClubId}/squad/`;
      const cache = path.join(dir,`${team.uefaClubId}.html`);
      if (!fs.existsSync(cache)) {
        const res = await fetch(url, {signal:AbortSignal.timeout(45000)});
        if (!res.ok) throw Error(`${team.team}: HTTP ${res.status}`);
        fs.writeFileSync(cache,await res.text());
      }
      const html = fs.readFileSync(cache,'utf8');
      if (!html.includes('2026/27')) throw Error(`${team.team}: season mismatch`);
      const players = [];
      const sections = [...html.matchAll(/<h2 class="squadlist--role">([^<]+)<\/h2>([\s\S]*?)(?=<h2 class="squadlist--role">|$)/g)];
      for (const [,label,section] of sections) {
        if (!roles[label.trim()]) continue;
        for (const [row] of section.matchAll(/<pk-table-row class="row--squadlist">[\s\S]*?<\/pk-table-row>/g)) {
          const match = row.match(/clubs\/players\/(\d+)[^"*]*" title="([^"]+)"/);
          if (!match) throw Error(`${team.team}: player parse failed`);
          const full = row.match(/itemprop="name" class="pk-d--none pk-d-xs--block">([\s\S]*?)<\/span>/);
          players.push({uefaPlayerId:match[1],name:decode(match[2]),position:roles[label.trim()],registrationList:full?.[1].includes('*')?'B':null});
        }
      }
      if(players.length<18 || new Set(players.map(p=>p.uefaPlayerId)).size!==players.length) throw Error(`${team.team}: invalid roster ${players.length}`);
      const exact = new Map(team.players.map(p=>[p[0].normalize('NFC'),p]));
      report.push({team:team.team,file,url,uefaClubId:team.uefaClubId,oldCount:team.players.length,newCount:players.length,added:players.filter(p=>!exact.has(p.name.normalize('NFC'))),absent:team.players.filter(p=>!players.some(q=>q.name.normalize('NFC')===p[0].normalize('NFC'))),players});
      console.log(team.team,team.players.length,'->',players.length);
    }
  }
  fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify({checkedAt:new Date().toISOString(),teams:report},null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});
