'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const entries=JSON.parse(fs.readFileSync(path.join(__dirname,'index.json'),'utf8')).entries;
const requested=process.argv[2];
if(!requested){console.log('Pass an original output/ path to restore. Available files:');for(const e of entries)console.log(e.original);}
else {
 const entry=entries.find(e=>e.original===requested);
 if(!entry)throw Error('Path is not in the evidence archive');
 const target=path.resolve(root,entry.original),output=path.join(root,'output');
 if(!target.startsWith(output+path.sep))throw Error('Invalid output path');
 let ancestor=path.dirname(target);
 while(!fs.existsSync(ancestor))ancestor=path.dirname(ancestor);
 const realOutput=fs.realpathSync(output),realAncestor=fs.realpathSync(ancestor);
 if(realAncestor!==realOutput&&!realAncestor.startsWith(realOutput+path.sep))throw Error('Invalid output ancestor');
 const archive=path.resolve(__dirname,entry.archive);
 if(!archive.startsWith(__dirname+path.sep))throw Error('Invalid archive path');
 const bytes=zlib.gunzipSync(fs.readFileSync(archive));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Archive checksum mismatch');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,bytes,{flag:'wx'});
 console.log('Restored '+entry.original+'; compressed archive retained.');
}
