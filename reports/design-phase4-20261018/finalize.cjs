const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const out=__dirname,base=JSON.parse(fs.readFileSync(out+'/baseline-hashes.json')),edits=JSON.parse(fs.readFileSync(out+'/edits.json'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const strip=s=>s.replace(/(href="[^"]*css\/[^"?]+)\?v=[^"\s]+/g,'$1');
const shells=Object.keys(base).filter(f=>f.endsWith('.html')&&!f.startsWith('data/'));
let data=0,js=0;
for(const [file,value]of Object.entries(base).filter(([f])=>!shells.includes(f))){
 assert.equal(hash(fs.readFileSync(file)),edits[file]?.after||value,file+' unexpected change');
 if(file.startsWith('data/'))data++;
 if(file.startsWith('js/'))js++;
}
const {applyStyleLinks}=require('../../scripts/site-styles');
for(const file of shells){const old=fs.readFileSync(file,'utf8');
 assert.equal(strip(old),strip(fs.readFileSync(out+'/baseline/'+file,'utf8')),file+' concurrent shell change');
 const next=applyStyleLinks(old);assert.equal(strip(next),strip(old));
 if(next!==old){fs.writeFileSync(file+'.phase4.tmp',next);fs.renameSync(file+'.phase4.tmp',file)}
 assert.equal(applyStyleLinks(next),next);
}
const after=JSON.parse(fs.readFileSync(out+'/after.json')),players=JSON.parse(fs.readFileSync(out+'/giocatori-final.json'));
after.results=after.results.filter(r=>r.route!=='statistiche-giocatori.html').concat(players.results);
assert.deepEqual(players.errors,[]);fs.writeFileSync(out+'/after.json',JSON.stringify(after,null,2));
for(const width of [1440,390])for(const kind of ['','viewport-'])fs.copyFileSync(out+'/giocatori-final-'+kind+'3-'+width+'.png',out+'/after-'+kind+'3-'+width+'.png');
fs.writeFileSync(out+'/integrity.json',JSON.stringify({dataFilesUnchanged:data,jsFilesUnchanged:js,modifiedCss:Object.keys(edits),shells:shells.length,cssHashIdempotence:true,protectedHeaderFilesUnchanged:true},null,2));
console.log('Integrity PASS:',data,'data files,',js,'JS files;',shells.length,'CSS-only shell versions; header files unchanged.');
