'use strict';
// Browser-only projections: no forecasting or canonical input changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),directory='data/generated/champions-teams/';
const sources=['champions-registered-squads-2026-27.json','champions-md03-player-database-2026-27.json','champions-player-history-context-2025-26.json'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
function write(file,value){
 const target=path.join(root,file),text=JSON.stringify(value)+'\n';fs.mkdirSync(path.dirname(target),{recursive:true});
 if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===text)return;
 fs.writeFileSync(target+'.tmp',text);fs.renameSync(target+'.tmp',target);
}
function project(squads,registry,history,team){
 const canonicalId=team.id==='bod-glimt'?'bodo-glimt':team.id;
 const previous=registry.teams.find(t=>t.teamId===canonicalId);
 const needed=new Set(team.players.filter(p=>!p.previousSeason&&p.uefaPlayerId).map(p=>String(p.uefaPlayerId)));
 const historical=history.teams.find(t=>t.teamId===team.id);
 const shirtNumbers=squads.shirtNumbers?{...squads.shirtNumbers,records:(squads.shirtNumbers.records||[]).filter(r=>r.teamId===team.id||(team.uefaClubId&&String(r.uefaClubId)===String(team.uefaClubId)))}:squads.shirtNumbers;
 return {schemaVersion:1,teamId:team.id,datasets:{
  [sources[0]]:{...squads,teams:[team],...(shirtNumbers?{shirtNumbers}:{})},
  [sources[1]]:{schemaVersion:registry.schemaVersion,teams:previous?[{teamId:previous.teamId,players:previous.players.filter(p=>needed.has(String(p.uefaPlayerId))).map(p=>({uefaPlayerId:p.uefaPlayerId,previousSeason:p.previousSeason}))}]:[]},
  [sources[2]]:{...history,teams:historical?[historical]:[]}
 }};
}
function build(){
 const inputs=[...sources.map(f=>'data/normalized/'+f),'scripts/build-champions-team-data.cjs'];
 const inputHashes=inputs.map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 const manifestFile=directory+'build-manifest.json';
 const previous=fs.existsSync(path.join(root,manifestFile))?read(manifestFile):null;
 if(previous&&JSON.stringify(previous.inputs)===JSON.stringify(inputHashes)&&previous.outputs.every(r=>fs.existsSync(path.join(root,r.path))&&sha(fs.readFileSync(path.join(root,r.path)))===r.sha256))return {teams:previous.teamIds.length,reused:true};
 const [squads,registry,history]=sources.map(f=>read('data/normalized/'+f));
 const teamIds=squads.teams.map(t=>t.id);
 if(new Set(teamIds).size!==36||teamIds.some(id=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))throw Error('Non-canonical Champions club registry');
 const outputs=[];let bytes=0;
 for(const team of squads.teams){const file=directory+team.id+'.json';write(file,project(squads,registry,history,team));outputs.push(file);bytes+=fs.statSync(path.join(root,file)).size;}
 write(directory+'index.json',{schemaVersion:1,teamIds});outputs.push(directory+'index.json');
 write(manifestFile,{schemaVersion:1,inputs:inputHashes,teamIds,outputs:outputs.map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(root,file)))}))});
 return {teams:teamIds.length,bytes,reused:false};
}
function verify(){
 const file=directory+'build-manifest.json';if(!fs.existsSync(path.join(root,file)))throw Error('Build Champions team projections first');
 const manifest=read(file);
 for(const item of [...manifest.inputs,...manifest.outputs])if(!fs.existsSync(path.join(root,item.path))||sha(fs.readFileSync(path.join(root,item.path)))!==item.sha256)throw Error('Rebuild Champions team projections: '+item.path);
 return manifest.outputs.map(row=>row.path);
}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports={build,project,verify,sources};
