'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),get=flag=>args[args.indexOf(flag)+1];
const competition=get('--competition'),day=Number(get('--matchday'));
if(!args.includes('--competition')||!['serie-a','champions'].includes(competition)||!args.includes('--matchday')||!Number.isInteger(day)||day<1||day>(competition==='serie-a'?38:8))throw Error('Richiesti --competition serie-a|champions --matchday N');
const command=(file,...options)=>[file,...options];
let plan;
if(competition==='serie-a'){
 const concluded=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'),'utf8')).some(m=>m.competition==='serie-a'&&m.matchday===day&&m.status==='finished');
 plan=[command('scripts/build-readings.js'),command('scripts/team-pages/build.js'),command('scripts/build-team-matchup-profiles.js'),command('scripts/build-betting-matchday.js','--matchday',String(day),...(concluded||day<6?['--validate-only']:[]))];
}else if(day===3){
 plan=['build-champions-md3-player-database.cjs','build-champions-md3-probable.cjs','build-champions-md3-offline.js','build-champions-md3-preliminary.js','build-champions-md3-approved.cjs'].map(f=>command('scripts/'+f));
}else if(day===2){
 plan=[command('scripts/build-champions-pilot-predictions.js','--matchday','2'),command('scripts/build-champions-md02-integration.js'),command('scripts/build-champions-md02-schedina.js')];
}else if(day===1){plan=['build-champions-player-stats.js','build-champions-pilot-predictions.js','build-champions-surprise-factor.js','build-champions-player-markets.js','build-champions-schedina.js'].map(f=>command('scripts/'+f));}
else throw Error('Catena Champions non ancora documentata per questa giornata: nessuna generazione');
console.log(JSON.stringify({competition,matchday:day,mode:args.includes('--stage')?'staging':'plan',plan},null,2));
if(!args.includes('--stage'))return;
if(!args.includes('--output'))throw Error('--stage richiede --output output/<cartella-nuova>');
const target=path.resolve(root,get('--output')),outputRoot=path.join(root,'output')+path.sep;
if(!target.startsWith(outputRoot)||fs.existsSync(target))throw Error('Staging: destinazione nuova richiesta dentro output/');
// Raw are immutable inputs shared through a junction, never copied or regenerated.
fs.mkdirSync(target,{recursive:true});for(const dir of ['scripts','js','css','data'])fs.cpSync(path.join(root,dir),path.join(target,dir),{recursive:true,filter:p=>p!==path.join(root,'data','raw')});
fs.symlinkSync(path.join(root,'data','raw'),path.join(target,'data','raw'),process.platform==='win32'?'junction':'dir');
fs.copyFileSync(path.join(root,'package.json'),path.join(target,'package.json'));
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')))fs.copyFileSync(path.join(root,file),path.join(target,file));
const reports=path.join(root,'output/reports');if(fs.existsSync(reports))fs.cpSync(reports,path.join(target,'output/reports'),{recursive:true});
const archive='seria-a-2026-27-raw-archive-2026-08-24';if(fs.existsSync(path.join(root,archive)))fs.symlinkSync(path.join(root,archive),path.join(target,archive),process.platform==='win32'?'junction':'dir');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()?[]:e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=Object.fromEntries(walk(path.join(target,'data')).map(p=>[path.relative(target,p),hash(p)]));
let failure=null;try{for(const [file,...options] of plan)execFileSync(process.execPath,[file,...options],{cwd:target,stdio:'inherit'});}catch(e){failure=e.message;}
const changed=walk(path.join(target,'data')).filter(p=>before[path.relative(target,p)]!==hash(p)).map(p=>path.relative(target,p));
fs.writeFileSync(path.join(target,'generation-report.json'),JSON.stringify({competition,matchday:day,plan,changed,failure,promoted:false},null,2)+'\n');
console.log('Candidati isolati: confrontare generation-report.json; nessuna promozione automatica.');if(failure)process.exitCode=1;
