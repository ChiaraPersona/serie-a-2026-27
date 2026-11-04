const fs=require('node:fs');
const base='output/champions-md04-verification';
(async()=>{const events=JSON.parse(fs.readFileSync(base+'/scoreboard.json')).events;
await Promise.all(events.map(async e=>{const url='https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event='+e.id;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(r.status);const payload=await r.json();fs.writeFileSync(base+'/'+e.id+'.json',JSON.stringify({url,retrievedAt:new Date().toISOString(),payload}));console.log(e.id, payload.rosters?.length);}));})().catch(e=>{console.error(e);process.exitCode=1});
