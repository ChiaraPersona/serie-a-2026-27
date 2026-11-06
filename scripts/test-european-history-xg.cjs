'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {project}=require('./build-european-history-xg.cjs'),history=require('./build-serie-a-team-history.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),unpack=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const entries=read('data/normalized/european-history-xg-2026-27.json').entries;
const fixtures=history.europeanFixtures(read('data/normalized/teams.json'),read('data/normalized/champions-league-2026-27.json'),history.loadEuropeanResults());
assert.equal(entries.length,27);
for(const entry of entries){
 const raw=unpack(entry.source.rawPath),fixture=fixtures.find(f=>f.id===entry.fixtureId),league=unpack(entry.source.calendarPath).payload;
 const calendar=(league.fixtures?.allMatches||league.matches?.allMatches).find(m=>String(m.id)===entry.providerMatchId);
 assert.deepEqual(project(raw,fixture,calendar),entry.expectedGoals);
 const wrong=structuredClone(raw);wrong.payload.general.homeTeam.id=-1;assert.throws(()=>project(wrong,fixture,calendar));
 const otherMetric=structuredClone(raw);
 for(const group of otherMetric.payload.content.stats.Periods.All.stats)for(const stat of group.stats||[])if(stat.key==='expected_goals')stat.key='expected_goals_on_target';
 assert.deepEqual(project(otherMetric,fixture,calendar),{home:null,away:null},'xGOT must never replace xG');
}
const result=read('data/generated/serie-a-team-history.json');
assert(Object.values(result.teams).flat().every(r=>Number.isFinite(r.stats.expectedGoals)),'Missing xG remains in current history');
console.log('OK 27 European match identities, 54 xG values; wrong team IDs rejected, xGOT excluded; current history complete.');
