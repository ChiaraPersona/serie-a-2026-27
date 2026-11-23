'use strict';
// Remove only historical mirror entries with an identical current counterpart.
// Operational paths, unique historical versions and archive metadata stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),audit=path.join(root,'output/obsolete-copy-audit');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const groups=JSON.parse(fs.readFileSync(path.join(audit,'duplicate-content-inventory.json')));
function safe(rel){const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep)||fs.lstatSync(f).isSymbolicLink()||fs.realpathSync(f).toLowerCase()!==f.toLowerCase())throw Error('Unsafe path '+rel);return f;}
const candidates=[];
for(const group of groups){for(const row of group.files){
 let keeper;
 if(row.file.startsWith('seria-a-2026-27-raw-archive-2026-08-24/data/raw/'))keeper=row.file.slice('seria-a-2026-27-raw-archive-2026-08-24/'.length);
 // Browser baselines must remain frozen even when currently identical.
 if(!keeper||!group.files.some(r=>r.file===keeper))continue;
 const from=safe(row.file),to=safe(keeper),s=fs.statSync(from,{bigint:true}),t=fs.statSync(to,{bigint:true});
 if(hash(from)!==group.sha256||hash(to)!==group.sha256)throw Error('Changed candidate '+row.file);
 candidates.push({file:row.file,keeper,sha256:group.sha256,bytes:row.bytes,alreadyShared:s.dev===t.dev&&s.ino===t.ino});
}}
const report={createdAt:new Date().toISOString(),applied:process.argv.includes('--write'),files:candidates.length,removedLogicalBytes:candidates.reduce((s,r)=>s+r.bytes,0),unsharedLogicalBytes:candidates.filter(r=>!r.alreadyShared).reduce((s,r)=>s+r.bytes,0),entries:candidates};
fs.writeFileSync(path.join(audit,'duplicate-archive-cleanup-plan.json'),JSON.stringify({...report,applied:false},null,2));
if(report.applied){for(const r of candidates){const from=safe(r.file),to=safe(r.keeper);if(hash(from)!==r.sha256||hash(to)!==r.sha256)throw Error('Changed immediately before deletion');try{fs.unlinkSync(from);}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e;const s=fs.statSync(from),mode=s.mode;fs.chmodSync(from,0o666);try{fs.unlinkSync(from);}finally{if(r.alreadyShared)fs.chmodSync(to,mode);}}}
 for(const r of candidates)if(fs.existsSync(path.join(root,r.file))||hash(safe(r.keeper))!==r.sha256)throw Error('Verification failed '+r.file);
 report.survivorHashesVerified=true;fs.writeFileSync(path.join(audit,'duplicate-archive-cleanup-result.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify({...report,entries:undefined},null,2));
