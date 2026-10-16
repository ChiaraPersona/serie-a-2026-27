// Two explicit audit-only operations; never updates a baseline or expected value.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url)),own=path.relative(process.cwd(),out).replaceAll('\\','/')+'/';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const write=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:128*1024*1024});
function walk(p){return fs.existsSync(p)?fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]):[];}
function outputPaths(){return walk('output').filter(p=>!p.startsWith('output/reports/')&&/\.(?:json|jsonl)(?:\.gz)?$/i.test(p)).sort();}
if(process.argv[2]==='capture-output'){
 const files=outputPaths().map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(p)}));
 write('output-data-manifest.json',{algorithm:'SHA-256',capturedAt:new Date().toISOString(),timing:'Supplement captured after read-only tests; initial pre-test proof is provided only by protected-manifest.json. Supplement establishes future protected output-data/snapshot baseline.',scope:'All existing JSON/JSONL and compressed JSON/JSONL under output except reports (already covered in core manifest).',files});
 console.log('Supplementary output data/snapshots:',files.length);
}else if(process.argv[2]==='verify'){
 const core=read(path.join(out,'protected-manifest.json')),supplement=read(path.join(out,'output-data-manifest.json'));
 const all=[...core.files,...supplement.files];
 const changed=all.filter(f=>!fs.existsSync(f.path)||hash(f.path)!==f.sha256).map(f=>f.path);
 const current=[...new Set([...git('ls-files','-z','--cached','--others','--exclude-standard').split('\0').filter(p=>p&&!p.startsWith('output/')),...walk('data'),...walk('output/reports').filter(p=>!p.startsWith(own)),...outputPaths()])];
 const before=new Set(all.map(f=>f.path)),after=new Set(current);
 const added=current.filter(p=>!before.has(p)),removed=all.filter(f=>!after.has(f.path)).map(f=>f.path);
 write('final-verification.json',{checkedAt:new Date().toISOString(),protectedFiles:all.length,coreFiles:core.files.length,supplementaryOutputFiles:supplement.files.length,changed,added,removed,unchanged:!changed.length&&!added.length&&!removed.length,coreManifestSha256:hash(path.join(out,'protected-manifest.json')),supplementManifestSha256:hash(path.join(out,'output-data-manifest.json'))});
 const descriptor=fs.openSync(path.join(out,'git-final.json'),'wx');
 try{fs.writeFileSync(descriptor,JSON.stringify({capturedAt:new Date().toISOString(),head:git('rev-parse','HEAD').trim(),branch:git('branch','--show-current').trim(),porcelain:git('status','--porcelain=v1','--untracked-files=all').split(/\r?\n/).filter(Boolean),diff:git('diff','--stat'),stagedDiff:git('diff','--cached','--stat'),createdFiles:fs.readdirSync(out).sort(),note:'Own new file reserved exclusively before status capture; no preexisting path is overwritten.'},null,2)+'\n');}finally{fs.closeSync(descriptor)}
 console.log(JSON.stringify({protected:all.length,changed,added,removed,finalGit:git('status','--porcelain=v1','--untracked-files=all')},null,2));
}else throw new Error('Specify capture-output or verify; no baseline overwrite allowed');
