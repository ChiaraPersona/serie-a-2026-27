"use strict";
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const normal=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function settle(leg,result){
  const pending={status:'pending',label:'Da verificare',reason:'Servono statistiche e sostituzioni compatibili con il mercato Sisal.'};
  if(!result)return pending;
  const {home:h,away:a}=result.score;
  if(leg.marketCode==='975'&&result.statistics?.corners){
    const threshold=leg.variantName.match(/U\/O (\d+(?:\.\d+)?)/);
    const total=result.statistics.corners.reduce((a,b)=>a+b,0);
    if(threshold&&['OVER','UNDER'].includes(leg.selection)){
      const hit=leg.selection==='OVER'?total>+threshold[1]:total<+threshold[1];
      return {status:hit?'won':'lost',label:hit?'Vinta':'Persa',reason:`${total} corner totali`,sourceUrl:result.statistics.sourceUrl};
    }
  }
  let hit;
  if(leg.marketCode==='3')hit=leg.selection===(h>a?'1':h<a?'2':'X');
  if(leg.marketCode==='30394'){
    const ranges=leg.selection.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/);
    if(ranges)hit=h>=+ranges[1]&&h<=+ranges[2]&&a>=+ranges[3]&&a<=+ranges[4];
  }
  if(leg.marketCode==='7989'){
    const threshold=leg.variantName.match(/U\/O (\d+(?:\.\d+)?)/);
    if(threshold&&['OVER','UNDER'].includes(leg.selection))hit=leg.selection==='OVER'?h+a>+threshold[1]:h+a<+threshold[1];
  }
  // A verified goal proves these positive selections, including replacement markets.
  // Absence from the scorers never proves a loss for a replacement market.
  const goals=[...result.scorers.home,...result.scorers.away].filter(name=>normal(name)===normal(leg.player)).length;
  if(goals&&['28231','28545'].includes(leg.marketCode)&&leg.selection==='SI')hit=true;
  if(goals&&['28507','28506'].includes(leg.marketCode)&&leg.selection==='OVER'){
    const threshold=leg.label.match(/over (\d+(?:,\d+)?)/i);
    if(threshold&&goals>Number(threshold[1].replace(',','.')))hit=true;
  }
  const evidence=result.selectionEvidence?.find(e=>e.player===leg.player&&e.marketCode===leg.marketCode);
  if(evidence) return {status:evidence.status,label:evidence.status==='won'?'Vinta':'Persa',reason:evidence.reason,sourceUrl:evidence.sourceUrl};
  return hit===undefined?pending:{status:hit?'won':'lost',label:hit?'Vinta':'Persa',reason:leg.marketScope==='player'?'Gol verificato nel referto.':`Risultato finale ${h}-${a}`,sourceUrl:result.sourceUrl};
}
function build(){
  const data=read('data/sources/schedina-champions-md01-snapshot.json');
  const results=read('data/sources/champions-results-md01-2026-27.json');
  const byId=new Map(results.fixtures.map(f=>[f.fixtureId,f]));
  const counts={won:0,lost:0,pending:0};
  for(const slip of data.slips){
    for(const leg of slip.legs){leg.settlement=settle(leg,byId.get(leg.matchId));counts[leg.settlement.status]++;}
    const states=slip.legs.map(l=>l.settlement.status);
    slip.settlement={status:states.includes('lost')?'lost':states.includes('pending')?'pending':'won'};
  }
  data.settledAt=results.verifiedAt;
  data.settlementSummary=counts;
  data.settlementNote='Esiti calcolati dai dati verificati; non costituiscono refertazione del bookmaker. Le selezioni senza evidenza sufficiente restano Da verificare. Giocate, quote e probabilità originali conservate.';
  const output=path.join(root,'data/normalized/schedina-champions-md01.json');
  const temporary=output+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(data,null,2)+'\n');
  fs.renameSync(temporary,output);
  console.log('Esiti Champions:',counts);
  return data;
}
module.exports={settle,build};
if(require.main===module)build();
