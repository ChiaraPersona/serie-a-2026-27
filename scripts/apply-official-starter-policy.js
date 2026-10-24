const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const policy=require('../js/official-starter-policy.js');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{
  const target=path.join(root,p),body=JSON.stringify(d,null,2)+'\n';
  if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===body)return;
  const temporary=target+'.official.tmp';fs.writeFileSync(temporary,body);
  for(let attempt=0;;attempt++)try{fs.renameSync(temporary,target);return;}catch(error){if(attempt===5)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}
};
function buildRegistry(){
  const registry={};
  const add=(id,players)=>{registry[id]={ids:[...new Set(players.map(p=>p.playerId||p.canonicalPlayerId).filter(Boolean))],names:[...new Set(players.flatMap(p=>[p.currentName,p.canonicalName,p.name,typeof p==='string'?p:null]).filter(Boolean).map(policy.token))]};};
  for(const file of fs.readdirSync(path.join(root,'data/sources')).filter(f=>/official-lineups.*\.json$/.test(f))){
    for(const fixture of read('data/sources/'+file).fixtures||[]){
      if(fixture.status&&fixture.status!=='official')continue;
      if(fixture.teams?.length===2)add(fixture.matchId||fixture.fixtureId,fixture.teams.flatMap(t=>t.players||[]));
    }
  }
  const integration=read('data/normalized/champions-md02-integration-2026-27.json');
  // Reuse explicit lineupName -> canonical identity links already published for
  // MD1. No surname guessing or fuzzy matching against the squad is allowed.
  const md1=read('data/normalized/champions-player-markets-md01-2026-27.json');
  const md1Identities=new Map();
  for(const fixture of md1.fixtures){
    const rows=[];
    const visit=value=>{if(!value||typeof value!=='object')return;
      if(value.lineupName&&value.playerId&&value.name)rows.push({suppliedName:value.lineupName,canonicalName:value.name,canonicalPlayerId:value.playerId});
      for(const item of Object.values(value))if(item&&typeof item==='object')visit(item);
    };
    visit(fixture);md1Identities.set(fixture.fixtureId,rows);
  }
  for(const file of fs.readdirSync(path.join(root,'data/sources')).filter(f=>/official-formations.*\.json$/.test(f))){
    for(const official of read('data/sources/'+file).fixtures||[]){
      if(official.status!=='official')continue;
      const fixture=integration.fixtures.find(f=>f.fixtureId===official.fixtureId);
      const known=fixture?[...fixture.lineups.home.players,...fixture.lineups.away.players,...(fixture.editorialLineups?.home?.players||[]),...(fixture.editorialLineups?.away?.players||[])]:md1Identities.get(official.fixtureId)||[];
      const players=[...(official.home?.players||[]),...(official.away?.players||[])].map(name=>{
        if(typeof name==='object')return name;
        const matches=[...new Map(known.filter(p=>[p.suppliedName,p.canonicalName].some(n=>policy.token(n)===policy.token(name))).map(p=>[p.canonicalPlayerId||p.suppliedName,p])).values()];
        return matches.length===1?{...matches[0],name}:{name};
      });
      add(official.fixtureId,players);
    }
  }
  write('data/normalized/official-starter-registry.json',registry);policy.configure(registry);return registry;
}
function build(){
  buildRegistry();
  const file='data/normalized/schedina-champions-md02.json',data=read(file),filtered=policy.filter(data);
  const removed=data.fixtures.flatMap(f=>f.selections.filter(s=>!policy.eligible(s,f.fixtureId)));
  fs.mkdirSync(path.join(root,'data/technical-archive'),{recursive:true});
  const archive='data/technical-archive/official-nonstarter-markets.json';
  const previous=fs.existsSync(path.join(root,archive))?read(archive):[];
  write(archive,[...new Map([...previous,...removed].map(s=>[s.selectionId,s])).values()]);
  const selections=filtered.fixtures.flatMap(f=>f.selections);
  filtered.summary.predictions=selections.length;
  filtered.summary.clickableSelections=selections.filter(s=>s.betSelection?.quote?.availability==='AVAILABLE_AT_SNAPSHOT').length;
  filtered.summary.preferredPredictions=selections.filter(s=>s.isPreferred).length;
  filtered.summary.individualPredictions=selections.filter(s=>s.marketScope==='player').length;
  filtered.summary.individualShots=selections.filter(s=>s.marketCode==='28507').length;
  filtered.summary.individualShotsOnTarget=selections.filter(s=>s.marketCode==='28506').length;
  write(file,filtered);
  if(fs.existsSync(path.join(root,'data/sources/champions-verification-md02-2026-10-14.json')))require('./apply-champions-verification.js').build();
  return removed;
}
module.exports={build,buildRegistry};if(require.main===module)console.log('Removed',build().length);
