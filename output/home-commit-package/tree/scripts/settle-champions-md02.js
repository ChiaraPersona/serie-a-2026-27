const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');
function settle(leg,report){
  const result={status:'pending',label:'DA VERIFICARE',reason:'Statistiche ufficiali complete, sostituzioni e/o pali e traverse non disponibili.'};
  if(!report)return result;
  result.sourceUrl=report.sourceUrl;
  result.nonStarter=leg.player?['official-bench','official-non-starter'].includes(leg.player.lineupStatus):false;
  const h=report.score.home,a=report.score.away,threshold=Number(leg.threshold??leg.modifiers?.threshold);
  let hit;
  if(['3','28319'].includes(leg.marketCode))hit=leg.selection.includes(h>a?'1':h<a?'2':'X');
  if(leg.marketCode==='7989'&&Number.isFinite(threshold))hit=leg.selection==='OVER'?h+a>threshold:h+a<threshold;
  const evidence=report.playerEvidence?.find(e=>e.player===leg.player?.canonicalName);
  // A verified lower bound proves an OVER, never an UNDER or a loss.
  // Replacement statistics can only increase the aggregate; no absent value is zero.
  if(evidence&&!result.nonStarter&&leg.selection==='OVER'){
    const minimum=leg.marketCode==='28507'?evidence.shotsMinimum:leg.marketCode==='28506'?evidence.shotsOnTargetAndWoodworkMinimum:undefined;
    if(Number.isFinite(minimum)&&minimum>threshold){hit=true;result.reason=evidence.reason;result.sourceUrl=evidence.sourceUrl;}
  }
  if(hit!==undefined){result.status=hit?'won':'lost';result.label=hit?'VERDE':'ROSSO';if(!evidence||!hit)result.reason=`Risultato finale ${h}-${a}, tempi regolamentari; nessun supplementare in fase campionato.`;}
  return result;
}
function build(){
  const data=read('data/normalized/schedina-champions-md02.json');
  const reports=read('data/sources/champions-results-md02-2026-27.json');
  const byId=new Map(reports.fixtures.map(r=>[r.fixtureId,r]));
  const counts={won:0,lost:0,pending:0};const nonStarters=new Set();
  for(const fixture of data.fixtures){const report=byId.get(fixture.fixtureId);if(!report)continue;
    fixture.status='finished';fixture.score=report.score;
    for(const leg of fixture.selections){leg.settlement=settle(leg,report);counts[leg.settlement.status]++;if(leg.settlement.nonStarter)nonStarters.add(`${fixture.fixtureId}:${leg.player.canonicalPlayerId}`);}
  }
  const all=data.fixtures.flatMap(f=>f.selections),decided=all.filter(s=>['won','lost','void'].includes(s.settlement.status));
  const gross=decided.reduce((n,s)=>n+(s.settlement.status==='won'?s.odds:s.settlement.status==='void'?1:0),0);
  Object.assign(data.summary,{won:all.filter(s=>s.settlement.status==='won').length,lost:all.filter(s=>s.settlement.status==='lost').length,void:all.filter(s=>s.settlement.status==='void').length,pending:all.length-decided.length,stakeEuro:decided.length,grossReturnEuro:+gross.toFixed(2),profitLossEuro:+(gross-decided.length).toFixed(2),roiPct:decided.length?+((gross-decided.length)/decided.length*100).toFixed(2):null});
  data.status='PARTIAL_RESULTS';data.settledAt=reports.verifiedAt;
  write('data/normalized/schedina-champions-md02.json',data);
  const summary={...counts,nonStarters:nonStarters.size,total:counts.won+counts.lost+counts.pending};
  write('output/champions-md02-settlement/summary.json',summary);console.log(summary);return data;
}
module.exports={settle,build};if(require.main===module)build();
