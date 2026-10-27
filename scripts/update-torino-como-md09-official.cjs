'use strict';
// Fixture-only official refresh; existing engines and admission rules remain unchanged.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const config={
  "id": "torino-como-2026-27-md-09",
  "label": "Torino - Como",
  "teams": [
    {
      "teamId": "torino",
      "team": "Torino",
      "formation": "3-5-2",
      "coach": "Ignazio Abate",
      "ids": [
        "lucas-perri",
        "saul-coco",
        "adrian-ismajli",
        "pietro-comuzzo",
        "rafik-belghali",
        "nikola-vlasic",
        "braganca",
        "kian-fitz-jim",
        "alessio-cacciamani",
        "che-adams",
        "giovanni-simeone"
      ],
      "bench": [
        [
          "diego-mascardi",
          null,
          "Mascardi"
        ],
        [
          "lapo-siviero",
          null,
          "Siviero"
        ],
        [
          "patterson",
          null,
          "Patterson"
        ],
        [
          "cristiano-biraghi",
          null,
          "Biraghi"
        ],
        [
          "eray-comert",
          null,
          "Cömert"
        ],
        [
          "emirhan-ilkhan",
          null,
          "Ilkhan"
        ],
        [
          "zakaria-aboukhlal",
          null,
          "Aboukhlal"
        ],
        [
          null,
          null,
          "Pellegri"
        ],
        [
          "gaetano-oristanio",
          null,
          "Oristanio"
        ],
        [
          "sandro-kulenovic",
          null,
          "Kulenovic"
        ],
        [
          "cesare-casadei",
          null,
          "Casadei"
        ],
        [
          "gvidas-gineitis",
          null,
          "Gineitis"
        ],
        [
          "duvan-zapata",
          null,
          "Zapata"
        ]
      ],
      "numbers": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "teamId": "como",
      "team": "Como",
      "formation": "4-2-3-1",
      "coach": "Cesc Fàbregas",
      "ids": [
        "sanchez-ro",
        "yan-couto",
        "marc-oliver-kempf",
        "jacobo-ramon",
        "alex-valle",
        "maximo-perrone",
        "luis-milla",
        "maxence-caqueret",
        "nico-paz",
        "lucas-da-cunha",
        "anastasios-douvikas"
      ],
      "bench": [
        [
          "jean-butez",
          null,
          "Butez"
        ],
        [
          "mauro-vigorito",
          null,
          "Vigorito"
        ],
        [
          "alberto-dossena",
          null,
          "Dossena"
        ],
        [
          "adrian-lahdo",
          null,
          "Lahdo"
        ],
        [
          "kaiki",
          null,
          "Kaiki"
        ],
        [
          "edoardo-goldaniga",
          null,
          "Goldaniga"
        ],
        [
          "martin-baturina",
          null,
          "Baturina"
        ],
        [
          "samuele-ricci",
          null,
          "Ricci"
        ],
        [
          "ivan-smolcic",
          null,
          "Smolcic"
        ],
        [
          "jayden-addai",
          null,
          "Addai"
        ],
        [
          "willy-kambwala",
          null,
          "Kambwala"
        ],
        [
          null,
          null,
          "Papaccioli"
        ]
      ],
      "numbers": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    }
  ]
};
const id=config.id,dir='output/torino-como-md09-official';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const write=(f,d)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(d,null,2)+'\n');fs.renameSync(f+'.tmp',f)};
const run=(f,args=[],env={})=>execFileSync(process.execPath,['--experimental-require-module',f,...args],{stdio:'inherit',env:{...process.env,...env}});
fs.mkdirSync(dir,{recursive:true});
const files=['data/sources/official-lineups-2026-27.json','data/teams/index.json','data/normalized/predictions.json','data/normalized/schedina-md09.json','data/normalized/reading-md09-market-catalog.json','data/normalized/readings.json','data/sources/readings/'+id+'.json'];
const snapshot=dir+'/before.json';
assert(!fs.existsSync(snapshot),'Snapshot already exists; inspect before rerunning');
const before=Object.fromEntries(files.map(f=>[f,read(f)]));write(snapshot,before);
const definitions=config.teams.map(t=>({...t,names:t.ids.map(id=>id)}));
const now=new Date().toISOString(),matches=read('data/normalized/matches.json'),fixture=matches.find(m=>m.id===id);assert(fixture&&fixture.status==='scheduled');
const official=read(files[0]),directory=read(files[1]);
const entry={matchId:id,label:config.label,status:'official',matchday:9,date:'2026-10-27',kickoff:'20:45',provider:'user-provided',sourceUrl:null,retrievedAt:now,identityNotes:config.teams.flatMap(t=>t.bench.filter(p=>!p[0]).map(p=>t.team+": "+p[2]+" unresolved canonical identity; retained without invented data")),teams:definitions.map(t=>{
 const roster=read('data/teams/'+t.teamId+'.json').squad;
 const player=(pid,name,number,i,starter)=>{const aliases=read('data/sources/player-identity-aliases-2026-27.json');const list=Array.isArray(aliases)?aliases:aliases.players||aliases.aliases||[];const p=pid?(roster.find(p=>p.id===pid)||list.find(p=>p.playerId===pid&&p.teamId===t.teamId)):null;if(pid)assert(p,pid);return {playerId:pid,currentName:p?.name||p?.canonicalName||name,sourceName:p?.name||p?.canonicalName||name,shirtNumber:number,lineupStatus:starter?'starter':'reserve',identityStatus:pid?'resolved-canonical':'unresolved-exact-source-name',...(starter?{positionIndex:i,role:i===0?'Portiere':p?.role}: {})}};
 return {teamId:t.teamId,team:t.team,coach:t.coach,formation:t.formation,benchCoverage:'provided-with-identity-limits',players:t.ids.map((pid,i)=>player(pid,t.names[i],t.numbers[i],i,true)),substitutes:t.bench.map(([pid,n,name],i)=>player(pid,name,n,i,false))};
})};
official.fixtures=official.fixtures.filter(f=>f.matchId!==id);official.fixtures.push(entry);write(files[0],official);
for(const t of entry.teams)directory.officialLineups[id+':'+t.teamId]={formation:t.formation,players:t.players.map(p=>p.currentName),substitutes:t.substitutes.map(p=>p.currentName),coach:t.coach,status:'official',matchId:id,matchday:9,updatedAt:now,source:{provider:entry.provider,url:null,retrievedAt:now}};
write(files[1],directory);
run('scripts/build-predictions.js',[],{SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'9',SERIE_A_PREDICTION_MATCH_ID:id,SERIE_A_PREDICTION_OUTPUT:dir+'/prediction.json'});
const candidate=read(dir+'/prediction.json');assert.equal(candidate.predictions.length,1);
const predictions=read(files[2]);predictions.predictions=predictions.predictions.map(p=>p.matchId===id?candidate.predictions[0]:p);write(files[2],predictions);
const {buildMd06MarketCatalog}=require('./md06-market-catalog');
const odds=read('data/normalized/odds/sisal/serie-a.json');
const catalog=buildMd06MarketCatalog({predictionsData:candidate,odds:{...odds,events:odds.events.filter(e=>e.canonicalMatchId===id)},matches:matches.filter(m=>m.id===id),schedinaSlips:[],probableLineups:read('data/sources/probable-lineups-md9-2026-27.json'),officialLineups:official,statisticalModels:read('data/analysis/serie-a-md09-statistical-models.json'),matchday:9});
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
const published=require('./publish-md07-unquoted').build({matchday:9,targetMatchIds:[id]});
const publishedMatch=published.marketCatalog.matches.find(m=>m.matchId===id);
publishedMatch.selections=publishedMatch.selections.filter(l=>oldIds.has(l.selectionId)||additions.some(a=>a.selectionId===l.selectionId));
for(const leg of publishedMatch.selections){delete leg.isPreferred;const e=leg.betSelection?.evaluation;if(e?.modelProbabilityPct>0){e.fairOdds=Number((100/e.modelProbabilityPct).toFixed(4));leg.fairOdds=e.fairOdds;}}
for(const m of published.marketCatalog.matches){m.total=m.selections.length;m.suggestions=m.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);m.evaluated=m.selections.filter(l=>Number.isFinite(l.betSelection?.evaluation?.modelProbabilityPct)).length;m.notModelled=m.total-m.evaluated;}
for(const [key,fn]of Object.entries({finalSelections:m=>m.total,evaluated:m=>m.evaluated,notModelled:m=>m.notModelled,suggestions:m=>m.suggestions.length}))published.marketCatalog.totals[key]=published.marketCatalog.matches.reduce((n,m)=>n+fn(m),0);
write(files[3],published);shared.marketCatalog=published.marketCatalog;write(files[4],shared);
write('data/technical-archive/official-nonstarter-markets.json',[...new Map(archive.map(l=>[l.selectionId,l])).values()]);
const source=read(files[6]),prediction=candidate.predictions[0];source.updatedAt='2026-10-27';source.summary=prediction.verdict.label+'. Formazioni ufficiali; identità non riconciliate N/D. Statistiche limitate alle gare concluse prima della MD9.';
source.sections.availability={content:'Undici ufficiali acquisiti. Le identità non riconciliate restano N/D; i non titolari sono esclusi dai mercati individuali operativi.',signals:entry.teams.map(t=>t.team+': 11 titolari; '+t.substitutes.length+' voci in panchina.'),sources:[]};
source.sections.tactics={content:prediction.scenarios[0].description,signals:entry.teams.map(t=>t.team+': '+t.formation+', formazione ufficiale.'),sources:[]};
source.sections.synthesis.content=prediction.verdict.label+'; confidenza '+prediction.confidence.value+'/100 ('+prediction.confidence.level+').';write(files[6],source);
run('scripts/build-readings.js',['--matchday','9']);
// Enforce fixture-only normalized reading updates even if metadata generation differs.
const readings=read(files[5]);write(files[5],before[files[5]].map(r=>r.matchId===id?readings.find(x=>x.matchId===id):r));
run('scripts/apply-official-starter-policy.js');
run('scripts/build-site.js',['--presentation-only','--reading-pages-only','--matchday','9']);
run('scripts/build-site.js',['--presentation-only','--betting-page-only','--matchday','9']);
assert.deepEqual(read(files[2]).predictions.filter(p=>p.matchId!==id),before[files[2]].predictions.filter(p=>p.matchId!==id));
assert.deepEqual(read(files[3]).marketCatalog.matches.filter(m=>m.matchId!==id),before[files[3]].marketCatalog.matches.filter(m=>m.matchId!==id));
assert(fresh.selections.every(l=>policy.eligible(l,id)));
write(dir+'/report.json',{matchId:id,officialStarters:22,resolvedStarters:entry.teams.flatMap(t=>t.players).filter(p=>p.playerId).length,removed,recalculated,additions:publishedMatch.selections.filter(l=>additions.some(a=>a.selectionId===l.selectionId)).map(l=>l.selectionId),suggestions:publishedMatch.suggestions.length,otherFixturesUnchanged:true,identityNotes:entry.identityNotes});
console.log('Official refresh complete; report: '+dir+'/report.json');
