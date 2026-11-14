'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {readJsonFile:read}=require('./sisal/dataset-store.cjs');
const {profileRows,buildSharedScenarios}=require('./champions/shared-scenario.cjs');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source=read('data/sources/champions-pilot-match-stats-2025-27.json');
const before=read('output/champions-coverage-2026-11-02/source-before.json');
const evidence=read('data/sources/champions-team-coverage-refresh-2026-11-02.json');
const lineups=read('data/sources/champions-probable-formations-md04-2026-27.json');
const files=['data/normalized/schedina-champions-md04.json','data/generated/champions-shared-scenarios.json','data/normalized/odds/sisal/champions-league.json'];
const protectedBefore=Object.fromEntries(files.map(p=>[p,hash(p)]));
const cutoff=new Date().toISOString(),rows=[];
assert.equal(evidence.schedules.length,18);
for(const t of lineups.teams){
 const cfg=source.teams.find(c=>c.id===t.teamId),old=before.teams.find(c=>c.id===t.teamId);
 const current=profileRows(source,cfg,cutoff),previous=profileRows(before,old,cutoff);
 assert(current.length>=6,t.team+' insufficient sample');
 assert(current.at(-1).date>='2026-10-30',t.team+' stale sample');
 for(const venue of ['home','away'])assert(current.filter(r=>r.venue===venue).length>=2);
 for(const m of current){assert(m.date<'2026-11-03');assert(m.for.totalShots>=m.for.shotsOnTarget);assert(m.against.totalShots>=m.against.shotsOnTarget);}
 rows.push({team:t.team,teamId:t.teamId,before:previous.length,after:current.length,lastBefore:previous.at(-1)?.date,lastAfter:current.at(-1)?.date,recent:current.filter(m=>m.date>='2026-10-17').length,currentSeason:current.filter(m=>m.date>='2026-07-01').length});
}
const oldIds=new Set(before.matches.map(m=>m.eventId)),ids=new Set(source.matches.map(m=>m.eventId));
assert(before.matches.every(m=>ids.has(m.eventId)),'Prior records removed');
for(const m of evidence.matches){
 assert.equal(m.periodScope,'regulation');assert(m.date<='2026-11-02');assert(fs.existsSync(m.source.rawFile));
 for(const side of ['home','away'])for(const k of ['totalShots','shotsOnTarget','wonCorners','foulsCommitted','yellowCards'])assert(m[side].statistics[k]===null||(Number.isInteger(m[side].statistics[k])&&m[side].statistics[k]>=0));
 if(m.source.provider==='FotMob')assert(/^fotmob:/.test(m.eventId));
}
assert(evidence.failures.every(f=>f.error==='Regulation period not certified'),'Unexpected acquisition failures');
const shakhtar=source.matches.find(m=>m.league==='ukr.1'&&m.date==='2026-10-30');
assert.equal(shakhtar.coverage,'partial');assert.equal(shakhtar.home.statistics.foulsCommitted,null,'Missing fouls must not become zero');
const calendar=read('data/normalized/champions-league-2026-27.json'),scope=new Set(lineups.teams.map(t=>t.fixtureId));
const staged=buildSharedScenarios({calendar:{...calendar,fixtures:calendar.fixtures.filter(f=>scope.has(f.id))},source,styles:read('data/normalized/team-style-profiles.json'),odds:read('data/normalized/odds/sisal/champions-league.json'),asOf:cutoff,matchday:4});
assert.equal(staged.fixtures.length,9);assert(staged.fixtures.every(f=>f.status==='preliminary'&&f.teamProjections.every(t=>t.shotsTotal&&t.shotsOnTarget&&t.corners)));
for(const [p,h]of Object.entries(protectedBefore))assert.equal(hash(p),h,'Public forecast/quote changed');
fs.writeFileSync('output/champions-coverage-2026-11-02/coverage.json',JSON.stringify(rows,null,2)+'\n');
const report={asOf:'2026-11-02',teams:18,additionalCanonicalRecords:source.matches.filter(m=>!oldIds.has(m.eventId)).length,integrativeReports:evidence.matches.length,excludedNonRegulationReports:evidence.failures.length,stagedScenarios:9,publishedForecastsRecalculated:false,protectedFiles:protectedBefore,rows};
fs.writeFileSync('output/champions-coverage-2026-11-02/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({teams:18,additionalCanonicalRecords:report.additionalCanonicalRecords,integrativeReports:evidence.matches.length,excludedNonRegulationReports:evidence.failures.length,stagedScenarios:9,publishedForecastsRecalculated:false}));
