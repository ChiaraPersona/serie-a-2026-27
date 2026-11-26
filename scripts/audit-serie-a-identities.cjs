'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadPlayerIdentities}=require('./player-identity');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const registry=loadPlayerIdentities(root),teams=read('data/teams/index.json').teams,known=new Set(registry.payload.players.map(p=>`${p.teamId}:${p.playerId}`));
const issues=[],counts={},fixtures=read('data/normalized/matches.json'),byId=new Map(fixtures.map(f=>[f.id,f]));
for(const t of teams)for(const file of [`data/teams/${t.id}.json`,`data/generated/team-pages/${t.id}-squad.json`]){
 const d=read(file),players=d.squad||d.players;for(const p of players){if(p.id)known.add(`${t.id}:${p.id}`);else issues.push({dataset:file,teamId:t.id,name:p.name,status:'missing-roster-id'});}
 const ids=players.map(p=>p.id).filter(Boolean);if(new Set(ids).size!==ids.length)issues.push({dataset:file,teamId:t.id,status:'duplicate-roster-id'});
}
function check(p,{dataset,fixtureId,teamId,section,optional=false}){
 counts[dataset]=(counts[dataset]||0)+1;const id=p.playerId||p.canonicalPlayerId||null,name=p.player||p.sourceName||p.currentName||p.playerName||p.providerPlayerName||p.name||null;
 if(!id||teamId&&!known.has(`${teamId}:${id}`)){
 const alias=teamId&&name?registry.resolve(teamId,name):null;
 issues.push({dataset,fixtureId,teamId,section,name,playerId:id,status:id?'unknown-id':optional?'optional-missing-id':'missing-id',exactAliasId:alias?.playerId||null});
 }
}
for(const dataset of ['data/normalized/matches.json','data/sources/match-results-2026-27.json']){
 const d=read(dataset);for(const f of Array.isArray(d)?d:d.matches){const id=f.id||f.matchId,meta=byId.get(id);if(!meta||meta.competition!=='serie-a')continue;
 for(const section of ['playerStats','didNotPlay'])for(const side of ['home','away'])for(const p of f[section]?.[side]||[])check(p,{dataset,fixtureId:id,teamId:meta[side+'Team'],section,optional:section==='didNotPlay'});
 for(const section of ['scorers','bookings','substitutions','mvp']){function visit(v){if(!v||typeof v!=='object')return;const teamId=v.teamId||(teams.some(t=>t.id===v.team)?v.team:null);if(!Array.isArray(v)&&Object.hasOwn(v,'playerId'))check(v,{dataset,fixtureId:id,teamId,section});for(const side of ['In','Out'])if(Object.hasOwn(v,`player${side}Id`))check({playerId:v[`player${side}Id`],player:v[`player${side}`]},{dataset,fixtureId:id,teamId,section:`substitution-${side.toLowerCase()}`});for(const x of Object.values(v))if(x&&typeof x==='object')visit(x);}visit(f[section]);}
 }}
const officialFile='data/sources/official-lineups-2026-27.json';
for(const f of read(officialFile).fixtures)for(const t of f.teams)for(const section of ['players','substitutes'])for(const p of t[section]||[])check(p,{dataset:officialFile,fixtureId:f.matchId,teamId:t.teamId,section,optional:section==='substitutes'});
const probable=require('./probable-lineups').loadLatestProbableLineups(root),probableFile=`probable-md${probable.matchday}`;
for(const t of probable.teams)for(const p of t.players)check(p,{dataset:probableFile,fixtureId:t.matchId,teamId:t.teamId,section:p.lineupStatus});
for(const p of probable.omittedNonRoster||[])check(p,{dataset:probableFile,teamId:p.teamId,section:'omittedNonRoster',optional:true});
const predictionFile='data/normalized/predictions.json';let exceptions=0;
function visitPred(v,fixtureId){if(!v||typeof v!=='object')return;if(v.matchId)fixtureId=v.matchId;
 if(!Array.isArray(v)&&Object.hasOwn(v,'playerId')){if(v.playerId===null&&(v.dataStatus==='role-baseline'||v.identityResolution==='UNRESOLVED_NAME_ONLY'&&v.riskScoreSemantics==='COMPARATIVE_HEURISTIC_NOT_PROBABILITY'))exceptions++;else check(v,{dataset:predictionFile,fixtureId,teamId:v.teamId||null,section:'prediction'});}
 for(const x of Object.values(v))if(x&&typeof x==='object')visitPred(x,fixtureId);
}visitPred(read(predictionFile));
const shotFile='data/normalized/serie-a-shot-events-2026-27.json';for(const m of read(shotFile).matches)for(const p of m.events)check(p,{dataset:shotFile,fixtureId:m.fixtureId,teamId:p.teamId,section:'shot-event'});
const historicalProbables=[];for(const file of fs.readdirSync(path.join(root,'data/sources')).filter(f=>/^probable-lineups-md\d+-2026-27\.json$/.test(f))){const d=read('data/sources/'+file);if(d.matchday===probable.matchday)continue;const rows=(d.teams||[]).flatMap(t=>(t.players||[]).map(p=>({teamId:t.teamId,name:p.sourceName||p.currentName,playerId:p.playerId,status:p.lineupStatus})));historicalProbables.push({file,matchday:d.matchday,rows:rows.length,missing:rows.filter(p=>!p.playerId)});}
const groups={};for(const i of issues){const key=[i.teamId||'',i.name||'',i.playerId||'',i.status].join('|');const g=groups[key]||(groups[key]={teamId:i.teamId,name:i.name,playerId:i.playerId,status:i.status,exactAliasId:i.exactAliasId,references:0,datasets:new Set(),fixtures:new Set()});g.references++;g.datasets.add(i.dataset);if(i.fixtureId)g.fixtures.add(i.fixtureId);}
const grouped=Object.values(groups).map(g=>({...g,datasets:[...g.datasets],fixtures:[...g.fixtures]}));
const result={generatedAt:new Date().toISOString(),scope:'Serie A: rose canoniche e proiezioni, risultati, eventi, ufficiali, probabili correnti e snapshot precedenti, previsioni e shot events',counts,allowedPredictionFallbacks:exceptions,historicalProbables,summary:{requiredMissing:issues.filter(i=>i.status==='missing-id').length,optionalMissing:issues.filter(i=>i.status==='optional-missing-id').length,unknownIds:issues.filter(i=>i.status==='unknown-id').length,rosterProblems:issues.filter(i=>/roster/.test(i.status)).length,uniqueGroups:grouped.length},groups:grouped,issues};
fs.mkdirSync(path.join(root,'reports/serie-a-identity-audit'),{recursive:true});fs.writeFileSync(path.join(root,'reports/serie-a-identity-audit/latest.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({summary:result.summary,counts,allowedPredictionFallbacks:exceptions,requiredGroups:grouped.filter(g=>g.status==='missing-id').map(g=>({team:g.teamId,name:g.name,references:g.references,fixtures:g.fixtures,exactAliasId:g.exactAliasId}))},null,2));
