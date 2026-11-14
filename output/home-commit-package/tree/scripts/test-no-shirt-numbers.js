'use strict';
// Historical filename retained for package.json compatibility: numbers are now allowed
// only as verified biographical metadata, never as predictive inputs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const source=read('data/sources/team-pages/shirt-numbers-2026-27.json');
const mapped=new Map();
for(const row of source.players){
 const key=`${row.teamId}:${row.playerId}`;assert(!mapped.has(key),`Duplicate ${key}`);
 assert(Number.isInteger(row.shirtNumber)&&row.shirtNumber>=1&&row.shirtNumber<=99);
 assert(source.numberHistory.some(e=>e.teamId===row.teamId&&e.playerId===row.playerId&&e.shirtNumber===row.shirtNumber&&e.documentDate===row.documentDate));
 assert(/^https:\/\/(images\.legaseriea\.it|www\.transfermarkt\.it)\//.test(row.sourceUrl));mapped.set(key,row.shirtNumber);
}
let count=0;
for(const team of read('data/normalized/teams.json')){
 const actual=read(`data/teams/${team.id}.json`),profiles=read(`data/generated/team-pages/${team.id}-squad.json`).players;
 assert.deepEqual(actual.squad.map(p=>p.id),profiles.map(p=>p.id));
 const used=new Set();for(const p of actual.squad){const number=mapped.get(`${team.id}:${p.id}`)??null;assert.equal(p.shirtNumber,number);if(number!==null){assert(!used.has(number),`Duplicate number ${team.id}:${number}`);used.add(number);count++}}
}
assert.equal(count,source.players.length);
for(const folder of ['scripts/predictions','js/predictions'])if(fs.existsSync(path.join(root,folder))){
 const scan=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(/\.[mc]?js$/.test(p))assert(!/shirtNumber/.test(fs.readFileSync(p,'utf8')),`Shirt number in prediction engine ${p}`)}};scan(path.join(root,folder));
}
console.log(`OK: ${count} verified numbers; 20 rosters unchanged; missing numbers null; no predictive dependency.`);
