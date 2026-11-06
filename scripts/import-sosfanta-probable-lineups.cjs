'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadPlayerIdentities,normalizePlayerName}=require('./player-identity');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#039;|&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
function parse(html){
 return [...html.matchAll(/<article\b[^>]*id="match-([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)].map(([,slug,body])=>{
  const header=body.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  const names=[...header.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(m=>clean(m[1]));
  const formations=[...header.matchAll(/<span\b[^>]*text-primary[^>]*>([\s\S]*?)<\/span>/g)].map(m=>clean(m[1]));
  assert.equal(names.length,2);assert.equal(formations.length,2);
  const sides=names.map((team,i)=>({team,formation:formations[i],players:[],ballots:[],unavailable:[],suspended:[],doubtful:[]}));
  for(const section of body.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)){
   const title=clean(section[1].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1]||'');
   const lists=[...section[1].matchAll(/<ul\b[^>]*>([\s\S]*?)<\/ul>/g)];assert.equal(lists.length,2,title);
   lists.forEach((list,i)=>{for(const li of list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)){
    const spans=[...li[1].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)].map(m=>clean(m[1]));
    const probabilities=spans.filter(s=>/^\d+%$/.test(s)).map(s=>Number(s.slice(0,-1)));
    const label=spans.find(s=>s&&s!=='-'&&!/^\d+%$/.test(s));if(!label)continue;
    const description=clean(li[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1]||'')||null;
    if(title==='Titolari'||title==='Panchina')sides[i].players.push({sourceName:label,probability:probabilities[0]??null,lineupStatus:title==='Titolari'?'starter':'reserve'});
    else if(title==='Ballottaggi')sides[i].ballots.push(label.split(' - ').map((sourceName,j)=>({sourceName,probability:probabilities[j]??null,description:null})));
    else {const field=title==='In dubbio'?'doubtful':/Squalificato/i.test(li[1])?'suspended':'unavailable';sides[i][field].push({sourceName:label,probability:null,description});}
   }});
  }
  return {slug,date:header.match(/datetime="([^"]+)"/)[1],sides};
 });
}
function main(){
 const args=process.argv.slice(2),get=flag=>args[args.indexOf(flag)+1],day=Number(get('--matchday'));
 assert(Number.isInteger(day)&&day>=1&&day<=38,'--matchday richiesto');
 const raw=get('--input');assert(raw,'--input richiesto');
 const parsed=parse(fs.readFileSync(path.resolve(root,raw),'utf8'));assert.equal(parsed.length,10);
 const original=read(`data/sources/probable-lineups-md${day}-2026-27.json`),identities=loadPlayerIdentities(root),fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===day),teams=read('data/normalized/teams.json');
 const quotations=read('data/sources/fantacalcio-quotations-2026-27.json').players;
 const unresolved=[],omittedNonRoster=[],output=[];
 for(const fixture of parsed){
  const metas=fixture.sides.map(t=>teams.find(m=>m.name===t.team));assert(metas.every(Boolean),'Squadra non canonica');
  const match=fixtures.find(m=>m.homeTeam===metas[0].id&&m.awayTeam===metas[1].id);assert(match,'Fixture non canonica');assert.equal(fixture.date.slice(0,10),match.date);
  fixture.sides.forEach((side,i)=>{
   const teamId=metas[i].id,prior=original.teams.find(t=>t.teamId===teamId);
   const resolve=p=>{
    const candidates=[...prior.players,...['ballots','unavailable','suspended','doubtful'].flatMap(key=>(prior[key]||[]).flat())];
    const previous=candidates.find(q=>q.playerId&&normalizePlayerName(q.sourceName)===normalizePlayerName(p.sourceName))||quotations.filter(q=>q.teamId===teamId&&q.playerId).map(q=>({...q,sourceName:q.name})).find(q=>normalizePlayerName(q.sourceName)===normalizePlayerName(p.sourceName));
    const alias=identities.resolve(teamId,p.sourceName),playerId=previous?.playerId||alias?.playerId||null;
    if(!playerId)unresolved.push({teamId,name:p.sourceName,kind:p.lineupStatus||'detail'});
    return {...p,team:side.team,teamId,sourceId:null,providerPlayerId:null,playerId,currentName:previous?.currentName||alias?.canonicalName||null,sourceRole:previous?.sourceRole||null,matchStatus:playerId?'verified-alias':'unmatched',associationMethod:previous?'exact-canonical-prior-label':alias?'verified-identity-alias':'unmatched-source-player'};
   };
   const players=side.players.map(resolve).filter(p=>{if(p.playerId||p.lineupStatus==='starter')return true;omittedNonRoster.push(p);return false;});
   assert.equal(players.filter(p=>p.lineupStatus==='starter').length,11);
   for(const key of ['ballots','unavailable','suspended','doubtful'])side[key]=side[key].map(p=>Array.isArray(p)?p.map(resolve):resolve(p));
   const starterIds=players.filter(p=>p.lineupStatus==='starter'&&p.playerId).map(p=>p.playerId);assert.equal(new Set(starterIds).size,starterIds.length);
   output.push({...side,players,teamId,matchId:match.id,status:'probable',updatedAt:new Date().toISOString()});
  });
 }
 const players=output.flatMap(t=>t.players),payload={schemaVersion:1,provider:'SOS Fanta',season:'2026/27',matchday:day,sourceUrl:'https://www.sosfanta.com/lista-formazioni/probabili-formazioni-serie-a/',rawSnapshot:raw.replaceAll('\\','/'),importedAt:new Date().toISOString(),interpretation:'Probabili editoriali; nessuna formazione ufficiale.',coverage:{teams:output.length,players:players.length,starters:players.filter(p=>p.lineupStatus==='starter').length,reserves:players.filter(p=>p.lineupStatus==='reserve').length,linkedPlayers:players.filter(p=>p.playerId).length,verifiedAliases:players.filter(p=>p.playerId).length,linkedListoneOnly:0,unmatched:players.filter(p=>!p.playerId).length,omittedNonRoster:omittedNonRoster.length},omittedNonRoster,teams:output};
 const diagnostics={coverage:payload.coverage,unresolved};console.log(JSON.stringify(diagnostics));
 if(!args.includes('--dry-run'))fs.writeFileSync(path.join(root,`data/sources/probable-lineups-md${day}-2026-27.json`),JSON.stringify(payload,null,2)+'\n');
}
module.exports={parse};if(require.main===module)main();

