'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function currentMatchday(fixtures){return [...new Set(fixtures.map(f=>f.matchday))].sort((a,b)=>a-b).find(day=>fixtures.some(f=>f.matchday===day&&f.status!=='finished'))??null;}
function isArchived(f,fixtures){return f.status==='finished'&&f.matchday!==currentMatchday(fixtures);}
function finishedReadingFiles(){
 const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 const league=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a');
 const sa=league.filter(m=>isArchived(m,league));
 const fixtures=read('data/normalized/champions-league-2026-27.json').fixtures;
 const cl=fixtures.filter(m=>isArchived(m,fixtures));
 const files=new Set();
 for(const m of sa)for(const dir of ['readings/matches','readings/catalogs','readings/wire','reading-bench-starter-scenarios'])files.add(`data/generated/${dir}/${m.id}.json`);
 for(const m of cl)files.add(`data/generated/champions-readings/${m.id}.json`);
 const calendar=read('data/normalized/champions-league-2026-27.json').fixtures;
 for(const day of [2,3,4])if(calendar.filter(m=>m.matchday===day).every(m=>m.status==='finished'))files.add(`data/generated/champions-readings/registry-md${day}.json`);
 return files;
}
function retire(){
 let files=0,bytes=0;
 for(const relative of finishedReadingFiles()){
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep))throw Error('Invalid reading path');
  if(fs.existsSync(target)){bytes+=fs.statSync(target).size;fs.unlinkSync(target);files++;}
 }
 return {files,bytes};
}
module.exports={currentMatchday,isArchived,finishedReadingFiles,retire};
if(require.main===module)console.log(JSON.stringify(retire()));
