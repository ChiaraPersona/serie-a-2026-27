// One-time renderer migration. Data URLs in original JSON remain unchanged.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const files=['js/team-squads.js',...['js/pages','js/components'].flatMap(dir=>fs.readdirSync(path.join(root,dir),{recursive:true}).filter(f=>/\.(js|mjs)$/.test(f)).map(f=>path.posix.join(dir,f.replaceAll('\\','/'))))];
for(const file of files){let source=fs.readFileSync(path.join(root,file),'utf8'),count=0;
 source=source.replace(/src="((?:\$\{[^{}]*\})+)"/g,(all,value)=>{if(value.includes('imageSource('))return all;count++;return 'src="${imageSource(`'+value+'`)}"'});
 if(!count)continue;
 const module=path.posix.relative(path.posix.dirname(file),'js/core/image-source.mjs');
 if(file==='js/team-squads.js')source=source.replace('  let numbering,officialNumbers,probableNumbers;',`  const {imageSource}=await import(\x60${'${base}'}js/core/image-source.mjs\x60);\n  let numbering,officialNumbers,probableNumbers;`);
 else source=`import {imageSource} from '${module.startsWith('.')?module:'./'+module}';\n`+source;
 fs.writeFileSync(path.join(root,file),source);console.log(file,count);
}
