// Atomic replacement permits rewriting generated files across Windows sandbox sessions.
const fs=require('fs'),original=fs.writeFileSync;
fs.writeFileSync=function(p,data,options){if(typeof p==='string'&&fs.existsSync(p)){const temp=p+'.atomic-'+process.pid;original.call(fs,temp,data,options);fs.renameSync(temp,p);return;}return original.call(fs,p,data,options)};
