// Remove only declarations superseded by the same selector/property in the
// same block scope. Keep variables, fallbacks and shorthand relationships.
const fs=require('node:fs'),path=require('node:path');
const {blocks}=require('./page-styles.cjs');
function declarations(body){
 const parts=[];let start=0,depth=0,quote='',comment=false;
 for(let i=0;i<=body.length;i++){
  const c=body[i],n=body[i+1];
  if(comment){if(c==='*'&&n==='/'){comment=false;i++;}continue;}
  if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
  if(c==='/'&&n==='*'){comment=true;i++;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;
  if(i===body.length||c===';'&&depth===0){const raw=body.slice(start,i),m=raw.match(/^\s*([a-z-]+)\s*:\s*([^]*?)\s*$/i);parts.push({raw,m});start=i+1;}
 }
 return parts;
}
function clean(css,stats){
 const list=blocks(css),seen=new Map();
 for(let i=list.length-1;i>=0;i--){const b=list[i];if(b.statement)continue;
  const head=b.head.replace(/\/\*[^]*?\*\//g,'').trim();
  if(/^@(media|supports|container)\b/.test(head)){b.body=clean(b.body,stats);continue;}
  if(head.startsWith('@')||!head)continue;
  const props=seen.get(head)||new Map();seen.set(head,props);
  const parts=declarations(b.body);
  for(let j=parts.length-1;j>=0;j--){const d=parts[j];if(!d.m||d.m[1].startsWith('--'))continue;
   const prop=d.m[1].toLowerCase(),value=d.m[2],important=/!important\s*$/i.test(value),plain=value.replace(/\s*!important\s*$/i,'').trim();
   const later=props.get(prop);
   // Identical values are safe even for legacy fallbacks. Different values
   // qualify only for long-established literal colors/numbers, never var().
   const literal=v=>/^(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|-?(?:\d*\.)?\d+(?:px|rem|em|%|s)?|transparent)$/i.test(v);
   if(later&&(!important||later.important)&&(plain===later.plain||literal(plain)&&literal(later.plain))){d.remove=true;stats.declarations++;}
   else props.set(prop,{plain,important});
  }
  if(parts.some(p=>p.remove)){
   b.body=parts.filter(p=>!p.remove).map(p=>p.raw).join(';');
   if(!b.body.replace(/\/\*[^]*?\*\//g,'').trim()){b.empty=true;stats.rules++;}
  }
 }
 const result=list.map(b=>b.statement??(b.empty?(b.head.match(/\/\*[^]*?\*\//g)||[]).join('\n'):b.head+'{'+b.body+'}')).join('');
 return result.replace(/\s*$/,'')+css.match(/\s*$/)[0];
}
if(require.main===module){
 const root=path.resolve(__dirname,'..'),report=[];
 for(const file of fs.readdirSync(path.join(root,'css')).filter(f=>f.endsWith('.css')&&f!=='styles.css')){
  const target=path.join(root,'css',file),before=fs.readFileSync(target,'utf8'),stats={file,declarations:0,rules:0};
  const after=clean(before,stats);stats.savedBytes=Buffer.byteLength(before)-Buffer.byteLength(after);
  if(stats.declarations){report.push(stats);if(process.argv.includes('--write'))fs.writeFileSync(target,after);}
 }
 console.log(JSON.stringify(report,null,2));
}
module.exports={clean};
