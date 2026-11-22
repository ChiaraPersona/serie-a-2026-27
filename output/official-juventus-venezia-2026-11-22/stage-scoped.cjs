const fs=require('../../scripts/output-snapshot-fs.cjs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const id='juventus-venezia-2026-27-md-12',dir='output/official-juventus-venezia-2026-11-22/staged';fs.mkdirSync(dir,{recursive:true});
const git=args=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:128e6}).trim();
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function stage(file,edit){const head=JSON.parse(git(['show','HEAD:'+file])),current=read(file);edit(head,current);const temp=dir+'/'+file.replaceAll('/','_');fs.writeFileSync(temp,JSON.stringify(head,null,2)+'\n');const hash=git(['hash-object','-w',temp]);git(['update-index','--add','--cacheinfo','100644',hash,file]);console.log(file);}
const replace=(a,b,key)=>{const item=b.find(x=>x[key]===id);assert(item);const i=a.findIndex(x=>x[key]===id);if(i<0)a.push(item);else a[i]=item;};
stage('data/sources/official-lineups-2026-27.json',(a,b)=>replace(a.fixtures,b.fixtures,'matchId'));
stage('data/normalized/predictions.json',(a,b)=>replace(a.predictions,b.predictions,'matchId'));
stage('data/normalized/readings.json',(a,b)=>replace(a,b,'matchId'));
for(const file of ['data/normalized/reading-md12-market-catalog.json','data/normalized/schedina-md12.json'])stage(file,(a,b)=>replace(a.marketCatalog.matches,b.marketCatalog.matches,'matchId'));
stage('data/normalized/official-starter-registry.json',(a,b)=>{a[id]=b[id];});
stage('data/teams/index.json',(a,b)=>{a.officialLineups||={};for(const key of Object.keys(b.officialLineups).filter(k=>k.startsWith(id+':')))a.officialLineups[key]=b.officialLineups[key];});
stage('data/technical-archive/official-nonstarter-markets.json',(a,b)=>{for(const s of b.filter(s=>(s.matchId||s.fixtureId)===id))if(!a.some(x=>x.selectionId===s.selectionId))a.push(s);});
stage('data/normalized/predictions-md12.json',(a,b)=>replace(a.predictions,b.predictions,'matchId'));
git(['add','--','data/sources/readings/'+id+'.json','data/generated/readings/matches/'+id+'.json','data/generated/readings/catalogs/'+id+'.json','scripts/update-official-juventus-venezia-2026-11-22.cjs','scripts/check-official-juventus-venezia-2026-11-22.cjs','scripts/test-official-juventus-venezia-2026-11-22.cjs']);
