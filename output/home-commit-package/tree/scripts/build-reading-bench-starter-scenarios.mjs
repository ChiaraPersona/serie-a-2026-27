import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readingCases} from './readings/fixtures.mjs';
import {buildStarterScenarioFixture} from './readings/bench-starter-scenarios.mjs';
const require=createRequire(import.meta.url),{buildProfiles}=require('./build-team-matchup-profiles.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),byId=rows=>new Map(rows.map(p=>[p.teamId||p.id,p]));
const matches=read('data/normalized/matches.json'),directory=read('data/teams/index.json').teams;
const squads=new Map(directory.map(t=>[t.id,read('data/generated/team-pages/'+t.id+'-squad.json')]));
const styles=byId(read('data/normalized/team-style-profiles.json').profiles),volumes=byId(read('data/normalized/team-volume-profiles-2025-26.json').profiles),profiles=new Map();
const cases=(await readingCases()).filter(c=>c.model.competition==='serie-a'&&c.model.prediction&&(!process.argv.includes('--md7-only')||c.model.fixture.matchday===7)),fixtures=[];
for(const c of cases){const day=Number(c.model.fixture.matchday);if(!profiles.has(day))profiles.set(day,byId(day>1?buildProfiles({asOfMatchday:day}).profiles:[]));fixtures.push(buildStarterScenarioFixture(c,{squads,styles,volumes,matches,matchupProfiles:profiles.get(day)}));}
const players=fixtures.flatMap(f=>f.players),result={schemaVersion:1,kind:'reading-only-if-starting-scenarios',policies:{independentScenarios:true,originalProjections:'unchanged',observedHistoricalMinutes:700,observedCurrentMinutes:270,minutes:'existing expectedMinutes with starter-only recent window',teamTotals:'original fixed inputs; hypothetical player rows never aggregated into published totals'},adapterHash:crypto.createHash('sha256').update(fs.readFileSync('scripts/readings/bench-starter-scenarios.mjs')).digest('hex'),engineHash:crypto.createHash('sha256').update(fs.readFileSync('scripts/predictions/engine.js')).digest('hex'),fixtures,summary:{fixtures:fixtures.length,players:players.length,estimated:players.filter(p=>Number.isFinite(p.projectedShots)).length,reasons:players.reduce((a,p)=>{if(p.reason)a[p.reason]=(a[p.reason]||0)+1;return a},{})}};
const folder='data/generated/reading-bench-starter-scenarios';fs.mkdirSync(folder,{recursive:true});for(const fixture of fixtures){const f=folder+'/'+fixture.fixtureId+'.json';fs.writeFileSync(f+'.tmp',JSON.stringify(fixture,null,2)+'\n');fs.renameSync(f+'.tmp',f);}result.fixtures=fixtures.map(f=>({fixtureId:f.fixtureId,path:folder+'/'+f.fixtureId+'.json'}));
const target='data/generated/reading-bench-starter-scenarios.json';fs.writeFileSync(target+'.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(target+'.tmp',target);console.log(result.summary);
