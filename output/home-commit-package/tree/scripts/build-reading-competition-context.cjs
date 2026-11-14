'use strict';
const fs=require('node:fs'),path=require('node:path');
const {buildCompetitionContext,validationCoverage}=require('./predictions/competition-context.cjs');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const write=(f,d)=>{const file=path.join(root,f);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');};
function signals(context,names){return context.teams.map(t=>`${names.get(t.teamId)||t.teamId}: ${t.lastMatch?`ultima gara ${t.lastMatch.date} (${t.lastMatch.competition==='serie-a'?'Serie A':'Champions League'}) contro ${t.lastMatch.opponent}; ${t.daysSinceLastMatch} giorni tra le date delle gare`:'recupero N/D'}; ${t.matchesLast7Days??'N/D'} gare negli ultimi 7 giorni, ${t.matchesLast14Days??'N/D'} negli ultimi 14. Nessuna rotazione presunta.`);}
function build(matchday){
 if(!Number.isInteger(matchday)||matchday<1||matchday>38)throw Error('--matchday N richiesto');
 const fixtures=read('data/normalized/matches.json'),dataset=require('./build-serie-a-team-history.cjs').build();
 const targets=fixtures.filter(m=>m.competition==='serie-a'&&m.matchday===matchday&&m.status==='scheduled');
 if(!targets.length)throw Error('Nessuna gara programmata da aggiornare');
 const predictions=read('data/normalized/predictions.json'),names=new Map(read('data/normalized/teams.json').map(t=>[t.id,t.name]));
 for(const match of targets){
  const prediction=predictions.predictions.find(p=>p.matchId===match.id);if(!prediction)throw Error('Pronostico mancante '+match.id);
  const context=buildCompetitionContext(dataset,match);prediction.competitionContext=context;
  const file=`data/sources/readings/${match.id}.json`;
  if(fs.existsSync(path.join(root,file))){const reading=read(file);reading.sections.form.signals=[...(reading.sections.form.signals||[]).filter(s=>!s.includes('giorni tra le date delle gare')&&!s.includes('recupero N/D')), ...signals(context,names)];write(file,reading);}
 }
 write('data/normalized/predictions.json',predictions);
 const validation=validationCoverage(dataset,fixtures);write('data/analysis/serie-a-champions-context-validation.json',validation);
 console.log(JSON.stringify({matchday,updated:targets.length,validation}));
}
module.exports={build,signals};if(require.main===module){const i=process.argv.indexOf('--matchday');build(i<0?NaN:Number(process.argv[i+1]));}
