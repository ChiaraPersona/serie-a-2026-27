'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Fixture-only official refresh; existing engines and admission rules remain unchanged.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const config={
  "id": "parma-bologna-2026-27-md-11",
  "label": "Parma - Bologna",
  "teams": [
    {
      "teamId": "parma",
      "team": "Parma",
      "formation": "3-5-2",
      "coach": "Alberto Gilardino",
      "ids": [
        "giovanni-daffara",
        "abdoulaye-ndiaye",
        "mariano-troilo",
        "enrico-del-prato",
        "emanuele-valeri",
        "mandela-keita",
        "vincent-sierro",
        "giovanni-fabbian",
        "benjamin-cremaschi",
        "jose-david-romero",
        "simone-lontani"
      ],
      "names": [
        "Daffara",
        "Ndiaye",
        "Troilo",
        "Delprato",
        "Valeri",
        "Keita",
        "Sierro",
        "Fabbian",
        "Cremaschi",
        "Romero",
        "Lontani"
      ],
      "numbers": [
        30,
        3,
        37,
        15,
        14,
        16,
        4,
        80,
        8,
        9,
        76
      ],
      "bench": [
        [
          "pontus-almqvist",
          11,
          "Almqvist P."
        ],
        [
          "sascha-britschgi",
          27,
          "Britschgi S."
        ],
        [
          "franco-carboni",
          29,
          "Carboni F."
        ],
        [
          "edoardo-corvi",
          40,
          "Corvi E."
        ],
        [
          "ousmane-diallo",
          7,
          "Diallo O."
        ],
        [
          "diego-carlos",
          34,
          "Diego Carlos"
        ],
        [
          "nesta-elphege",
          23,
          "Elphege N."
        ],
        [
          "matija-frigan",
          20,
          "Frigan M."
        ],
        [
          "ghidotti",
          22,
          "Ghidotti S."
        ],
        [
          "abdou-salam-konate",
          47,
          "Konate A."
        ],
        [
          "hans-nicolussi-caviglia",
          41,
          "Nicolussi Caviglia H."
        ],
        [
          "christian-ordonez",
          32,
          "Ordonez C."
        ],
        [
          "el-bilal-toure",
          19,
          "Toure E. B."
        ]
      ]
    },
    {
      "teamId": "bologna",
      "team": "Bologna",
      "formation": "3-4-3",
      "coach": "Raffaele Palladino",
      "ids": [
        "lukasz-skorupski",
        "matteo-darmian",
        "nicolo-casale",
        "arthur-theate",
        "nadir-zortea",
        "lewis-ferguson",
        "tommaso-pobega",
        "juan-miranda",
        "federico-bernardeschi",
        "jens-odgaard",
        "nicolo-cambiaghi"
      ],
      "names": [
        "Skorupski",
        "Darmian",
        "Casale",
        "Theate",
        "Zortea",
        "Ferguson",
        "Pobega",
        "Miranda",
        "Bernardeschi",
        "Odgaard",
        "Cambiaghi"
      ],
      "numbers": [
        1,
        36,
        16,
        3,
        20,
        19,
        4,
        33,
        10,
        21,
        28
      ],
      "bench": [
        [
          "rahim-alhassane",
          23,
          "Alhassane R."
        ],
        [
          "mikel-amondarain",
          8,
          "Amondarain M."
        ],
        [
          "artem-dovbyk",
          9,
          "Dovbyk A."
        ],
        [
          "oussama-el-azzouzi",
          17,
          "El Azzouzi O."
        ],
        [
          "eivind-helland",
          5,
          "Fause Helland E."
        ],
        [
          "ukko-happonen",
          72,
          "Happonen U."
        ],
        [
          "torbj-rn-heggem",
          14,
          "Heggem T."
        ],
        [
          "marco-libra",
          18,
          "Libra M."
        ],
        [
          "mbangula",
          11,
          "Mbangula S."
        ],
        [
          "nikola-moro",
          6,
          "Moro N."
        ],
        [
          "riccardo-orsolini",
          7,
          "Orsolini R."
        ],
        [
          "massimo-pessina",
          25,
          "Pessina M."
        ],
        [
          "roberto-piccoli",
          91,
          "Piccoli R."
        ],
        [
          "martin-vitik",
          41,
          "Vitik M."
        ]
      ]
    }
  ]
};
const id=config.id,dir='output/parma-bologna-md11-official';
const read=f=>storageReadJson(f);
const write=(f,d)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(d,null,2)+'\n');fs.renameSync(f+'.tmp',f)};
const run=(f,args=[],env={})=>execFileSync(process.execPath,['--experimental-require-module',f,...args],{stdio:'inherit',env:{...process.env,...env}});
fs.mkdirSync(dir,{recursive:true});
const files=['data/sources/official-lineups-2026-27.json','data/teams/index.json','data/normalized/predictions.json','data/normalized/schedina-md11.json','data/normalized/reading-md11-market-catalog.json','data/normalized/readings.json','data/sources/readings/'+id+'.json'];
const snapshot=dir+'/before.json';
assert(!fs.existsSync(snapshot)&&!fs.existsSync(snapshot+'.gz'),'Snapshot already exists; inspect before rerunning');
const before=Object.fromEntries(files.map(f=>[f,read(f)]));fs.writeFileSync(snapshot+'.gz',require('node:zlib').gzipSync(JSON.stringify(before),{level:9}));
const definitions=config.teams.map(t=>({...t,names:t.names}));
const now=new Date().toISOString(),matches=read('data/normalized/matches.json'),fixture=matches.find(m=>m.id===id);assert(fixture&&fixture.status==='scheduled');
const official=read(files[0]),directory=read(files[1]);
const entry={matchId:id,label:config.label,status:'official',matchday:11,date:fixture.date,kickoff:fixture.kickoff,provider:'user-provided',sourceUrl:null,retrievedAt:now,identityNotes:config.teams.flatMap(t=>[...t.bench.filter(p=>!p[0]),...t.ids.flatMap((pid,i)=>pid?[]:[[null,null,t.names[i]]])].map(p=>t.team+": "+p[2]+" unresolved canonical identity; retained without invented data")),teams:definitions.map(t=>{
 const roster=read('data/teams/'+t.teamId+'.json').squad;
 const player=(pid,name,number,i,starter)=>{const aliases=read('data/sources/player-identity-aliases-2026-27.json');const list=Array.isArray(aliases)?aliases:aliases.players||aliases.aliases||[];const p=pid?(roster.find(p=>p.id===pid)||list.find(p=>p.playerId===pid&&p.teamId===t.teamId)):null;if(pid)assert(p,pid);return {playerId:pid,currentName:p?.name||p?.canonicalName||name,sourceName:name||p?.name||p?.canonicalName,shirtNumber:number,lineupStatus:starter?'starter':'reserve',identityStatus:pid?'resolved-canonical':'unresolved-exact-source-name',...(starter?{positionIndex:i,role:i===0?'Portiere':p?.role}: {})}};
 return {teamId:t.teamId,team:t.team,coach:t.coach,formation:t.formation,benchCoverage:'explicit-user-provided',players:t.ids.map((pid,i)=>player(pid,t.names[i],t.numbers[i],i,true)),substitutes:t.bench.map(([pid,n,name],i)=>player(pid,name,n,i,false))};
})};
entry.rawSnapshots=['output/parma-bologna-md11-official/user-starters.png','output/parma-bologna-md11-official/user-bench.png']; entry.coachEvidence='Preserved existing canonical coaches; coaches not displayed in supplied screenshots';
 official.fixtures=official.fixtures.filter(f=>f.matchId!==id);official.fixtures.push(entry);write(files[0],official);
for(const t of entry.teams)directory.officialLineups[id+':'+t.teamId]={formation:t.formation,players:t.players.map(p=>p.currentName),substitutes:t.substitutes.map(p=>p.currentName),coach:t.coach,status:'official',matchId:id,matchday:11,updatedAt:now,source:{provider:entry.provider,url:null,retrievedAt:now}};
write(files[1],directory);
run('scripts/build-predictions.js',[],{SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'11',SERIE_A_PREDICTION_MATCH_ID:id,SERIE_A_PREDICTION_OUTPUT:dir+'/prediction.json'});
const candidate=read(dir+'/prediction.json');assert.equal(candidate.predictions.length,1);
const predictions=read(files[2]);predictions.predictions=predictions.predictions.map(p=>p.matchId===id?candidate.predictions[0]:p);write(files[2],predictions);
const {buildMd06MarketCatalog}=require('./md06-market-catalog');
const odds=read('data/normalized/odds/sisal/serie-a.json');
const catalog=buildMd06MarketCatalog({predictionsData:candidate,odds:{...odds,events:odds.events.filter(e=>e.canonicalMatchId===id)},matches:matches.filter(m=>m.id===id),schedinaSlips:[],probableLineups:read('data/sources/probable-lineups-md11-2026-27.json'),officialLineups:official,statisticalModels:read('data/analysis/serie-a-md11-statistical-models.json'),matchday:11});
run('scripts/apply-official-starter-policy.js');
const policy=require('../js/official-starter-policy');policy.configure(read('data/normalized/official-starter-registry.json'));
const schedina=read(files[3]),old=schedina.marketCatalog.matches.find(m=>m.matchId===id),fresh=catalog.matches.find(m=>m.matchId===id),byId=new Map(fresh.selections.map(l=>[l.selectionId,l]));
const candidateSelections=structuredClone(fresh.selections);
const archive=read('data/technical-archive/official-nonstarter-markets.json'),removed=[],recalculated=[];
fresh.selections=old.selections.flatMap(previous=>{
 if(!policy.eligible(previous,id)){removed.push(previous.selectionId);archive.push({...previous,archivedAt:now,archiveReason:'OFFICIAL_NONSTARTER'});return []}
 let next=byId.get(previous.selectionId);
 if(!next){
  // Existing unquoted model contracts use a canonical ID different from their provider variant.
  next=fresh.selections.find(l=>l.catalogOrigin===previous.catalogOrigin&&l.playerId===previous.playerId&&l.teamId===previous.teamId&&l.threshold===previous.threshold&&l.suggestionAnalysis?.family===previous.suggestionAnalysis?.family);
 }
 if(!next)return []; // No supported current model: eliminate without carrying a stale forecast.
 next=structuredClone(next);
 if(previous.forecastIdentity&&previous.betSelection?.evaluation?.probabilitySemantics==='INDIVIDUAL_PLAYER_V2'){
  const player=candidate.predictions[0].shooters.allPlayers.find(p=>p.playerId===previous.playerId);if(!player)return [];
  const key='over'+String(previous.threshold-.5)+'5',prob=(previous.suggestionAnalysis.family==='shots'?player.shotProbabilities:player.shotOnTargetProbabilities)?.[key];if(!Number.isFinite(prob))return [];
  const pct=Number((100*prob).toFixed(2));
  next={...next,...structuredClone(previous),lineupEligibility:next.lineupEligibility,forecastEvidence:next.forecastEvidence,individualModelProbabilityPct:pct,modelProbabilityPct:pct,fairOdds:Number((100/pct).toFixed(4))};
  next.betSelection.evaluation={...next.betSelection.evaluation,modelProbabilityPct:pct,fairOdds:next.fairOdds,individualReference:{...next.betSelection.evaluation.individualReference,modelProbabilityPct:pct,appliedToDuo:false}};
 }
 next.selectionId=previous.selectionId;
 // Quote and market contract retain their exact provider snapshot.
 next.betSelection.market=structuredClone(previous.betSelection.market);next.betSelection.quote=structuredClone(previous.betSelection.quote);next.odds=previous.odds;
 if(next.betSelection.identity)next.betSelection.identity=structuredClone(previous.betSelection.identity);
 delete next.isPreferred;next.isOutsider=next.betSelection.operational?.classification==='OUTSIDER';
 if(Number.isFinite(next.betSelection.evaluation?.modelProbabilityPct)&&next.betSelection.evaluation.modelProbabilityPct>0){next.fairOdds=Number((100/next.betSelection.evaluation.modelProbabilityPct).toFixed(4));next.betSelection.evaluation.fairOdds=next.fairOdds;}
 recalculated.push(next.selectionId);return [next];
});
// Only genuinely new, approved and verified provider contracts may replace exclusions.
const oldIds=new Set(old.selections.map(l=>l.selectionId));
const additions=candidateSelections.filter(l=>!oldIds.has(l.selectionId)&&l.suggestionAnalysis?.suggested&&policy.eligible(l,id)&&l.betSelection?.quote?.availability==='AVAILABLE_AT_SNAPSHOT'&&Number.isFinite(l.odds));
fresh.selections.push(...additions);
fresh.total=fresh.selections.length;fresh.suggestions=fresh.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);fresh.evaluated=fresh.selections.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;fresh.notModelled=fresh.total-fresh.evaluated;
fresh.suggestionSummary={total:fresh.suggestions.length,byFamily:fresh.selections.filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{})};
schedina.marketCatalog.matches=schedina.marketCatalog.matches.map(m=>m.matchId===id?fresh:m);
for(const [key,fn]of Object.entries({finalSelections:m=>m.total,evaluated:m=>m.evaluated,notModelled:m=>m.notModelled,suggestions:m=>m.suggestions.length}))schedina.marketCatalog.totals[key]=schedina.marketCatalog.matches.reduce((n,m)=>n+fn(m),0);
schedina.marketCatalog.totals.suggestionsByFamily=schedina.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{});
write(files[3],schedina);const shared=read(files[4]);shared.marketCatalog=schedina.marketCatalog;shared.generatedAt=now;write(files[4],shared);
// Reconstruct existing team model forecasts through their established publisher.
const published=require('./publish-md07-unquoted').build({matchday:11,targetMatchIds:[id]});
const publishedMatch=published.marketCatalog.matches.find(m=>m.matchId===id);
publishedMatch.selections=publishedMatch.selections.filter(l=>oldIds.has(l.selectionId)||additions.some(a=>a.selectionId===l.selectionId));
for(const leg of publishedMatch.selections){delete leg.isPreferred;const e=leg.betSelection?.evaluation;if(e?.modelProbabilityPct>0){e.fairOdds=Number((100/e.modelProbabilityPct).toFixed(4));leg.fairOdds=e.fairOdds;}}
published.marketCatalog.matches=published.marketCatalog.matches.map(m=>m.matchId===id?m:structuredClone(before[files[3]].marketCatalog.matches.find(x=>x.matchId===m.matchId)));
for(const m of published.marketCatalog.matches.filter(m=>m.matchId===id)){m.total=m.selections.length;m.suggestions=m.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);m.evaluated=m.selections.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;m.notModelled=m.total-m.evaluated;}
for(const [key,fn]of Object.entries({finalSelections:m=>m.total,evaluated:m=>m.evaluated,notModelled:m=>m.notModelled,suggestions:m=>m.suggestions.length}))published.marketCatalog.totals[key]=published.marketCatalog.matches.reduce((n,m)=>n+fn(m),0);
published.marketCatalog.totals.suggestionsByFamily=published.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).reduce((a,l)=>(a[l.suggestionAnalysis.family]=(a[l.suggestionAnalysis.family]||0)+1,a),{});
write(files[3],published);shared.marketCatalog=published.marketCatalog;write(files[4],shared);
write('data/technical-archive/official-nonstarter-markets.json',[...new Map(archive.map(l=>[l.selectionId,l])).values()]);
const source=read(files[6]),prediction=candidate.predictions[0];source.updatedAt='2026-11-07';source.summary=prediction.verdict.label+'. Formazioni ufficiali; 22 titolari acquisiti; identità non riconciliate N/D. Statistiche limitate alle gare concluse prima della MD11.';
source.sections.availability={content:'Undici ufficiali acquisiti. Le identità non riconciliate restano N/D; i non titolari sono esclusi dai mercati individuali operativi.',signals:entry.teams.map(t=>t.team+': 11 titolari; '+t.substitutes.length+' voci in panchina.'),sources:[]};
source.sections.tactics={content:prediction.scenarios[0].description,signals:entry.teams.map(t=>t.team+': '+t.formation+', formazione ufficiale.'),sources:[]};
source.sections.synthesis.content=prediction.verdict.label+'; confidenza '+prediction.confidence.value+'/100 ('+prediction.confidence.level+').';write(files[6],source);
run('scripts/build-readings.js',['--matchday','11']);
// Enforce fixture-only normalized reading updates even if metadata generation differs.
const readings=read(files[5]);write(files[5],before[files[5]].map(r=>r.matchId===id?readings.find(x=>x.matchId===id):r));
run('scripts/apply-official-starter-policy.js');
run('scripts/build-site.js',['--presentation-only','--reading-pages-only','--matchday','11']);
run('scripts/build-site.js',['--presentation-only','--betting-page-only','--matchday','11']);
assert.deepEqual(read(files[2]).predictions.filter(p=>p.matchId!==id),before[files[2]].predictions.filter(p=>p.matchId!==id));
assert.deepEqual(read(files[3]).marketCatalog.matches.filter(m=>m.matchId!==id),before[files[3]].marketCatalog.matches.filter(m=>m.matchId!==id));
assert(fresh.selections.every(l=>policy.eligible(l,id)));
write(dir+'/report.json',{matchId:id,officialStarters:22,resolvedStarters:entry.teams.flatMap(t=>t.players).filter(p=>p.playerId).length,removed,recalculated,additions:publishedMatch.selections.filter(l=>additions.some(a=>a.selectionId===l.selectionId)).map(l=>l.selectionId),suggestions:publishedMatch.suggestions.length,otherFixturesUnchanged:true,identityNotes:entry.identityNotes});
console.log('Official refresh complete; report: '+dir+'/report.json');
