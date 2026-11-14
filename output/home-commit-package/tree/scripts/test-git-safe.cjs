'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync,spawn}=require('node:child_process');
const script=path.resolve(__dirname,'git-safe.cjs'),cwd=fs.mkdtempSync(path.join(os.tmpdir(),'git-safe-test-'));
const git=args=>spawnSync('git',args,{cwd,encoding:'utf8'});
const safe=args=>spawnSync(process.execPath,[script,...args],{cwd,encoding:'utf8'});
const lock=path.join(cwd,'.git/index.lock');
const aged=body=>{fs.writeFileSync(lock,body);const time=new Date(Date.now()-180000);fs.utimesSync(lock,time,time);};
assert.equal(git(['init','-q']).status,0);
fs.writeFileSync(path.join(cwd,'example.txt'),'regression\n');
aged('');assert.notEqual(git(['add','example.txt']).status,0,'Actual Git must reproduce orphan-lock failure');
let result=safe(['add','example.txt']);assert.equal(result.status,0,result.stderr);assert(!fs.existsSync(lock));assert(fs.readdirSync(path.dirname(lock)).some(n=>n.startsWith('index.lock.orphan-')));
result=safe(['commit','-m','Temporary repository regression','--no-gpg-sign','--author','Test <test@example.invalid>']);
// Git requires committer identity independently of --author; configure only this disposable repo.
if(result.status!==0){assert.equal(git(['config','user.name','Test']).status,0);assert.equal(git(['config','user.email','test@example.invalid']).status,0);result=safe(['commit','-m','Temporary repository regression','--no-gpg-sign']);}
assert.equal(result.status,0,result.stderr);
fs.writeFileSync(lock,'');result=safe(['repair']);assert.notEqual(result.status,0);assert(fs.existsSync(lock));fs.unlinkSync(lock);
aged('partial index');result=safe(['repair']);assert.notEqual(result.status,0);assert.equal(fs.readFileSync(lock,'utf8'),'partial index');fs.unlinkSync(lock);
const active=spawn('git',['hash-object','--stdin'],{cwd,stdio:['pipe','pipe','pipe']});
active.on('error',e=>{throw e;});
setTimeout(()=>{try{aged('');result=safe(['repair']);assert.notEqual(result.status,0);assert.match(result.stderr,/attivi/);assert(fs.existsSync(lock));fs.unlinkSync(lock);console.log('PASS real Git: orphan recovered, commit succeeds, recent/nonempty/active locks preserved. Temporary repo: '+cwd);}finally{active.stdin.end();}},500);
