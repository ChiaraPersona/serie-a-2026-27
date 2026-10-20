'use strict';
const fs=require('fs'),path=require('path');
module.exports=function rawPath(file){
 if(fs.existsSync(file))return file;
 const relative=path.relative(path.resolve(__dirname,'../..'),file);
 const archive=path.resolve(__dirname,'../../seria-a-2026-27-raw-archive-2026-08-24',relative);
 if(fs.existsSync(archive))return archive;
 throw new Error('Snapshot originale assente: '+relative+'; cercato anche in archivio');
};
