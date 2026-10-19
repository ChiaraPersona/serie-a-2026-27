// Informational aggregates only. Never imported by prediction builders.
const metrics=['yellowCards','dismissals','totalCards','fouls','directRedCards','secondYellowCards'];
function aggregate(rows){
 return Object.fromEntries(metrics.map(key=>{
  const values=rows.filter(r=>!r.disputedMetrics?.includes(key)).map(r=>key==='totalCards'?(r.disputedMetrics?.some(k=>['yellowCards','dismissals'].includes(k))||!Number.isInteger(r.yellowCards)||!Number.isInteger(r.dismissals)?null:r.yellowCards+r.dismissals):r[key]).filter(v=>Number.isInteger(v)&&v>=0);
  return [key,{average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,n:values.length}];
 }));
}
function analyze(rows,cutoffDate){
 const before=rows.filter(r=>r.date<cutoffDate).sort((a,b)=>b.date.localeCompare(a.date));
 const recent=aggregate(before.slice(0,5)),seasonal=aggregate(before.filter(r=>r.season==='2026/27'));
 const percentDifference=Object.fromEntries(metrics.map(k=>[k,recent[k].average!==null&&seasonal[k].average>0?(recent[k].average/seasonal[k].average-1)*100:null]));
 return {recent,seasonal,percentDifference,seasonLabel:'2026/27 · gare disponibili, tutte le competizioni ufficiali',seasonCoverage:'PARTIAL',counting:'Gialli registrati + espulsioni (rosso diretto o doppia ammonizione), ciascuna espulsione una sola volta; nessun secondo giallo aggiunto al totale dei gialli.',trend:percentDifference.yellowCards===null?'Confronto disciplinare non disponibile.':Math.abs(percentDifference.yellowCards)<5?'Frequenza recente delle ammonizioni stabile nel campione disponibile.':`Frequenza recente delle ammonizioni ${percentDifference.yellowCards>0?'superiore':'inferiore'} alla media stagionale disponibile.`,limitations:'Campioni piccoli e competizioni diverse: confronto descrittivo. Dati discordanti esclusi dalle medie; — indica dati mancanti o non risolti. Base stagionale parziale.'};
}
module.exports={aggregate,analyze};
