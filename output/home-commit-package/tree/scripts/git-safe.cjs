'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const MIN_AGE_MS=120000;
function gitProcesses(){
  const windows=process.platform==='win32';
  const result=spawnSync(windows?'powershell.exe':'ps',windows?['-NoProfile','-NonInteractive','-Command',"@(Get-Process -ErrorAction Stop | Where-Object { $_.ProcessName -eq 'git' -or $_.ProcessName -like 'git-*' } | Select-Object -ExpandProperty Id) | ConvertTo-Json -Compress"]:['-A','-o','comm='],{encoding:'utf8',timeout:10000});
  if(result.error||result.status!==0)throw Error('Impossibile verificare i processi Git: nessun lock modificato.');
  if(windows){const value=result.stdout.trim();return value?JSON.parse(value):[];}
  return result.stdout.split('\n').filter(s=>/^git(?:-|$)/.test(path.basename(s.trim())));
}
function repair(cwd=process.cwd()){
  const location=spawnSync('git',['rev-parse','--git-path','index.lock'],{cwd,encoding:'utf8'});
  if(location.status!==0)throw Error(location.stderr.trim()||'Repository Git non accessibile.');
  const lock=path.resolve(cwd,location.stdout.trim());
  if(!fs.existsSync(lock))return {status:'ready'};
  const old=fs.lstatSync(lock);
  if(!old.isFile()||old.isSymbolicLink()||old.size!==0)throw Error('Lock Git non vuoto o non regolare: conservato per verifica manuale.');
  if(Date.now()-old.mtimeMs<MIN_AGE_MS)throw Error('Lock Git recente: attendere la fine dell’operazione e riprovare.');
  const active=gitProcesses();
  if(Array.isArray(active)?active.length:active)throw Error('Processi Git attivi: lock conservato. Terminare normalmente l’operazione e riprovare.');
  const latest=fs.lstatSync(lock);
  if(latest.size!==old.size||latest.mtimeMs!==old.mtimeMs||latest.ino!==old.ino)throw Error('Lock cambiato durante il controllo: conservato.');
  const backup=lock+'.orphan-'+Date.now()+'-'+process.pid;
  // Rename rather than delete, retaining the orphan for diagnosis.
  fs.renameSync(lock,backup);
  return {status:'recovered',backup};
}
function main(args){
  const command=args[0];
  if(!command||command==='repair'){console.log(JSON.stringify(repair()));return 0;}
  if(!['add','commit','status'].includes(command))throw Error('Comandi supportati: repair, add, commit, status. Nessun push automatico.');
  console.log(JSON.stringify(repair()));
  const run=()=>spawnSync('git',args,{stdio:'inherit',env:command==='status'?{...process.env,GIT_OPTIONAL_LOCKS:'0'}:process.env});
  let result=run();
  if(result.error)throw result.error;
  if(result.status!==0){const recovery=repair();if(recovery.status==='recovered'){console.log(JSON.stringify(recovery));result=run();}}
  return result.status??1;
}
module.exports={repair};
if(require.main===module)try{process.exitCode=main(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}
