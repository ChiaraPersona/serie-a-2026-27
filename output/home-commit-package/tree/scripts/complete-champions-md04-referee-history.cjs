'use strict';
// Descriptive history only; forecasts and provider contracts are never written.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {recentRows,seasons,arrayField,profilePayload}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
async function build(){
 const profiles=read('data/normalized/champions-referee-profiles-md04-2026-27.json');
 const calendar=read('data/normalized/champions-league-2026-27.json').fixtures;
 const generated=read('data/generated/reading-referee-history.json');
 const directory='data/raw/champions-referees/md04-2026-11-04';fs.mkdirSync(directory,{recursive:true});
 const entries=[],records=[];
 for(const profile of profiles.fixtures){
  const fixture=calendar.find(f=>f.id===profile.fixtureId);
  assert.equal(profile.name,fixture.refereeAssignment.referee.name);
  assert.equal(profile.refereeId,fixture.refereeAssignment.refereeId||null);
  let source={...profile.source},html;
  if(fixture.status==='scheduled'){
   const file=`${directory}/${source.providerRefereeId||source.url.match(/referees\/(\d+)/)[1]}.html.gz`;
   if(!fs.existsSync(file)){
    const response=await fetch(source.url,{signal:AbortSignal.timeout(25000)});assert(response.ok,`HTTP ${response.status}`);
    fs.writeFileSync(file,zlib.gzipSync(await response.text()));
   }
   html=zlib.gunzipSync(fs.readFileSync(file)).toString();
   const old=zlib.gunzipSync(fs.readFileSync(source.file)).toString();
   const title=h=>h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().replace(/ (referee stats|stats &amp; recent matches)$/,'');
   assert(title(html)&&title(html)===title(old),profile.name+': Profile identity changed: '+title(html)+' / '+title(old));
   source={...source,file,retrievedAt:fs.statSync(file).mtime.toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex')};
  }else{
   html=zlib.gunzipSync(fs.readFileSync(source.file)).toString();
   assert.equal(crypto.createHash('sha256').update(html).digest('hex'),source.sha256||source.rawSha256);
  }
  const all=recentRows(html,fixture.date+'T00:00:00Z');
  const scores=new Map(arrayField(profilePayload(html),'recentMatches').map(r=>[String(r.id),{home:Number.isInteger(r.homeGoals)?r.homeGoals:null,away:Number.isInteger(r.awayGoals)?r.awayGoals:null}]));
  assert(all.length>=5,profile.name+': fewer than five dated matches');
  const rows=all.map(r=>({id:r.id,date:r.date.slice(0,10),competition:r.competition,home:r.home,away:r.away,
   score:scores.get(r.id),yellowCards:r.yellowCards,dismissals:r.redCards,fouls:r.fouls,
   totalCards:Number.isInteger(r.yellowCards)&&Number.isInteger(r.redCards)?r.yellowCards+r.redCards:null,
   secondYellowCards:null,directRedCards:null,penaltiesAwarded:r.penalties,source:{...source,url:r.url}}));
  const samples=seasons(html),current=samples.filter(s=>['2026/2027','2026/27'].includes(s.season)&&s.competitionId===2);
  const seasonal={};
  for(const [key,field] of [['yellowCards','yellowCards'],['dismissals','redCards'],['fouls','fouls'],['totalCards',null]]){
   const valid=current.filter(s=>field?s.metrics[field]?.total!==null:s.metrics.yellowCards.total!==null&&s.metrics.redCards.total!==null);
   const n=valid.reduce((n,s)=>n+s.matches,0),total=valid.reduce((n,s)=>n+(field?s.metrics[field].total:s.metrics.yellowCards.total+s.metrics.redCards.total),0);
   seasonal[key]={n,average:n?total/n:null};
  }
  // Aggregates remain explicitly descriptive; no certification or model activation.
  const recent={},percentDifference={};
  for(const key of ['yellowCards','dismissals','fouls','totalCards']){
   const available=rows.slice(0,5).filter(r=>Number.isFinite(r[key]));
   recent[key]={n:available.length,average:available.length?available.reduce((n,r)=>n+r[key],0)/available.length:null};
   percentDifference[key]=null; // Different competition scopes must not be compared.
  }
  entries.push({fixtureId:fixture.id,competition:'champions',cutoffDate:fixture.date,refereeId:profile.refereeId,refereeName:profile.name,
   historyNote:'Ultime cinque gare disponibili, tutte le competizioni; storico parziale. Medie stagionali: solo Champions League. Rossi diretti e seconde ammonizioni non separabili. Dati descrittivi esclusi dai pronostici.',
   rows:rows.slice(0,5),summary:require('./build-reading-referee-history.js').summary(rows.slice(0,5)),analysis:{seasonLabel:'2026/27 · solo Champions League · campione descrittivo parziale',seasonal,recent,percentDifference,trend:'Ultime cinque disponibili, tutte le competizioni. Campione stagionale Champions separato; confronto percentuale N/D.'}});
  records.push({fixtureId:fixture.id,refereeId:profile.refereeId,name:profile.name,source,rows,seasonCompetitionSamples:samples,aggregateCutoffCertified:false,predictionEligible:false});
 }
 const replacements=new Map(entries.map(e=>[e.fixtureId,e]));
 generated.fixtures=generated.fixtures.map(e=>replacements.get(e.fixtureId)||e);
 for(const entry of entries)if(!generated.fixtures.some(e=>e.fixtureId===entry.fixtureId))generated.fixtures.push(entry);
 fs.writeFileSync('data/normalized/champions-referee-match-history-md04-2026-27.json',JSON.stringify({schemaVersion:1,informationalOnly:true,fixtures:records,presentation:entries},null,2)+'\n');
 fs.writeFileSync('data/generated/reading-referee-history.json',JSON.stringify(generated,null,2)+'\n');
 console.log(JSON.stringify({fixtures:entries.length,withFive:entries.filter(e=>e.rows.length===5).length,datedMatches:records.reduce((n,r)=>n+r.rows.length,0),currentChampionsSamples:entries.filter(e=>e.analysis.seasonal.yellowCards.n>0).length}));
}
module.exports={build};if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
