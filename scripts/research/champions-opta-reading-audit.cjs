'use strict';
// Isolated retrospective direction audit. Does not turn Opta scores into Elo,
// probabilities, expected counts, selections or settlements.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const out='data/analysis/champions/opta-reading-audit-2026-11-18';
const inputs=['data/analysis/champions/opta-ranking-test-2026-11-18/comparison.json','data/normalized/champions-team-strength-2026-27.json','data/normalized/champions-league-2026-27.json','data/normalized/champions-md03-preliminary-2026-27.json',...Array.from({length:4},(_,i)=>`data/sources/champions-results-md0${i+1}-2026-27.json`)];
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const before=Object.fromEntries(inputs.map(p=>[p,hash(p)]));
const candidate=read(inputs[0]),old=read(inputs[1]),calendar=read(inputs[2]),preliminary=read(inputs[3]);
const ratings=new Map(candidate.teams.map(t=>[t.team,t]));
assert.equal(ratings.size,36);assert.equal(new Set(candidate.teams.map(t=>t.uefaTeamId)).size,36);
for(const t of calendar.teams)assert(ratings.has(t),`Missing canonical team ${t}`);
const esi=new Map(old.teams.map(t=>[t.team,t.europeanStrengthIndex]));
const outcome=(h,a)=>h>a?'1':h<a?'2':'X';
const direction=(h,a)=>Number.isFinite(h)&&Number.isFinite(a)&&h!==a?(h>a?'1':'2'):null;
const snapshots=new Map();let invalidChronology=0;
const snapdir='data/predictions/champions-event-snapshots/md03';
for(const file of fs.readdirSync(path.join(root,snapdir)).filter(f=>f.endsWith('.json'))){
 const p=snapdir+'/'+file,s=read(p),{contentHash,...content}=s;
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),contentHash,'Snapshot hash');
 if(s.chronologyStatus!=='VALID_PREMATCH_SNAPSHOT'||!(s.createdAt<s.kickoffAt)){invalidChronology++;continue;}
 const prev=snapshots.get(s.fixtureId);if(!prev||s.createdAt<prev.createdAt)snapshots.set(s.fixtureId,{...s,file:p});
}
const results=new Map(inputs.slice(4).flatMap(p=>read(p).fixtures.map(f=>[f.fixtureId,{...f,sourceFile:p}])));
const records=calendar.fixtures.filter(f=>f.status==='finished').map(f=>{
 const result=results.get(f.id);assert(result,'Missing archived result');
 assert.deepEqual(result.score,f.score,'Result/calendar score conflict');
 const h=ratings.get(f.homeTeam),a=ratings.get(f.awayTeam);
 const row={fixtureId:f.id,matchday:f.matchday,date:f.date,homeTeam:f.homeTeam,awayTeam:f.awayTeam,homeUefaId:h.uefaTeamId,awayUefaId:a.uefaTeamId,score:f.score,actual:outcome(f.score.home,f.score.away),optaDirection:direction(h.optaRating,a.optaRating),optaRatings:{home:h.optaRating,away:a.optaRating},previousIndexDirection:direction(esi.get(f.homeTeam),esi.get(f.awayTeam)),sourceFile:result.sourceFile,reading:null};
 const snap=snapshots.get(f.id);
 if(snap){
  assert.equal(snap.homeTeam,f.homeTeam);assert.equal(snap.awayTeam,f.awayTeam);
  assert.equal(snap.dataVersion.inputs[inputs[3]],before[inputs[3]],'Preliminary archive changed since capture');
  const forecast=preliminary.fixtures.find(x=>x.fixtureId===f.id)?.forecast;assert(forecast);
  const ps=forecast.probabilities;
  const baselineOutcome=['home','draw','away'].map((k,i)=>({k,v:ps[k],label:['1','X','2'][i]})).sort((a,b)=>b.v-a.v)[0].label;
  const home=snap.teamProjections.find(t=>t.venue==='home'),away=snap.teamProjections.find(t=>t.venue==='away');assert(home&&away);
  const rawPath=result.detailedReportSource?.rawPath;assert(rawPath,'Missing original match report');
  before[rawPath]=hash(rawPath);
  const raw=read(rawPath),payload=raw.payload||raw,comp=payload.header.competitions[0];
  assert(comp.status.type.completed);assert.equal(comp.date.slice(0,10),f.date);
  assert.equal(String(payload.header.id),new URL(result.detailedReportSource.url).searchParams.get('event'));
  const actualBoxes=['home','away'].map(side=>{
   const competitor=comp.competitors.find(c=>c.homeAway===side);assert(competitor);
   assert.equal(Number(competitor.score),f.score[side]);
   const box=payload.boxscore.teams.find(t=>String(t.team.id)===String(competitor.id));assert(box);
   return Object.fromEntries(box.statistics.map(s=>[s.name,Number(s.value??s.displayValue)]));
  });
  const metricSpec={goals:['expectedGoals',null],shots:['shotsTotal','shots'],sot:['shotsOnTarget','shotsOnTarget'],corners:['corners','corners']};
  const metrics={};
  for(const [name,[key,actualKey]]of Object.entries(metricSpec)){
   const pred=t=>name==='goals'?t[key]:t[key]?.central;
   const actual=name==='goals'?[f.score.home,f.score.away]:result.statistics?.[actualKey];
   if(!actual||!actual.every(Number.isFinite)||!Number.isFinite(pred(home))||!Number.isFinite(pred(away))){metrics[name]={status:'missing'};continue;}
   if(name!=='goals'){
    const rawKey={shots:'totalShots',sot:'shotsOnTarget',corners:'wonCorners'}[name];
    assert.deepEqual(actual,actualBoxes.map(b=>b[rawKey]),`Original report mismatch: ${f.id} ${name}`);
    assert(actual.every(v=>v>=0),'Negative observed count');
    if(actualBoxes.some(b=>['totalShots','shotsOnTarget','wonCorners','foulsCommitted'].every(k=>b[k]===0))){metrics[name]={status:'invalid-all-zero-statistical-template'};continue;}
   }
   metrics[name]={status:'available',actualDirection:outcome(...actual),baselineDirection:direction(pred(home),pred(away)),optaDirection:row.optaDirection,baselineValues:[pred(home),pred(away)],actualValues:actual};
  }
  row.reading={snapshot:snap.file,createdAt:snap.createdAt,kickoffAt:snap.kickoffAt,baselineOutcome,metrics};
 }
 return row;
});
// Strict direction accuracy: draws/equal counts remain misses for a side-only
// signal, never silently removed. Also show the decisive-target subset.
function paired(rows,baselineKey,candidateKey,actualKey){
 const included=rows.filter(r=>r[baselineKey]&&r[candidateKey]);
 const count=(r,k)=>Number(r[k]===r[actualKey]);
 let b=0,c=0,gained=0,lost=0,changed=0;
 for(const r of included){const x=count(r,baselineKey),y=count(r,candidateKey);b+=x;c+=y;gained+=Number(!x&&y);lost+=Number(x&&!y);changed+=Number(r[baselineKey]!==r[candidateKey]);}
 return {n:included.length,excluded:rows.length-included.length,baselineCorrect:b,candidateCorrect:c,baselinePct:included.length?100*b/included.length:null,candidatePct:included.length?100*c/included.length:null,deltaPp:included.length?100*(c-b)/included.length:null,changed,gained,lost,drawTargets:included.filter(r=>r[actualKey]==='X').length};
}
const summary={finishedFixtures:records.length,validFrozenFixtures:snapshots.size,invalidChronology,
 oldIndexVsOpta:paired(records,'previousIndexDirection','optaDirection','actual'),
 byMatchday:[1,2,3,4].map(matchday=>({matchday,...paired(records.filter(r=>r.matchday===matchday),'previousIndexDirection','optaDirection','actual')})),
 frozenReadingOutcome:paired(records.filter(r=>r.reading).map(r=>({...r,baseline:r.reading.baselineOutcome})),'baseline','optaDirection','actual'),metrics:{}};
assert.equal(records.length,72);assert.equal(records.filter(r=>r.reading).length,18);
for(const name of ['goals','shots','sot','corners']){
 const cases=records.filter(r=>r.reading?.metrics[name]?.status==='available').map(r=>({fixtureId:r.fixtureId,...r.reading.metrics[name]}));
 const valid=cases.filter(r=>r.baselineDirection&&r.optaDirection);
 let seed=20261118;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const samples=[];
 for(let k=0;k<2000&&valid.length;k++){let delta=0;for(let i=0;i<valid.length;i++){const r=valid[Math.floor(random()*valid.length)];delta+=Number(r.optaDirection===r.actualDirection)-Number(r.baselineDirection===r.actualDirection);}samples.push(100*delta/valid.length);}
 samples.sort((a,b)=>a-b);
 summary.metrics[name]={...paired(cases,'baselineDirection','optaDirection','actualDirection'),decisiveTargets:paired(cases.filter(r=>r.actualDirection!=='X'),'baselineDirection','optaDirection','actualDirection'),pairedFixtureBootstrap95DeltaPp:samples.length?[samples[Math.floor(.025*samples.length)],samples[Math.floor(.975*samples.length)]]:null,
 baselineMAE:cases.length?cases.reduce((n,r)=>n+r.baselineValues.reduce((s,v,i)=>s+Math.abs(v-r.actualValues[i]),0),0)/(2*cases.length):null,candidateMAE:null};
}
const limitations=['Opta snapshot is dated 2026-11-18, after all evaluated matches: look-ahead contamination; no predictive validation claim.','Direction-only sensitivity: stronger club is not an entire reading, and the candidate has no home advantage or draw model.','Old ESI is a descriptive index, not the actual 1X2 engine: keep index-vs-index separate from frozen reading comparison.','No arbitrary conversion from 0-100 Opta to Elo, probabilities, goals, volumes, DUO, EV or ROI.','MAE/Brier/log loss improvement of the candidate is unavailable without a calibrated integration and historical prematch Opta ratings.','Higher strength does not imply more fouls or cards; no directional proxy evaluated for discipline.','Snapshot integrity is local pre-kickoff capture, not independent external timestamp certification.'];
const report={protocol:{design:'retrospective-current-ranking-direction-only',candidateDate:candidate.asOf,primary:'MD3 earliest immutable prematch snapshots',bootstrap:'2000 paired fixture resamples; fixed seed; descriptive only, cannot remove time leakage',promotion:false},summary,limitations,inputs:before,records};
fs.mkdirSync(path.join(root,out),{recursive:true});
fs.writeFileSync(path.join(root,out,'results.json'),JSON.stringify(report,null,2)+'\n');
const fmt=v=>v==null?'N/D':v.toFixed(1);
const lines=['# Audit retrospettivo ranking Opta e Letture Champions','','## Esito interpretabile','','Confronto di direzione, non rigenerazione delle Letture e non backtest predittivo. Rating Opta del 18 novembre successivo alle 72 gare analizzate.','','## Letture congelate prima della MD3','','| Aspetto | Campione appaiato | Lettura corretta | Segnale Opta corretto | Delta punti % | IC bootstrap 95% |','|---|---:|---:|---:|---:|---|'];
const o=summary.frozenReadingOutcome;lines.push(`| Esito prevalente 1X2 | ${o.n} | ${o.baselineCorrect} (${fmt(o.baselinePct)}%) | ${o.candidateCorrect} (${fmt(o.candidatePct)}%) | ${fmt(o.deltaPp)} | N/D |`);
for(const [k,v]of Object.entries(summary.metrics))lines.push(`| Direzione ${k} | ${v.n} | ${v.baselineCorrect} (${fmt(v.baselinePct)}%) | ${v.candidateCorrect} (${fmt(v.candidatePct)}%) | ${fmt(v.deltaPp)} | ${v.pairedFixtureBootstrap95DeltaPp?.map(fmt).join(' / ')||'N/D'} |`);
lines.push('','Pareggi nei risultati e nei conteggi restano nel denominatore. Parità nei rating o nelle proiezioni sono astensioni ed escluse simmetricamente; dettagli nel JSON. Una direzione corretta non misura accuratezza del numero previsto.','','## Confronto separato dei due indici sulle quattro giornate','','| Giornata | Confrontabili | Vecchio indice corretto | Opta corretto | Cambi utili | Cambi dannosi |','|---|---:|---:|---:|---:|---:|');
for(const v of [...summary.byMatchday,{matchday:'Totale',...summary.oldIndexVsOpta}])lines.push(`| ${v.matchday} | ${v.n} | ${v.baselineCorrect} | ${v.candidateCorrect} | ${v.gained} | ${v.lost} |`);
lines.push('','## Gare in cui cambia la direzione rispetto alla Lettura congelata','','| Gara | Esito reale | Lettura | Opta |','|---|---|---|---|');
for(const r of records.filter(r=>r.reading&&r.optaDirection&&r.optaDirection!==r.reading.baselineOutcome))lines.push(`| ${r.homeTeam} - ${r.awayTeam} | ${r.score.home}-${r.score.away} | ${r.reading.baselineOutcome} | ${r.optaDirection} |`);
lines.push('','## Limiti','',...limitations.map(s=>'- '+s),'','Nessun file operativo, formula, quota o selezione modificato. Input e snapshot verificati con SHA-256.');
fs.writeFileSync(path.join(root,out,'REPORT.md'),lines.join('\n')+'\n');
for(const [p,h]of Object.entries(before))assert.equal(hash(p),h,`Protected input changed: ${p}`);
console.log(JSON.stringify(summary,null,2));
