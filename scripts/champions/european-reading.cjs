'use strict';
const assert=require('node:assert/strict');
const outcome=s=>s.home>s.away?0:s.home===s.away?1:2;
const sum=a=>a.reduce((n,v)=>n+v,0);
const round=v=>Math.round(v*100)/100;
// Minimum relative-entropy projection: retain each conditional score shape,
// replace only the three outcome masses with the European rating probabilities.
function conditionScores({expected,matrix},result){
 if(result?.status!=='PRELIMINARY')return {expected,matrix,applied:false};
 const target=['home','draw','away'].map(k=>result.probabilities[k]/100);
 assert(target.every(v=>Number.isFinite(v)&&v>=0)&&Math.abs(sum(target)-1)<1e-8,'Invalid European probabilities');
 const base=[0,1,2].map(k=>sum(matrix.filter(s=>outcome(s)===k).map(s=>s.probability)));
 assert(base.every(v=>v>0),'Missing baseline outcome support');
 const conditioned=matrix.map(s=>({...s,probability:s.probability*target[outcome(s)]/base[outcome(s)]}));
 const home=sum(conditioned.map(s=>s.home*s.probability)),away=sum(conditioned.map(s=>s.away*s.probability));
 const ranked=[...conditioned].sort((a,b)=>b.probability-a.probability),leader=target.indexOf(Math.max(...target));
 const primary=ranked.find(s=>outcome(s)===leader),selected=[primary,...ranked.filter(s=>s!==primary)].slice(0,3);
 const display=selected.map((s,i)=>({score:`${s.home}-${s.away}`,outcome:['1','X','2'][outcome(s)],label:i?'Alternativa':'Risultato centrale · esito prevalente',probabilityPct:Math.round(s.probability*1000)/10,conditionalProbabilityPct:Math.round(s.probability/target[outcome(s)]*1000)/10}));
 const forecast={primary:display[0],alternatives:display.slice(1),display,coherentWithVerdict:true,method:'Punteggio più probabile entro l’esito Elo prevalente; probabilità assolute dalla distribuzione condivisa. Stima non validata.'};
 return {applied:true,matrix:conditioned,forecast,expected:{...expected,home:round(home),away:round(away),total:round(home+away),
  method:'Distribuzione dei punteggi condizionata al rating europeo; forma dei punteggi da attacco/difesa, matchup e xGOT. Stima sperimentale non validata.',
  components:{...expected.components,europeanReading:{applied:true,modelId:result.readingModelId||result.modelId,method:'minimum-relative-entropy-outcome-conditioning-v1',statisticallyValidated:false,baseline:{home:expected.home,away:expected.away,total:expected.total},baselineProbabilities:base,targetProbabilities:target}}}};
}
// Discipline is not inferred from an Elo number. Learn the outcome association
// from the team's observed pre-cutoff matches, shrunk toward its overall rate.
function conditionDiscipline(projections,rows,baseProbabilities,targetProbabilities,priorMatches){
 return projections.map((p,i)=>{
  const copy={...p,europeanDiscipline:{}};
  const prior=i?[baseProbabilities[2],baseProbabilities[1],baseProbabilities[0]]:baseProbabilities;
  const target=i?[targetProbabilities[2],targetProbabilities[1],targetProbabilities[0]]:targetProbabilities;
  for(const [key,metric] of [['cards','yellowCards'],['fouls','foulsCommitted']]){
   const observed=rows[i].filter(r=>Number.isFinite(r.for[metric])&&r.for[metric]>=0&&Number.isFinite(r.for.goals)&&Number.isFinite(r.against.goals));
   const groups=[0,1,2].map(k=>observed.filter(r=>(r.for.goals>r.against.goals?0:r.for.goals===r.against.goals?1:2)===k));
   const diagnostics={status:'neutral-insufficient-conditional-history',sample:observed.length,byOutcome:groups.map(g=>g.length),factor:1,statisticallyValidated:false};
   if(Number.isFinite(p[key]?.central)&&observed.length>=priorMatches&&groups.every(g=>g.length>0)){
    const mean=sum(observed.map(r=>r.for[metric]))/observed.length;
    const rates=groups.map(g=>(sum(g.map(r=>r.for[metric]))+priorMatches*mean)/(g.length+priorMatches));
    const base=sum(rates.map((v,k)=>v*prior[k])),next=sum(rates.map((v,k)=>v*target[k]));
    const factor=base>0?next/base:1;
    copy[key]={...p[key]};for(const field of ['central','min','max'])if(Number.isFinite(p[key][field]))copy[key][field]=Math.round(p[key][field]*factor*10)/10;
    Object.assign(diagnostics,{status:'experimental-outcome-conditioned',factor,conditionalRates:rates,priorMatches});
   }
   copy.europeanDiscipline[key]=diagnostics;
  }
  return copy;
 });
}
module.exports={conditionScores,conditionDiscipline};
