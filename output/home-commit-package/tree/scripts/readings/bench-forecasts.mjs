import minutesModel from '../champions/substitute-minutes.js';
import volumeModel from '../champions/player-volume-utils.js';
import {benchContext} from '../../js/pages/reading-detail/bench-contract.mjs';
import {individualPlayers} from '../../js/pages/reading-detail/evidence.mjs';
const finite=Number.isFinite;
const round=(n,d=4)=>Number(n.toFixed(d));
const roleKey=p=>p?.roleKey||p?.position||(['goalkeeper','defender','midfielder','forward'].includes(p?.role)?p.role:null)||({Portiere:'goalkeeper',Difensore:'defender',Centrocampista:'midfielder',Attaccante:'forward'}[p?.role])||null;

// Protect every existing starter value. Allocate only the *remaining* exposure/volume.
// This is the existing Champions proportional budget constraint, restricted to the bench.
export function allocateBenchSide(rows,starters,projection){
 const audit={minuteBudget:null,minuteFactor:null,shotsBudget:null,sotBudget:null,reason:null};
 const outfield=starters.filter(p=>roleKey(p.source)!=='goalkeeper'&&p.role!=='Portiere');
 const goalkeepers=starters.filter(p=>!outfield.includes(p));
 if(starters.length!==11||goalkeepers.length!==1||outfield.length!==10||!starters.every(p=>finite(p.source.expectedMinutes))){audit.reason='incomplete-starter-minute-budget';return audit;}
 const remaining=Math.max(0,900-outfield.reduce((s,p)=>s+p.source.expectedMinutes,0));
 audit.minuteBudget=round(remaining);
 const eligible=rows.filter(p=>p.roleKey!=='goalkeeper'&&p.minutesEstimate?.status==='evaluable');
 const expectedEntries=eligible.reduce((s,p)=>s+p.minutesEstimate.entryProbability,0);
 // UEFA 2026/27 art. 56.02, regulation time. Fail closed rather than change frequencies.
 if(expectedEntries>5){audit.reason='bench-entry-frequencies-exceed-five-substitutions';return audit;}
 const rawTotal=eligible.reduce((s,p)=>s+p.minutesEstimate.entryProbability*p.minutesEstimate.conditionalMinutesIfUsed,0);
 const factor=rawTotal>remaining?remaining/rawTotal:1;
 audit.minuteFactor=round(factor,8);
 for(const p of rows){
  if(p.minutesEstimate?.status!=='evaluable')continue;
  if(p.roleKey==='goalkeeper'){p.reasons.push('goalkeeper-substitution-not-modelled');continue;}
  if(!(remaining>0)){p.reasons.push('no-unallocated-starter-minutes');continue;}
  p.entryProbability=p.minutesEstimate.entryProbability;
  // Scale exposure, as the existing model does; keep conditional and average coherent.
  p.conditionalMinutesIfUsed=round(p.minutesEstimate.conditionalMinutesIfUsed*factor);
  p.expectedMinutes=round(p.entryProbability*p.conditionalMinutesIfUsed);
  p.minutesBudgetFactor=audit.minuteFactor;
 }
 if(!outfield.every(p=>finite(p.source.projectedShots)&&finite(p.source.projectedShotsOnTarget))||!finite(projection?.shotsTotal?.central)||!finite(projection?.shotsOnTarget?.central)){
  audit.reason='incomplete-starter-volume-budget';return audit;
 }
 const shotsRemaining=projection.shotsTotal.central-outfield.reduce((s,p)=>s+p.source.projectedShots,0);
 const sotRemaining=projection.shotsOnTarget.central-outfield.reduce((s,p)=>s+p.source.projectedShotsOnTarget,0);
 audit.shotsBudget=round(shotsRemaining);audit.sotBudget=round(sotRemaining);
 // Rounding residuals are not new forecast capacity (10 player rows rounded to 0.01).
 if(shotsRemaining<=0.05||sotRemaining<=0.05){audit.reason='team-volume-already-allocated-to-starters';return audit;}
 const candidates=rows.filter(p=>finite(p.expectedMinutes)&&p.expectedMinutes>0&&p.per90);
 if(!candidates.length){audit.reason='no-bench-player-with-minutes-and-observed-rates';return audit;}
 const scaled=key=>{
  const items=volumeModel.scaleShotProjections(candidates,key,key==='shots'?shotsRemaining:sotRemaining);
  const target=key==='shots'?shotsRemaining:sotRemaining;
  const total=items.reduce((s,r)=>s+r.projection,0);
  return total>target?minutesModel.conserveTeamVolume(items,target):items;
 };
 const shots=scaled('shots'),sot=scaled('shotsOnTarget');
 for(const p of candidates){
  p.projectedShots=shots.find(r=>r.player===p)?.projection??null;
  const value=sot.find(r=>r.player===p)?.projection;
  p.projectedShotsOnTarget=finite(value)&&finite(p.projectedShots)?Math.min(value,p.projectedShots):null;
 }
 return audit;
}

export function buildBenchFixture({model,evidence},stats,evidenceByPlayer,kickoffAt){
 const snapshot=JSON.stringify({model,evidence});
 const players=individualPlayers(model,evidence),rows=[],budgets=[];
 for(const l of evidence.lineups){
  const teamStats=stats.teams.find(t=>t.team===l.side.name);
  const side=[];
  for(const p of players.filter(p=>p.team===l.side.name&&p.lineupStatus==='bench')){
   const history=teamStats?.players.find(q=>q.id===p.id);
   const historical=(model.competition==='champions'?history?.previousSeason?.totals:null)||p.member?.previousSeason?.totals||null;
   const row={playerId:p.id,team:p.team,name:p.name,role:p.role||history?.position||null,roleKey:roleKey(history||p.member),historical,
    projectedShots:null,projectedShotsOnTarget:null,expectedMinutes:null,entryProbability:null,conditionalMinutesIfUsed:null,
    shotProbabilities:null,shotOnTargetProbabilities:null,reasons:[]};
   if(!p.id)row.reasons.push('unresolved-canonical-player-id');
   else if(model.competition==='serie-a')row.reasons.push('serie-a-engine-has-no-bench-entry-model-and-allocates-full-volume-to-starters');
   else if(!kickoffAt)row.reasons.push('kickoff-unavailable');
   else{
    row.minutesEstimate=history?.providerPlayerId?minutesModel.estimateExpectedMinutes(evidenceByPlayer.get(String(history.providerPlayerId)),'potential-substitute',kickoffAt):{status:'not-evaluable',reason:'provider-player-id-unavailable'};
    if(row.minutesEstimate.status!=='evaluable')row.reasons.push(row.minutesEstimate.reason);
    const rateHistory=history?.previousSeason?.totals,rates=rateHistory?.per90;
    if(finite(rateHistory?.minutes)&&rateHistory.minutes>0&&finite(rates?.shots)&&finite(rates?.shotsOnTarget)&&row.roleKey){
     row.per90=minutesModel.rateForPlayer({roleKey:row.roleKey},history);
    }else row.reasons.push('insufficient-observed-shot-rates');
   }
   side.push(row);rows.push(row);
  }
  if(model.competition==='champions'&&side.length){
   const projection=model.prediction?.teamProjections?.find(t=>t.team===l.side.name||t.venue===(l===evidence.lineups[0]?'home':'away'));
   const audit=allocateBenchSide(side,players.filter(p=>p.team===l.side.name&&p.lineupStatus==='starter'),projection);
   budgets.push({team:l.side.name,...audit});
   for(const p of side)if(!finite(p.projectedShots)&&audit.reason)p.reasons.push(audit.reason);
  }
 }
 if(JSON.stringify({model,evidence})!==snapshot)throw new Error('Bench builder mutated existing model');
 return {fixtureId:model.fixture.id,competition:model.competition,context:benchContext(model,evidence),players:rows,budgets};
}
