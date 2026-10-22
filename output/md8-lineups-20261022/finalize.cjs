const fs=require('fs'),cp=require('child_process');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const baseline=JSON.parse(cp.execFileSync('git',['show','HEAD:data/normalized/predictions.json'],{encoding:'utf8',maxBuffer:80e6}));
const preview=read('data/generated/prediction-preview-md08-2026-27.json');
const ids=new Set(preview.predictions.map(p=>p.matchId));
fs.writeFileSync('data/normalized/predictions.md8.tmp',JSON.stringify({...baseline,generatedAt:preview.generatedAt,predictions:[...baseline.predictions.filter(p=>!ids.has(p.matchId)),...preview.predictions]},null,2)+'\n');
fs.renameSync('data/normalized/predictions.md8.tmp','data/normalized/predictions.json');
const d=read('data/sources/probable-lineups-md8-2026-27.json');
const report={matchday:8,coverage:d.coverage,engine:preview.engineVersion||preview.modelVersion,fixtures:preview.predictions.map(p=>({matchId:p.matchId,market:p.market})),unrecognized:[],ballots:[],unavailable:[],suspended:[],doubtful:[],notes:['Probabili editoriali, nessuna nuova formazione ufficiale.','Snapshot Sisal disponibile MD7: portafogli MD8 non generati; quote/EV non inventati.','Previsioni estranee alla MD8 conservate dal contenuto precedente.']};
for(const t of d.teams){for(const p of [...t.players,...t.unavailable,...t.suspended,...t.doubtful,...t.ballots.flat()])if(!p.playerId)report.unrecognized.push({teamId:t.teamId,...p}); for(const key of ['ballots','unavailable','suspended','doubtful'])report[key].push({teamId:t.teamId,matchId:t.matchId,items:t[key]});}
report.unrecognized=[...new Map(report.unrecognized.map(p=>[p.teamId+':'+p.sourceId,p])).values()];
fs.writeFileSync('output/md8-lineups-20261022/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({coverage:d.coverage,unrecognized:report.unrecognized.map(p=>p.teamId+': '+p.sourceName),ballots:d.teams.reduce((n,t)=>n+t.ballots.length,0),injuries:d.teams.reduce((n,t)=>n+t.unavailable.length,0),suspended:d.teams.reduce((n,t)=>n+t.suspended.length,0),doubtful:d.teams.reduce((n,t)=>n+t.doubtful.length,0),predictionKeys:Object.keys(preview),unchangedOtherPredictions:baseline.predictions.filter(p=>!ids.has(p.matchId)).length},null,2));

