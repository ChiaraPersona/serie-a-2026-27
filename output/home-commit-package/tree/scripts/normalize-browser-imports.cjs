// Canonical module URLs prevent multiple executions/downloads of a shared module
// reached through imports that previously had different historical version tags.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const version='20261022-assets-v1';let files=0;
for(const name of fs.readdirSync(path.join(root,'js'),{recursive:true}).filter(f=>/\.(js|mjs)$/.test(f))){const file=path.join(root,'js',name),source=fs.readFileSync(file,'utf8');
 const next=source.replace(/((?:from\s*|import\s*\(\s*)['"])([^'"?]+\.mjs)(?:\?[^'"]*)?(['"])/g,(all,start,target,end)=>target.startsWith('.')?`${start}${target}?v=${version}${end}`:all).replace(/import\(`([^`?]+\.mjs)(?:\?[^`]*)?`\)/g,(all,target)=>target.startsWith('.')||target.startsWith('${base}')?'import(`'+target+'?v='+version+'`)':all);
 if(next!==source){fs.writeFileSync(file,next);files++;}
}console.log(`Canonical shared module imports: ${files} files; import URLs only.`);
