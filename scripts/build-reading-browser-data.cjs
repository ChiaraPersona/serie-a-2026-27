// Browser views only: retain canonical archives, contracts and model outputs.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {withReadingDuels}=require('./reading-duel-presentation.cjs');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const write=(f,data)=>{const file=path.join(root,'data/generated/readings',f),text=JSON.stringify(data)+'\n';fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==text)fs.writeFileSync(file,text);};
const pick=(o,keys)=>Object.fromEntries(keys.filter(k=>k in o).map(k=>[k,o[k]]));
function build({matchday=null}={}){
 const matches=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'),teams=read('data/normalized/teams.json');
 const readings=read('data/normalized/readings.json'),predictions=read('data/normalized/predictions.json'),directory=read('data/teams/index.json');
 const duelSquads=new Map(teams.map(t=>[t.id,read(`data/generated/team-pages/${t.id}-squad.json`)]));
 const objectives=read('data/team-objectives.json'),styles=read('data/normalized/team-style-profiles.json'),h2h=read('data/generated/head-to-head/first-leg-2026-27.json'),referees=read('data/generated/reading-referee-profiles-2025-26.json');
 write('index.json',{teams:teams.map(t=>pick(t,['id','name','shortName','logo','colors'])),matches:matches.map(m=>pick(m,['id','competition','homeTeam','awayTeam','matchday','date','matchdayDate','dateStatus','kickoff','status','score'])),fixtureIds:matches.map(m=>m.id)});
 const finishedIds=matches.filter(m=>m.status==='finished'&&m.score).map(m=>m.id),catalogs=new Map(),cache=new Map();
 const artifact=f=>{if(!cache.has(f))cache.set(f,fs.existsSync(path.join(root,f))?read(f):null);return cache.get(f)};
 for(const match of matches.filter(m=>matchday===null||m.matchday===matchday)){
  const id=match.id,ids=[match.homeTeam,match.awayTeam],day=match.matchday,code=String(day).padStart(2,'0'),forecastFile=day===1?'schedina.json':`schedina-md${code}.json`;
  if(!catalogs.has(day))catalogs.set(day,artifact(`data/normalized/reading-md${code}-market-catalog.json`)||artifact('data/normalized/'+forecastFile));
  const source=catalogs.get(day),catalog=source?.marketCatalog;
  // Only suggested contracts can reach sharedForecastsForMatch/reconciliation.
  const forecastDataset=source?{matchday:day,marketCatalog:{matches:(catalog?.matches||[]).filter(m=>m.matchId===id).map(m=>({matchId:m.matchId,selections:m.selections.filter(l=>l.suggestionAnalysis?.suggested===true)}))}}:null;
  write(`catalogs/${id}.json`,{forecastDataset,finishedIds});
  const artifacts={};
  const add=(f,project=x=>x)=>{const d=artifact(f);if(d!==null)artifacts[f]=project(d)};
  for(const team of ids)add(`data/teams/${team}.json`,d=>pick(d,['id','coach','squad']));
  add('data/sources/official-lineups-2026-27.json',d=>({...d,fixtures:d.fixtures.filter(f=>f.matchId===id)}));
  add(`data/sources/probable-lineups-md${day}-2026-27.json`,d=>({...d,teams:d.teams.filter(t=>ids.includes(t.teamId))}));
  add('data/sources/team-pages/shirt-numbers-2026-27.json',d=>({numberHistory:d.numberHistory.filter(p=>ids.includes(p.teamId))}));
  add('data/normalized/reading-bench-forecasts.json',d=>({fixtures:d.fixtures.filter(f=>f.fixtureId===id)}));
  add(`data/generated/reading-bench-starter-scenarios/${id}.json`);
  add('data/generated/reading-referee-history.json',d=>({...d,fixtures:d.fixtures.filter(f=>f.fixtureId===id)}));
  add('data/normalized/champions-league-2026-27.json',d=>({teamBranding:d.teamBranding}));
  // Keep signed snapshots intact, narrowing only the containing array.
  add('data/predictions/snapshots/manifest.json',d=>({...d,snapshots:d.snapshots.filter(s=>s.matchId===id)}));
  for(const entry of artifacts['data/predictions/snapshots/manifest.json']?.snapshots||[])add(entry.snapshotFile,d=>({...d,snapshots:d.snapshots.filter(s=>s.matchId===id)}));
  add('data/normalized/card-settlement-records.json',d=>({...d,records:d.records.filter(r=>r.matchId===id||r.fixtureId===id||r.key?.includes(id))}));
  if(day===6&&source)artifacts['data/normalized/schedina-md06.json']={matchday:day,marketCatalog:{matches:(catalog?.matches||[]).filter(m=>m.matchId===id)}};
  const history=matches.filter(m=>m.id===id||m.status==='finished'&&m.score&&m.date<match.date&&ids.some(t=>m.homeTeam===t||m.awayTeam===t));
  write(`matches/${id}.json`,{teams,matches:history,readings:readings.filter(r=>r.matchId===id),objectiveProfiles:objectives,teamDirectory:{...directory,officialLineups:Object.fromEntries(Object.entries(directory.officialLineups||{}).filter(([key])=>key.startsWith(id+':')))},teamStyleProfiles:{...styles,profiles:styles.profiles.filter(p=>ids.includes(p.teamId))},predictionDataset:{predictions:predictions.predictions.filter(p=>p.matchId===id).map(p=>withReadingDuels(p,duelSquads))},headToHeadData:{fixtures:h2h.fixtures.filter(f=>f.fixtureId===id||[f.homeTeamId,f.awayTeamId].sort().join('|')===ids.slice().sort().join('|'))},refereeProfiles:{...referees,profiles:referees.profiles.filter(p=>p.refereeSlug===match.refereeAssignment?.referee?.slug)},forecastDataset,finishedIds,artifacts});
 }
 console.log(`Lettura: indice e ${matches.filter(m=>matchday===null||m.matchday===matchday).length} dettagli generati senza ricalcoli.`);
}
module.exports={build};if(require.main===module){const i=process.argv.indexOf('--matchday');const matchday=i<0?null:Number(process.argv[i+1]);if(matchday!==null&&(!Number.isInteger(matchday)||matchday<1||matchday>38))throw Error('Giornata non valida');build({matchday});}

