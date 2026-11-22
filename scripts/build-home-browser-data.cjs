'use strict';
// Descriptive browser projection only: no model, odds or settlement calculation.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),output='data/generated/home-ui.json';
const matchFields=['id','competition','season','matchday','stage','homeTeam','awayTeam','matchdayDate','date','kickoff','timezone','dateStatus','status','score','teamStats','statistics'];
const directoryFields=['id','name','logo','monochromeLogo','colors','stadium','coach','preferredFormation'];
const pick=(value,fields)=>Object.fromEntries(fields.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
function build(){const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));const matches=read('data/normalized/matches.json');const data={schemaVersion:1,teams:read('data/normalized/teams.json'),matches:matches.map(m=>pick(m,matchFields)),previousStandings:read('data/normalized/standings-2025-26.json'),directory:{teams:read('data/teams/index.json').teams.map(t=>pick(t,directoryFields))}};
 const write=(file,value)=>{const text=JSON.stringify(value)+'\n',target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)fs.writeFileSync(target,text);return Buffer.byteLength(text);};
 const bytes=write(output,data);for(let day=1;day<=38;day++)write(`data/generated/matches/md${String(day).padStart(2,'0')}.json`,matches.filter(m=>m.competition==='serie-a'&&m.matchday===day));
 return {file:output,bytes,matches:data.matches.length};}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports={build,matchFields,directoryFields,output};
