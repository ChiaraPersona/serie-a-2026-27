// Link six new reading analyses to the full archive; preserve the four approved projections.
const fs=require('node:fs');
const file='data/sources/reading-referee-match-history.json',data=JSON.parse(fs.readFileSync(file));
const database='data/normalized/referee-history/md07-2026-27.json';
const fixtures=JSON.parse(fs.readFileSync('data/normalized/matches.json')).filter(m=>m.competition==='serie-a'&&m.matchday===7);
const previous=new Set(['daniele-chiffi','davide-massa','andrea-calzavara','giovanni-ayroldi']);
const additions=fixtures.filter(m=>!previous.has(m.refereeAssignment.referee.slug)).map(m=>({fixtureId:m.id,refereeSlug:m.refereeAssignment.referee.slug,historyRef:database,retrievedAt:'2026-10-18',informationalOnly:true}));
data.fixtureAnalyses=[...(data.fixtureAnalyses||[]).filter(e=>!additions.some(a=>a.fixtureId===e.fixtureId)),...additions];
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');console.log('Six archive references added; four approved analyses preserved.');
