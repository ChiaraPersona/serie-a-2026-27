'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function size(directory){return fs.existsSync(directory)?fs.readdirSync(directory,{withFileTypes:true}).reduce((sum,e)=>e.isSymbolicLink()?sum:sum+(e.isDirectory()?size(path.join(directory,e.name)):fs.statSync(path.join(directory,e.name)).size),0):0;}
const file=path.join(root,'data/technical-archive/output-snapshots/index.json');
const entries=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).entries:[];
const snapshotDirectory=path.dirname(file),outputBytes=size(path.join(root,'output')),snapshotStoreBytes=size(snapshotDirectory);
console.log(JSON.stringify({outputBytes,snapshotStoreBytes,combinedBytes:outputBytes+snapshotStoreBytes,snapshotOriginalBytes:entries.reduce((s,r)=>s+r.bytes,0),snapshotManifestBytes:entries.reduce((s,r)=>s+(fs.existsSync(path.join(root,r.file))?fs.statSync(path.join(root,r.file)).size:0),0),snapshots:entries.length,publicPackageIsSeparate:true},null,2));
