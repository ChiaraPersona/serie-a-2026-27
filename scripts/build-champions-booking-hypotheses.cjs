'use strict';
// Reuse the existing comparative ranking. Reference XIs never become probable
// lineups, calibrated probabilities or operational betting selections.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {bookingCandidates,ENGINE_VERSION}=require('./predictions/engine.js');
const {eligible}=require('./champions/shared-scenario.cjs');
const {canonicalTeam}=require('./champions/current-season-offline.js');
const root=path.resolve(__dirname,'..');
const paths={calendar:'data/normalized/champions-league-2026-27.json',squads:'data/normalized/champions-registered-squads-2026-27.json',references:'data/generated/champions-lineup-references.json'};
const roles={goalkeeper:'Portiere',defender:'Difensore',midfielder:'Centrocampista',forward:'Attaccante'};
function generate({calendar,squads,references,officialLineups,asOf,matchday,fixtureIds=null}){
 const fixtures=calendar.fixtures.filter(f=>eligible(f,asOf)&&f.matchday===matchday&&(!fixtureIds||fixtureIds.includes(f.id))).map(f=>{
  const teams=[f.homeTeam,f.awayTeam].map(name=>squads.teams.find(t=>t.team===name));
  const official=teams.map(t=>officialLineups?.teams?.find(r=>t&&r.fixtureId===f.id&&r.status==='official'&&canonicalTeam(r.teamId)===canonicalTeam(t.id)&&(r.lineupEvidence?.consultedAt||officialLineups.source?.consultedAt||'9999')<=asOf));
  const officialFixture=official.every(t=>t?.starters?.length===11);
  const lineups=officialFixture?official.map(t=>({fixtureId:f.id,date:f.date,status:'official',formation:t.formation,players:t.starters.map(p=>({id:p.playerId}))})):teams.map(t=>(references.records||[]).filter(r=>t&&canonicalTeam(r.teamId)===canonicalTeam(t.id)&&r.fixtureId!==f.id&&r.date<f.date&&r.date<asOf.slice(0,10)&&r.players.length===11).sort((a,b)=>b.date.localeCompare(a.date)||Number(b.status==='official')-Number(a.status==='official'))[0]);
  const prepared=teams.map((t,i)=>{
   if(!t||!lineups[i])return null;
   const players=lineups[i].players.map(p=>t.players.find(q=>q.id===p.id));
   if(players.some(p=>!p||!roles[p.position])||new Set(players.map(p=>p.id)).size!==11)return null;
   // Exact canonical ID joins above; identical full names inside this isolated
   // XI ensure the shared engine's name resolver never needs fuzzy fallbacks.
   if(new Set(players.map(p=>p.name)).size!==11)return null;
   return {team:{id:t.id,probableLineup:{formation:lineups[i].formation,players:players.map(p=>p.name)}},squad:{players:players.map(p=>({...p,role:roles[p.position]}))}};
  });
  const candidates=prepared.every(Boolean)?bookingCandidates(prepared[0].team,prepared[1].team,prepared[0].squad,prepared[1].squad,null,null,null,null,null,null,null,null):[];
  const refereeName=officialFixture?f.refereeAssignment?.referee?.name:null;
  const likelyBooked=candidates.filter(p=>p.playerId&&Number.isFinite(p.riskScore)).map(p=>({...p,team:teams.find(t=>t.id===p.teamId)?.team,calibratedProbability:null,firstBookedProbability:null,possibleFirstBooked:false,firstBookedHeuristic:false,lineupStatus:officialFixture?'official':'reference',operationalSelection:false,...(refereeName?{refereeFactorSource:'DESIGNATED_REFEREE_NOT_MODEL_ELIGIBLE',refereeEvidence:['Arbitro designato; contesto arbitrale non validato per il modello: fattore neutro'],evidence:p.evidence.filter(e=>!e.startsWith('arbitro N/D')).concat('Arbitro designato; fattore neutro')}: {})}));
  return {fixtureId:f.id,matchday:f.matchday,date:f.date,status:likelyBooked.length?(officialFixture?'OFFICIAL_LINEUP_HYPOTHESIS':'REFERENCE_LINEUP_HYPOTHESIS'):'INSUFFICIENT_DATA',likelyBooked,...(officialFixture?{refereeName,refereeApplied:false}:{}),lineupReferences:lineups.map((r,i)=>({teamId:teams[i]?.id??null,fixtureId:r?.fixtureId??null,date:r?.date??null,status:r?.status??null})),limitations:[officialFixture?'Undici ufficiali; minuti effettivi non certi.':'Ultimi undici di riferimento: titolarità, disponibilità e minuti per questa gara da riconfermare.','Indice comparativo non calibrato, non probabilità di ammonizione.','Contesto arbitrale e disciplinare non validato per il modello: fattori neutri e fallback esistenti.'],engineVersion:ENGINE_VERSION};
 });
 return {schemaVersion:1,competition:'champions',matchday,generatedAt:asOf,policy:'PRELIMINARY_REFERENCE_ONLY_NO_OPERATIONAL_SELECTIONS',fixtures};
}
function build({asOf=new Date().toISOString(),matchday=null,fixtureIds=null}={}){
 const input=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))]));
 const next=Math.min(...input.calendar.fixtures.filter(f=>eligible(f,asOf)).map(f=>f.matchday));
 const day=matchday??next;if(!Number.isInteger(day)||day<1||day>8)throw Error('Giornata Champions non valida');
 const officialPath=`data/sources/champions-official-formations-md${String(day).padStart(2,'0')}-2026-27.json`;
 const officialLineups=fs.existsSync(path.join(root,officialPath))?JSON.parse(fs.readFileSync(path.join(root,officialPath),'utf8')):null;
 const output=generate({...input,officialLineups,asOf,matchday:day,fixtureIds});
 if(fixtureIds){
  if(output.fixtures.length!==new Set(fixtureIds).size)throw Error('Refuse missing, foreign or started booking fixture');
  const previous=JSON.parse(fs.readFileSync(path.join(root,'data/generated/champions-booking-hypotheses.json'),'utf8'));
  if(previous.matchday!==day)throw Error('Scoped booking refresh requires same matchday');
  output.fixtures=previous.fixtures.map(f=>output.fixtures.find(n=>n.fixtureId===f.fixtureId)||f);
 }
 output.inputs=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')}]));
 if(officialLineups)output.inputs.officialLineups={path:officialPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,officialPath))).digest('hex')};
 output.policy='PRELIMINARY_COMPARATIVE_ONLY_NO_OPERATIONAL_SELECTIONS';
 fs.writeFileSync(path.join(root,'data/generated/champions-booking-hypotheses.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`Ipotesi ammoniti Champions MD${day}: ${output.fixtures.length} gare, ${output.fixtures.reduce((n,f)=>n+f.likelyBooked.length,0)} candidati comparativi`);return output;
}
if(require.main===module){const i=process.argv.indexOf('--matchday');build({matchday:i<0?null:Number(process.argv[i+1])});}
module.exports={build,generate};
